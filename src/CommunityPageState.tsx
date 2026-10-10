export function PageState({ state }: { state: { loading: boolean; error: string; more: boolean; rows: unknown[]; next: () => Promise<void>; refresh: () => Promise<void> } }) {
  return <>{state.error && <p role="alert">{state.error} <button onClick={()=>void state.refresh()}>Retry</button></p>}{state.loading && <p role="status">Loading…</p>}{state.more && <button className="action-button" disabled={state.loading} onClick={()=>void state.next()}>Load more</button>}</>;
}
