import { useEffect, useRef, useState } from 'react';
import { AppIcon } from './AppIcon';
import { FetchLoader } from './FetchLoader';
export function PageState({ state }: { state: { loading: boolean; error: string; more: boolean; rows: unknown[]; automatic?: boolean; next: () => Promise<unknown>; refresh: () => Promise<unknown> } }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const latest = useRef(state); latest.current = state;
  const [supported] = useState(() => typeof IntersectionObserver !== 'undefined');
  useEffect(() => {
    if (!supported || !state.automatic || !state.more || state.loading || state.error || !sentinel.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !latest.current.loading && !latest.current.error && document.visibilityState === 'visible' && navigator.onLine) void latest.current.next();
    }, { rootMargin: '0px 0px 240px 0px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [supported, state.automatic, state.more, state.loading, state.error, state.rows.length]);
  return <>{state.error && <p className="procedure-load-error" role="alert">{state.error} <button disabled={state.loading} onClick={()=>void state.refresh()}><AppIcon name="refresh"/>Retry</button></p>}{state.loading&&<FetchLoader compact={state.rows.length>0} label={state.rows.length?'Loading more experiences…':'Loading…'}/>} {state.more && (state.automatic && supported && !state.error ? <div ref={sentinel} className="page-sentinel" aria-hidden="true"/> : <button className="action-button" disabled={state.loading} onClick={()=>void state.next()}>Load more<AppIcon name="arrow"/></button>)}</>;
}
