import { popupEvent } from './overlay';
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from './notification-store';
import { community } from './community-api';
import { AppIcon } from './AppIcon';
import type { AppNotification } from '../shared/notifications';
import { useOpenedNotifications } from './use-opened-notifications';

export function NotificationBell() {
  const { summary, error, online, refresh } = useNotifications();
  const [open, setOpen] = useState(false), [rows, setRows] = useState<AppNotification[] | null>(null), [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null), trigger = useRef<HTMLAnchorElement>(null);
  const autoRead = useOpenedNotifications(container, rows || [], ids => setRows(previous => previous?.map(row => ids.includes(row.id) ? { ...row, read: true } : row) || null), open);
  useEffect(()=>{const other=()=>setOpen(false);window.addEventListener(popupEvent,other);window.addEventListener('hashchange',other);return()=>{window.removeEventListener(popupEvent,other);window.removeEventListener('hashchange',other);};},[]);
  useEffect(()=>{
    if(!open)return;
    const preview=container.current?.querySelector<HTMLElement>('.notification-preview');if(!preview)return;
    const place=()=>{const anchor=trigger.current?.getBoundingClientRect();if(!anchor)return;const view=visualViewport,width=view?.width||innerWidth,height=view?.height||innerHeight,left=view?.offsetLeft||0,top=view?.offsetTop||0;preview.style.position='fixed';preview.style.maxHeight=(height-24)+'px';const box=preview.getBoundingClientRect();preview.style.left=Math.max(left+12,Math.min(anchor.right-box.width,left+width-box.width-12))+'px';preview.style.right='auto';preview.style.top=Math.max(top+12,Math.min(anchor.bottom+8,top+height-box.height-12))+'px';};
    place();const observer=new ResizeObserver(place);observer.observe(preview);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);visualViewport?.addEventListener('resize',place);
    return()=>{observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);visualViewport?.removeEventListener('resize',place);};
  },[open]);
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
    <a aria-current={location.hash.split('?')[0]==='#procedures/notifications'?'page':undefined} ref={trigger} aria-haspopup="true" aria-expanded={open} onClick={event=>{if(matchMedia('(max-width:700px)').matches)return;event.preventDefault();if(!open){window.dispatchEvent(new CustomEvent(popupEvent));autoRead.reset();}setOpen(value=>!value);}} className="auth-button notification-entry" href="#procedures/notifications" aria-label={label} title={error ? 'Notifications could not refresh' : !online ? 'Notifications are offline' : label}><AppIcon name="bell"/>{summary?.unread ? <span className="notification-count" aria-hidden="true">{summary.unread > 99 ? '99+' : summary.unread}</span> : null}{(error || !online) && <span aria-hidden="true">!</span>}</a>
    {open && <section className="notification-preview" aria-label="Recent notifications"><h2>Recent notifications</h2>{!online && <p>Offline. Reconnect to check for updates.</p>}{error && <p role="alert">Couldn't refresh notifications. <button onClick={() => void refresh()}>Retry</button></p>}{autoRead.error && <p role="alert">Read status could not be saved. <button onClick={autoRead.retry}>Retry read status</button></p>}{failed ? <p role="alert">Couldn't load recent updates. Open your inbox to retry.</p> : rows === null ? <p>Loading updates…</p> : rows.length ? <ul>{rows.map(row => <li key={row.id} data-notification-id={row.id}><a href={`#procedures/notifications?item=${encodeURIComponent(row.id)}`} onClick={() => setOpen(false)}>{!row.read && <strong>Unread · </strong>}{row.title}</a><p>{row.companyName}</p></li>)}</ul> : <p>No notifications yet.</p>}<a href="#procedures/notifications" onClick={() => setOpen(false)}>View all notifications</a></section>}
  </div>;
}
