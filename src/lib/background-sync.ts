import { useEffect, useRef } from 'react';

/** One bounded refresh per mounted resource, only while the app is visible and online. */
export function useBackgroundSync(refresh: () => Promise<boolean | void>, interval = 120000, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, running = false, failures = 0, last = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const available = () => document.visibilityState === 'visible' && navigator.onLine;
    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && available()) timer = setTimeout(() => void run(), Math.min(600000, interval * 2 ** failures));
    };
    async function run(force = false) {
      if (stopped || running || !available()) return;
      if (!force && Date.now() - last < 30000) { schedule(); return; }
      running = true; last = Date.now();
      try { failures = await latest.current() === false ? Math.min(3, failures + 1) : 0; }
      catch { failures = Math.min(3, failures + 1); }
      finally { running = false; schedule(); }
    }
    const resume = () => { clearTimeout(timer); if (available()) { if (Date.now() - last >= 30000) void run(); else schedule(); } };
    const changed = () => void run(true);
    schedule();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    window.addEventListener('offline', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('app-data-changed', changed);
    window.addEventListener('procedure-notifications-changed', changed);
    return () => {
      stopped = true; clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('app-data-changed', changed);
      window.removeEventListener('procedure-notifications-changed', changed);
    };
  }, [interval, enabled]);
}
