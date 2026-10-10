import { useEffect, useState } from 'react';
export const years = [2027, 2026, 2025] as const;
export type Route = { page: string; parameter?: string; year: number };
export function parseRoute(hash = location.hash): Route {
  const segments = hash.split('?')[0].replace(/^#/, '').split('/');
  const explicitYear = years.some(year => String(year) === segments[0]);
  const year = explicitYear ? Number(segments.shift()) : 2026;
  const [page, encoded] = segments;
  let parameter: string | undefined;
  try { parameter = encoded ? decodeURIComponent(encoded) : undefined; } catch { parameter = undefined; }
  return { page: page || (explicitYear ? 'overview' : 'landing'), parameter, year };
}
export function useRoute() {
  const [route, setRoute] = useState(parseRoute);
  useEffect(() => {
    const handle = () => { setRoute(parseRoute()); window.scrollTo(0, 0); requestAnimationFrame(() => document.getElementById('portal-main')?.focus({ preventScroll: true })); };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);
  return route;
}
