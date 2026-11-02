import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNotifications } from './notification-store';
import { procedureError } from './procedures-api';

/** Only opened, actually visible cards count as read; scrolling past a card does not. */
export function useOpenedNotifications(root: RefObject<HTMLElement | null>, rows: { id: string; read: boolean }[], onRead: (ids: string[]) => void, enabled = true) {
  const { markOpened } = useNotifications();
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const seen = useRef(new Set<string>()), failed = useRef(new Set<string>()), latest = useRef({ unread: new Set<string>(), onRead });
  latest.current = { unread: new Set(rows.filter(row => !row.read).map(row => row.id)), onRead };
  const signature = rows.map(row => `${row.id}:${row.read}`).join('|');
  function retry() { failed.current.forEach(id => seen.current.delete(id)); failed.current.clear(); setError(''); setAttempt(value => value + 1); }
  useEffect(() => {
    failed.current.forEach(id => { if (!latest.current.unread.has(id)) failed.current.delete(id); });
    if (!failed.current.size) setError('');
    if (!enabled || !root.current) return;
    let active = true, pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const candidates = new Map<string, HTMLElement>();
    const visible = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      const height = Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
      return box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth && height >= Math.min(box.height * .5, 240);
    };
    const available = () => document.visibilityState === 'visible' && navigator.onLine;
    const eligible = () => [...candidates].filter(([id, element]) => !seen.current.has(id) && latest.current.unread.has(id) && visible(element)).map(([id]) => id).slice(0, 50);
    const schedule = () => {
      clearTimeout(timer);
      if (active && !pending && available() && eligible().length) timer = setTimeout(() => void read(), 500);
    };
    async function read() {
      if (!active || pending || !available()) return;
      const ids = eligible(); if (!ids.length) return;
      pending = true; ids.forEach(id => seen.current.add(id));
      try {
        await markOpened(ids);
        if (active) { latest.current.onRead(ids); setError(''); }
      } catch (cause) {
        if (active) { ids.forEach(id => failed.current.add(id)); setError(procedureError(cause)); }
      } finally { pending = false; if (active) schedule(); }
    }
    const elements = root.current.querySelectorAll<HTMLElement>('[data-notification-id]');
    elements.forEach(element => { const id = element.dataset.notificationId; if (id) candidates.set(id, element); });
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(schedule, { threshold: [0, .25, .5, .75, 1] }) : null;
    elements.forEach(element => observer?.observe(element));
    const resume = () => {
      if (available() && failed.current.size) { retry(); return; }
      schedule();
    };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    window.addEventListener('online', resume); window.addEventListener('offline', schedule);
    document.addEventListener('visibilitychange', resume);
    schedule();
    return () => { active = false; clearTimeout(timer); observer?.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('online', resume); window.removeEventListener('offline', schedule); document.removeEventListener('visibilitychange', resume); };
  }, [root, signature, enabled, markOpened, attempt]);
  return { error, retry, reset: () => { seen.current.clear(); failed.current.clear(); setError(''); setAttempt(value => value + 1); }, ignore: (ids: string[]) => ids.forEach(id => seen.current.add(id)) };
}
