import { useEffect, useState } from 'react';
import { safeStored, storeSession } from '../community/community-api';
import { pageFromHash, pageHref } from '../app/page-state';

const MAX_PAGE = 10000;

export function storedPage(storageKey: string): number {
  const value = Number(safeStored<unknown>(storageKey, 1));
  return Number.isInteger(value) && value >= 1 && value <= MAX_PAGE ? value : 1;
}

/**
 * Keep a client-side page number across remounts and history navigation.
 *
 * The URL query is the source of truth for a visible list, so browser Back/Forward and
 * shared links restore the same page. Session storage keeps the last page for in-app
 * back links and for routes that do not carry the query (for example a company detail).
 */
export function usePersistentPage(storageKey: string, routes: readonly string[], totalPages: number) {
  const routeKey = routes.join('|');
  const [page, setPage] = useState(() => {
    const hash = location.hash;
    if (routes.includes(hash.split('?')[0]) && new URLSearchParams(hash.split('?')[1]).has('page')) return pageFromHash(hash);
    return storedPage(storageKey);
  });
  const max = Math.max(1, totalPages);
  const current = Math.min(page, max);

  useEffect(() => {
    const allowed = routeKey.split('|');
    if (allowed.includes(location.hash.split('?')[0])) {
      const next = pageHref(location.hash, current);
      if (next !== location.hash) window.history.replaceState(null, '', next);
    }
    storeSession(storageKey, current);
  }, [current, storageKey, routeKey]);

  useEffect(() => {
    const allowed = routeKey.split('|');
    const handle = () => {
      const hash = location.hash;
      if (!allowed.includes(hash.split('?')[0])) return;
      setPage(new URLSearchParams(hash.split('?')[1]).has('page') ? pageFromHash(hash) : storedPage(storageKey));
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [storageKey, routeKey]);

  useEffect(() => {
    if (page > max) setPage(max);
  }, [page, max]);

  return [current, setPage] as const;
}
