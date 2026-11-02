import { useEffect, useRef, useState } from 'react';
import { useNotifications } from './notification-store';
import { community } from './community-api';
import { AppIcon } from './AppIcon';
import type { AppNotification } from '../shared/notifications';
import { useOpenedNotifications } from './use-opened-notifications';

export function NotificationBell() {
  const { summary, error, online, refresh } = useNotifications();
  const [open, setOpen] = useState(false), [rows, setRows] = useState<AppNotification[] | null>(null), [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const autoRead = useOpenedNotifications(container, rows || [], ids => setRows(previous => previous?.map(row => ids.includes(row.id) ? { ...row, read: true } : row) || null), open);
  const label = `Notifications${summary?.unread ? ` (${summary.unread})` : ''}`;
  useEffect(() => {
    if (!open) return;
    let active = true; setRows(null); setFailed(false);
    void community<{ rows: AppNotification[] }>('notifications').then(value => { if (active) setRows(value.rows.slice(0, 5)); }).catch(() => { if (active) setFailed(true); });
    const close = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => { active = false; document.removeEventListener('pointerdown', close); };
  }, [open]);
  return <div className="notification-bell" ref={container} onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); } }}>
    <a className="auth-button notification-entry" href="#procedures/notifications" aria-label={label} title={error ? 'Notifications could not refresh' : !online ? 'Notifications are offline' : label}><AppIcon name="bell"/><span className="notification-entry-label">Notifications</span>{summary?.unread ? <span className="notification-count" aria-hidden="true">{summary.unread > 99 ? '99+' : summary.unread}</span> : null}{(error || !online) && <span aria-hidden="true">!</span>}</a>
    <button className="auth-button notification-preview-toggle" ref={trigger} aria-label="Show recent notifications" aria-expanded={open} onClick={() => { if (!open) autoRead.reset(); setOpen(value => !value); }}><span aria-hidden="true">▾</span></button>
    {open && <section className="notification-preview" aria-label="Recent notifications"><h2>Recent notifications</h2>{!online && <p>Offline. Reconnect to check for updates.</p>}{error && <p role="alert">Couldn't refresh notifications. <button onClick={() => void refresh()}>Retry</button></p>}{autoRead.error && <p role="alert">Read status could not be saved. <button onClick={autoRead.retry}>Retry read status</button></p>}{failed ? <p role="alert">Couldn't load recent updates. Open your inbox to retry.</p> : rows === null ? <p>Loading updates…</p> : rows.length ? <ul>{rows.map(row => <li key={row.id} data-notification-id={row.id}><a href={`#procedures/notifications?item=${encodeURIComponent(row.id)}`} onClick={() => setOpen(false)}>{!row.read && <strong>Unread · </strong>}{row.title}</a><p>{row.companyName}</p></li>)}</ul> : <p>No notifications yet.</p>}<a href="#procedures/notifications" onClick={() => setOpen(false)}>View all notifications</a></section>}
  </div>;
}
