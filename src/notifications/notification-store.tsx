import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { community, invalidateCommunityReads } from '../community/community-api';
import { procedureError } from '../procedures/procedures-api';
import { useBackgroundSync } from '../lib/background-sync';

type Summary = { unread: number; checkedAt: number; discoveryError?: boolean };
export type InboxPage = { rows: import('../../shared/notifications').AppNotification[]; cursor: { id: string; values: number[] } | null; more: boolean; checkedAt: number; scroll?: number };
type Store = { summary: Summary | null; error: string; loading: boolean; online: boolean; revision: number; refresh: () => Promise<boolean>; changed: (refreshInbox?: boolean) => void; markOpened: (ids: string[]) => Promise<void>; settleOpened: (ids: string[]) => Promise<unknown>; inboxCache: Map<string, InboxPage> };
const Context = createContext<Store | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, allowed } = useAuth();
  // Keyed boundary removes all private state synchronously when identities change.
  return <AccountNotifications key={allowed ? user?.uid : 'signed-out'} enabled={allowed} >{children}</AccountNotifications>;
}
function AccountNotifications({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [online, setOnline] = useState(navigator.onLine), [revision, setRevision] = useState(0);
  const mounted = useRef(true), pending = useRef<Promise<boolean> | null>(null), channel = useRef<BroadcastChannel | null>(null);
  const inboxCache = useRef(new Map<string, InboxPage>()).current;
  const openedReads = useRef(new Map<string, Promise<void>>()).current;
  const refresh = useCallback((): Promise<boolean> => {
    if (!enabled || !navigator.onLine || document.visibilityState !== 'visible') return Promise.resolve(false);
    if (pending.current) return pending.current;
    setLoading(true);
    const request = community<Summary>('notificationSummary').then(value => { if (mounted.current) { setSummary(value); setError(''); } return true; }).catch(cause => { if (mounted.current) setError(procedureError(cause)); return false; }).finally(() => { if (mounted.current) setLoading(false); pending.current = null; });
    pending.current = request; return request;
  }, [enabled]);
  const { user } = useAuth();
  const changed = useCallback((refreshInbox = true) => {
    if (refreshInbox) setRevision(value => value + 1);
    if (pending.current) void pending.current.finally(() => { if (mounted.current) void refresh(); });
    else void refresh();
    channel.current?.postMessage('changed');
    if (!channel.current) { try { localStorage.setItem(`notification-invalidation:${user?.uid}`, String(Date.now())); } catch { /* Polling still works when browser storage is unavailable. */ } }
  }, [refresh, user?.uid]);
  const markOpened = useCallback(async (ids: string[]) => {
    if (!enabled || !navigator.onLine) throw new Error('Reconnect to save the read status of opened notifications.');
    const unique = [...new Set(ids)].slice(0, 50), fresh = unique.filter(id => !openedReads.has(id));
    if (fresh.length) {
      const request = community('readNotifications', { ids: fresh }).then(() => {
        if (!mounted.current) return;
        invalidateCommunityReads('notifications');
        for (const [key, cached] of inboxCache) inboxCache.set(key, { ...cached, rows: cached.rows.map(row => fresh.includes(row.id) ? { ...row, read: true } : row) });
        // Keep opened cards in place, including in an unread view, until the next refresh.
        changed(false);
      }).finally(() => { fresh.forEach(id => openedReads.delete(id)); });
      fresh.forEach(id => openedReads.set(id, request));
    }
    await Promise.all(unique.map(id => openedReads.get(id)));
  }, [enabled, openedReads, inboxCache, changed]);
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
  return <Context.Provider value={{ summary, error, loading, online, revision, refresh, changed, markOpened, settleOpened, inboxCache }}>{children}</Context.Provider>;
}
export function useNotifications() { const value = useContext(Context); if (!value) throw new Error('Notification provider is missing.'); return value; }
