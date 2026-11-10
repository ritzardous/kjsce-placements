import { FetchLoader } from './FetchLoader';
import { ActionMenu } from './ActionMenu';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { community, invalidateCommunityReads, safeStored, storeSession } from './community-api';
import { useAuth } from './auth';
import { procedureError } from './procedures-api';
import { useBackgroundSync } from './background-sync';
import { useNotifications, type InboxPage } from './notification-store';
import { NotificationSettings } from './NotificationSettings';
import { notificationAction } from '../shared/notifications';
import { useOpenedNotifications } from './use-opened-notifications';

const views = [['all', 'All notifications'], ['unread', 'Unread notifications'], ['attention', 'Needs action'], ['contributions', 'Contributions'], ['reports', 'Reports'], ['discussions', 'Past discussions'], ['following', 'Following'], ['statistics', 'Statistics'], ['archived', 'Archived']] as const;
function timeGroup(at: number) { const start = new Date(); start.setHours(0, 0, 0, 0); const yesterday = new Date(start); yesterday.setDate(yesterday.getDate() - 1); return at >= +start ? 'Today' : at >= +yesterday ? 'Yesterday' : 'Earlier'; }

function Outcome({ id }: { id: string }) {
  const [outcome, setOutcome] = useState<{ message: string; status?: string; resolution?: string } | null>(null), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void community<typeof outcome>('notificationOutcome', { id }).then(value => { if (active) { setOutcome(value); setError(''); } }).catch(cause => { if (active) setError(procedureError(cause)); }); return () => { active = false; }; }, [id, attempt]);
  return <div className="notification-outcome">{error ? <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry outcome</button></p> : outcome ? <><p>{outcome.message}</p>{outcome.status && <p>Report status: {outcome.status.replaceAll('_', ' ')}{outcome.resolution ? ` · ${outcome.resolution.replaceAll('_', ' ')}` : ''}</p>}</> : <FetchLoader compact label="Loading your private outcome…"/>}</div>;
}

export function NotificationInbox() {
  if (new URLSearchParams(location.hash.split('?')[1]).get('preferences') === '1') return <div className="preferences-workspace"><a className="settings-back" href="#procedures/notifications">← Back to notifications</a><NotificationSettings standalone/></div>;
  return <InboxContent/>;
}
function InboxContent() {
  const { user } = useAuth(), store = useNotifications();
  const { inboxCache, changed, revision } = store;
  const preference = `notification-view:${user?.uid}`;
  const selectedItem = new URLSearchParams(location.hash.split('?')[1]).get('item');
  const [view, setView] = useState(() => { if (selectedItem) return 'all'; const selected = safeStored(preference, 'all'); return views.some(([key]) => key === selected) ? selected : 'all'; });
  const [unreadOnly,setUnreadOnly]=useState(()=>!selectedItem&&(view==='unread'||safeStored(`notification-unread:${user?.uid}`,false)));
  const readFilter=useRef(unreadOnly);readFilter.current=unreadOnly;
  const [page, setPage] = useState<InboxPage>(() => inboxCache.get(view) || { rows: [], cursor: null, more: false, checkedAt: 0 });
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [staged, setStaged] = useState<InboxPage | null>(null), [undo, setUndo] = useState<{ id: string; read: boolean } | null>(null), [outcome, setOutcome] = useState<string | null>(null), [batch, setBatch] = useState<{ cutoff: number; cursor: InboxPage['cursor']; count: number } | null>(null);
  const latest = useRef(page), mounted = useRef(true), generation = useRef(0), running = useRef(false), currentView = useRef(view), focusedItem = useRef('');
  const mutating = useRef(false);
  const seenRevision = useRef(revision);
  const openedInView = useRef(new Set<string>());
  const inboxRoot = useRef<HTMLElement>(null);
  latest.current = page; currentView.current = view;
  const commit = useCallback((next: InboxPage) => { inboxCache.set(currentView.current, next); latest.current = next; setPage(next); }, [inboxCache]);
  const confirmOpened = (ids: string[]) => {
    ids.forEach(id => openedInView.current.add(id));
    generation.current++; running.current = false;
    commit({ ...latest.current, rows: latest.current.rows.map(row => ids.includes(row.id) ? { ...row, read: true } : row) });
    setLoading(false);
  };
  const autoRead = useOpenedNotifications(inboxRoot, page.rows, confirmOpened, !busy && !loading);
  const load = useCallback(async (append = false, quiet = false) => {
    if (running.current || mutating.current || !navigator.onLine || (quiet && document.visibilityState !== 'visible')) return false;
    if (!append && !quiet) openedInView.current.clear();
    running.current = true; const token = generation.current; const selected = currentView.current;
    if (!quiet) setLoading(true);
    try {
      const next = await community<InboxPage>('notifications', { view: selected, unread:readFilter.current, cursor: append ? latest.current.cursor : null });
      if (!mounted.current || token !== generation.current) return false;
      setError('');
      if (quiet && latest.current.rows.length) {
        const known = new Set(latest.current.rows.map(row => row.id));
        if (next.rows.some(row => !known.has(row.id))) setStaged(next);
        else {
          const updates = new Map(next.rows.map(row => [row.id, row]));
          let reconciled = next;
          if (next.more) {
            const boundary = next.rows.at(-1)?.createdAt ?? Infinity;
            reconciled = { ...latest.current, checkedAt: next.checkedAt, rows: latest.current.rows.filter(row => updates.has(row.id) || row.createdAt < boundary).map(row => updates.get(row.id) || row) };
          }
          if ((selected === 'unread'||readFilter.current) && openedInView.current.size) {
            const refreshed = new Map(reconciled.rows.map(row => [row.id, row]));
            reconciled = { ...reconciled, rows: latest.current.rows.filter(row => openedInView.current.has(row.id) || refreshed.has(row.id)).map(row => refreshed.get(row.id) || { ...row, read: true }) };
          }
          commit(reconciled);
        }
      } else { commit(append ? { ...next, rows: [...new Map([...latest.current.rows, ...next.rows].map(row => [row.id, row])).values()] } : next); setStaged(null); }
      return true;
    } catch (cause) { if (mounted.current && token === generation.current) setError(procedureError(cause)); return false; }
    finally { if (token === generation.current) { running.current = false; if (mounted.current) setLoading(false); } }
  }, [commit]);
  useBackgroundSync(() => load(false, true), 65000);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);
  useEffect(() => { void store.refresh(); }, [store.refresh]);
  useEffect(()=>{storeSession(`notification-unread:${user?.uid}`,unreadOnly);generation.current++;running.current=false;inboxCache.clear();commit({rows:[],cursor:null,more:false,checkedAt:0});void load();},[unreadOnly,commit,load,inboxCache,user?.uid]);
  useEffect(() => { if (selectedItem) {setView('all');setUnreadOnly(false);} }, [selectedItem]);
  useEffect(() => {
    generation.current++; running.current = false; setError(''); setStaged(null); setMessage('');
    openedInView.current.clear();
    const cached = inboxCache.get(view); commit(cached || { rows: [], cursor: null, more: false, checkedAt: 0 });
    storeSession(preference, view);
    void load(false, Boolean(cached));
    if (cached?.scroll) requestAnimationFrame(() => window.scrollTo(0, cached.scroll!));
    const remember = () => { const saved = inboxCache.get(view); if (saved) saved.scroll = window.scrollY; };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [view, commit, load, inboxCache, preference]);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    generation.current++; running.current = false;
    invalidateCommunityReads('notifications'); inboxCache.clear();
    void load(false, true);
  }, [revision, load, inboxCache]);
  useEffect(() => {
    if (selectedItem && focusedItem.current !== selectedItem && page.rows.some(row => row.id === selectedItem)) { focusedItem.current = selectedItem; requestAnimationFrame(() => document.getElementById(`notification-${selectedItem}`)?.focus()); }
  }, [page.rows, selectedItem]);
  async function update(ids: string[], values: { read?: boolean; archived?: boolean }, notice: string) {
    if (!navigator.onLine) { setError('You are offline. Reconnect before changing notifications.'); return; }
    const originalRead = latest.current.rows.find(row => row.id === ids[0])?.read ?? true;
    if (mutating.current) return;
    autoRead.ignore(ids);
    if (values.read === false || values.archived) ids.forEach(id => openedInView.current.delete(id));
    mutating.current = true; generation.current++; running.current = false;
    setBusy(true); setError('');
    try {
      await store.settleOpened(ids);
      await community('updateNotifications', { ids, ...values });
      if (!mounted.current) return;
      invalidateCommunityReads('notifications');
      // Invalidate cached filters so a back navigation cannot resurrect stale unread cards.
      inboxCache.clear();
      const nextRows = latest.current.rows.map(row => ids.includes(row.id) ? { ...row, ...values, ...(values.archived ? { read: true } : {}) } : row).filter(row => view === 'archived' ? row.archived : !row.archived && ((view !== 'unread'&&!unreadOnly) || !row.read));
      commit({ ...latest.current, rows: nextRows }); setMessage(notice); if (values.archived === true) setUndo({ id: ids[0], read: originalRead }); else if (values.archived === false) setUndo(null); mutating.current = false; changed();
    } catch (cause) { if (mounted.current) setError(procedureError(cause)); } finally { mutating.current = false; if (mounted.current) { setBusy(false); setLoading(false); } }
  }
  async function markAll() {
    if (!navigator.onLine) { setError('You are offline. Reconnect before changing notifications.'); return; }
    if (mutating.current) return;
    mutating.current = true; generation.current++; running.current = false;
    const progress = batch || { cutoff: Math.min(store.summary?.checkedAt || Date.now(), Date.now()), cursor: null, count: 0 };
    setBusy(true); setError('');
    try {
      // Each click performs one bounded batch; failed batches can be safely retried.
      const result = await community<{ more: boolean; count: number; cursor: InboxPage['cursor'] }>('readAllNotifications', { cutoff: progress.cutoff, cursor: progress.cursor });
      if (!mounted.current) return;
      const count = progress.count + result.count;
      setBatch(result.more ? { ...progress, cursor: result.cursor, count } : null);
      setMessage(`${count} notification${count === 1 ? '' : 's'} marked as read.${result.more ? ' Continue to process the next 50.' : ' Newer arrivals are kept unread.'}`);
      inboxCache.clear(); invalidateCommunityReads('notifications'); mutating.current = false; await load(); changed();
    } catch (cause) { if (mounted.current) { setBatch(progress); setError(procedureError(cause)); } } finally { mutating.current = false; if (mounted.current) { setBusy(false); setLoading(false); } }
  }
  const unread = page.rows.filter(row => !row.read).slice(0, 50);
  let previousGroup = '';
  return <section ref={inboxRoot} className="notification-inbox" aria-label="Notification inbox" onClickCapture={event => {
    const target = event.target as HTMLElement;
    if (target.closest('a')) { const cached = inboxCache.get(view); if (cached) cached.scroll = window.scrollY; }
    if (target.closest('a,[data-open-notification]')) {
      const id = target.closest<HTMLElement>('[data-notification-id]')?.dataset.notificationId;
      if (id && latest.current.rows.some(row => row.id === id && !row.read)) {
        autoRead.ignore([id]);
        void store.markOpened([id]).then(() => { if (mounted.current) confirmOpened([id]); }).catch(cause => { if (mounted.current) setError(procedureError(cause)); });
      }
    }
  }}>
    <div className="procedure-heading notification-inbox-header"><p>Reviews, feedback and updates you follow.</p><div><a href="#procedures/notifications?preferences=1" aria-label="Notification preferences">Preferences</a><button aria-label="Refresh notifications" disabled={loading} onClick={() => { void load(); void store.refresh(); }}>Refresh</button></div></div>
    <p className="notification-freshness">{!store.online ? 'Offline. Showing your last loaded updates.' : loading ? 'Updating…' : error ? "Couldn't refresh. Showing previously loaded updates." : page.checkedAt ? `Last checked ${new Date(page.checkedAt).toLocaleTimeString()}` : 'Checking for updates…'}</p>
    {store.summary?.discoveryError && <p role="alert">Followed updates couldn't refresh. Your direct notifications are available. Try Refresh notifications again.</p>}
    {store.error && <p role="alert">Unread count couldn't refresh. <button onClick={() => void store.refresh()}>Retry unread count</button></p>}
    {autoRead.error && <p role="alert">Couldn't save read status automatically. {autoRead.error} <button onClick={autoRead.retry}>Retry read status</button></p>}
    <div className="workspace-toolbar notification-toolbar"><div className="workspace-view-switch" aria-label="Notification views">{views.filter(([key])=>['all','unread'].includes(key)).map(([key,label])=><button key={key} disabled={busy} aria-pressed={key==='unread'?(unreadOnly||view==='unread'):(!unreadOnly&&view!=='unread')} onClick={()=>{setUnreadOnly(key==='unread');if(view==='unread')setView('all');}}>{label}</button>)}</div><label>Activity type<select disabled={busy} value={['all','unread'].includes(view)?'':view} onChange={event=>setView(event.target.value||'all')}><option value="">All activity</option>{views.filter(([key])=>!['all','unread'].includes(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><ActionMenu label="Inbox actions"><div className="procedure-actions"><button disabled={busy || !unread.length} onClick={() => void update(unread.map(row => row.id), { read: true }, `${unread.length} notification${unread.length === 1 ? '' : 's'} marked as read.`)}>{page.rows.filter(row => !row.read).length > 50 ? 'Mark first 50 displayed unread notifications as read' : 'Mark displayed notifications as read'}</button><button disabled={busy || (!batch && !store.summary?.unread)} onClick={() => void markAll()}>{batch ? 'Continue marking all read (next 50)' : 'Mark all read (up to 50 at a time)'}</button>{batch && <button disabled={busy} onClick={() => { setBatch(null); setMessage('Batch stopped. Completed changes are saved.'); }}>Stop batch</button>}</div>
</ActionMenu></div>
    {message && <p className="procedure-success" role="status">{message}</p>}{undo && <p>Update archived. <button disabled={busy} onClick={() => { void update([undo.id], { archived: false, read: undo.read }, 'Update restored.'); }}>Undo archive</button></p>}
    {error && <p role="alert">{error} <button disabled={loading} onClick={() => void load()}>Retry notifications</button></p>}
    <div aria-live="polite">{staged && <button className="notification-new-updates" onClick={() => { commit(staged); setStaged(null); }}>New updates available. Show latest</button>}</div>
    {view === 'attention' && <p>Unresolved contributor work, whether read or unread. Reading an update does not complete its task.</p>}
    {view === 'discussions' && <p>Questions and replies are no longer available. Past decisions remain in your private history.</p>}
    {!loading && !error && !page.rows.length && <p>{page.more ? 'No matching updates in this window. Load more to check older activity.' : view === 'unread' ? 'You are caught up. View all notifications to revisit earlier updates.' : 'No updates in this view yet.'}</p>}
    <div className="procedure-list" aria-busy={loading}>{page.rows.map(row => {
      const group = timeGroup(row.createdAt), heading = group !== previousGroup; previousGroup = group;
      const action = notificationAction(row);
      return <Fragment key={row.id}>{heading && <h2 className="notification-time-group">{group}</h2>}<article id={`notification-${row.id}`} data-notification-id={row.id} tabIndex={-1} className={`procedure-card notification-card ${row.read ? 'is-read' : 'is-unread'}`}>
        <h3>{row.title} <span className={`procedure-badge ${row.read ? 'notification-read-label' : 'status-pending'}`}>{row.read ? 'Read' : 'New'}</span> {row.needsAction && <span className="procedure-badge">Action needed</span>}</h3>
        {(row.companyName || row.experienceTitle) && <p className="notification-context">{[row.companyName, row.experienceTitle, row.revision ? `Revision ${row.revision}` : ''].filter(Boolean).join(' · ')}</p>}
        <p className="notification-message">{row.message}</p>{row.currentStatus && <p>Current submission status: {row.currentStatus.replaceAll('_', ' ')}. {row.currentStatus === 'unavailable' ? 'This experience may have been removed.' : ''}</p>}
        <time dateTime={new Date(row.createdAt).toISOString()} title={new Date(row.createdAt).toLocaleString()}>{new Date(row.createdAt).toLocaleString()}</time>
        <div className="procedure-actions">{action && row.currentStatus !== 'unavailable' && <a href={action.href}>{action.label} ↗</a>}{(row.category === 'reports' || row.reportId) && <button data-open-notification onClick={() => setOutcome(outcome === row.id ? null : row.id)} aria-expanded={outcome === row.id}>View private report outcome</button>}
          <ActionMenu label={`More actions for ${row.title}`}>{!row.archived && <button disabled={busy} onClick={() => void update([row.id], { read: !row.read }, row.read ? 'Notification marked unread.' : 'Notification marked as read.')}>{row.read ? 'Mark unread' : 'Mark as read'}</button>}
          <button disabled={busy} onClick={() => { void update([row.id], { archived: !row.archived }, row.archived ? 'Update restored.' : 'Update archived.'); }}>{row.archived ? 'Restore' : 'Archive'}</button></ActionMenu>
        </div>{outcome === row.id && <Outcome id={row.id}/>}</article></Fragment>;
    })}</div>
    {loading && <FetchLoader compact={page.rows.length>0} label="Loading notifications…"/>}{page.more && <button disabled={loading} onClick={() => void load(true)}>Load more notifications</button>}
  </section>;
}
