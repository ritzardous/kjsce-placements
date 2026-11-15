import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { community, invalidateCommunityReads } from '../community/community-api';
import { procedureError } from '../procedures/procedures-api';
import { useBackgroundSync } from '../lib/background-sync';

type Summary = { unread: number; checkedAt: number; discoveryError?: boolean };
export type InboxPage = { rows: import('../../shared/notifications').AppNotification[]; cursor: { id: string; values: number[] } | null; more: boolean; checkedAt: number; scroll?: number };
type Store = { summary: Summary | null; error: string; loading: boolean; online: boolean; revision: number; refresh: () => Promise<boolean>; changed: (refreshInbox?: boolean) => void; markOpened: (ids: string[]) => Promise<void>; markAllRead: () => Promise<void>; settleOpened: (ids: string[]) => Promise<unknown>; inboxCache: Map<string, InboxPage> };
const Context = createContext<Store | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, allowed } = useAuth();
  // Keyed boundary removes all private state synchronously when identities change.
  return <AccountNotifications key={allowed ? user?.uid : 'signed-out'} enabled={allowed} >{children}</AccountNotifications>;
}
function AccountNotifications({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [online, setOnline] = useState(navigator.onLine), [revision, setRevision] = useState(0);
  const mounted = useRef(true), pending = useRef<Promise<boolean> | null>(null), channel = useRef<BroadcastChannel | null>(null);
  const inboxCache = useRef(new Map<string, InboxPage>()).current;
  const openedReads = useRef(new Map<string, Promise<void>>()).current;
  const refresh = useCallback((): Promise<boolean> => {
    if (!enabled || !navigator.onLine || document.visibilityState !== 'visible') return Promise.resolve(false);
    if (pending.current) return pending.current;
    setLoading(true);
    const request = community<Summary>('notificationSummary').then(value => {
      if (mounted.current) {
        let allReadCutoff = 0;
        try { allReadCutoff = Number(localStorage.getItem(`notifications-all-read:${user?.uid}`)) || 0; } catch {}
        const unread = (Date.now() - allReadCutoff < 300000 && allReadCutoff >= (value.checkedAt - 60000)) ? 0 : value.unread;
        setSummary({ ...value, unread });
        setError('');
      }
      return true;
    }).catch(cause => {
      if (mounted.current) {
        setError('');
        setSummary(previous => previous || { unread: 0, checkedAt: Date.now() });
      }
      return false;
    }).finally(() => { if (mounted.current) setLoading(false); pending.current = null; });
    pending.current = request; return request;
  }, [enabled, user?.uid]);
  const changed = useCallback((refreshInbox = true) => {
    if (refreshInbox) setRevision(value => value + 1);
    if (pending.current) void pending.current.finally(() => { if (mounted.current) void refresh(); });
    else void refresh();
    channel.current?.postMessage('changed');
    if (!channel.current) { try { localStorage.setItem(`notification-invalidation:${user?.uid}`, String(Date.now())); } catch { /* Polling still works when browser storage is unavailable. */ } }
  }, [refresh, user?.uid]);
  const markOpened = useCallback(async (ids: string[]) => {
    if (!enabled) return;
    const unique = [...new Set(ids)].slice(0, 50), fresh = unique.filter(id => !openedReads.has(id));
    // Immediately update summary and inboxCache optimistically so the unread badge and card status drop immediately
    setSummary(previous => {
      if (!previous) return null;
      return { ...previous, unread: Math.max(0, previous.unread - unique.length) };
    });
    for (const [key, cached] of inboxCache) {
      inboxCache.set(key, { ...cached, rows: cached.rows.map(row => unique.includes(row.id) ? { ...row, read: true } : row) });
    }
    if (fresh.length) {
      const request = community('readNotifications', { ids: fresh }).then(() => {
        if (!mounted.current) return;
        invalidateCommunityReads('notifications');
        changed(false);
      }).catch(cause => {
        console.warn('Background sync of read notifications failed; local read state preserved.', cause);
      }).finally(() => { fresh.forEach(id => openedReads.delete(id)); });
      fresh.forEach(id => openedReads.set(id, request));
    }
    await Promise.all(unique.map(id => openedReads.get(id)));
  }, [enabled, openedReads, inboxCache, changed]);
  const markAllRead = useCallback(async () => {
    if (!enabled) return;
    setSummary({ unread: 0, checkedAt: Date.now() });
    for (const [key, cached] of inboxCache) {
      inboxCache.set(key, { ...cached, rows: cached.rows.map(row => ({ ...row, read: true })) });
    }
    try { localStorage.setItem(`notifications-all-read:${user?.uid}`, String(Date.now())); } catch {}
    changed(true);
    try {
      if (navigator.onLine) {
        await community('readAllNotifications', { cutoff: Date.now(), cursor: null });
        invalidateCommunityReads('notifications');
      }
    } catch (cause) {
      console.warn('readAllNotifications sync failed; local read state preserved.', cause);
    }
  }, [enabled, inboxCache, changed, user?.uid]);
  const settleOpened = useCallback((ids: string[]) => Promise.allSettled(ids.map(id => openedReads.get(id))), [openedReads]);
  useBackgroundSync(refresh, 60000 + useRef(Math.floor(Math.random() * 5000)).current, enabled);
  useEffect(() => {
    mounted.current = true; void refresh();
    const connection = () => setOnline(navigator.onLine);
    const storage = (event: StorageEvent) => { if (enabled && event.key === `notification-invalidation:${user?.uid}`) { setRevision(value => value + 1); void refresh(); } };
    // Existing submission/editor events also invalidate the shared summary.
    const legacy = () => { setRevision(value => value + 1); channel.current?.postMessage('changed'); };
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('storage', storage);
    window.addEventListener('procedure-notifications-changed', legacy);
    if (enabled && typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel(`notifications:${user?.uid}`);
      channel.current.onmessage = () => { setRevision(value => value + 1); void refresh(); };
    }
    return () => { mounted.current = false; channel.current?.close(); channel.current = null; window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('storage', storage); window.removeEventListener('procedure-notifications-changed', legacy); };
  }, [enabled, refresh, user?.uid]);
  return <Context.Provider value={{ summary, error, loading, online, revision, refresh, changed, markOpened, markAllRead, settleOpened, inboxCache }}>{children}</Context.Provider>;
}
export function useNotifications() { const value = useContext(Context); if (!value) throw new Error('Notification provider is missing.'); return value; }
