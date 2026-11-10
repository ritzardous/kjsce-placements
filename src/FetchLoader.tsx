type Layout = 'cards' | 'dashboard' | 'article' | 'session';
function Lines({ heading = false }: { heading?: boolean }) {
  return <><span className={`skeleton-bar ${heading ? 'skeleton-heading' : 'skeleton-short'}`}/><span className="skeleton-bar"/><span className="skeleton-bar skeleton-medium"/></>;
}
/** Decorative placeholders mirror incoming content; no fabricated progress or data. */
export function FetchLoader({ label = 'Loading…', compact = false, variant = 'cards' }: { label?: string; compact?: boolean; variant?: Layout }) {
  return <div className={`fetch-loader skeleton-loader${compact ? ' is-compact' : ''}`} data-layout={variant} role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    <div className="skeleton-content" aria-hidden="true">
      {variant === 'session' && <div className="skeleton-header"><span className="skeleton-bar skeleton-mark"/><span className="skeleton-bar skeleton-short"/><span className="skeleton-bar skeleton-avatar"/></div>}
      {!compact && <div className="skeleton-intro"><Lines heading/></div>}
      <div className="skeleton-grid">
        {Array.from({ length: compact || variant === 'article' ? 1 : 3 }, (_, index) => <div className="skeleton-card" key={index}>
          {variant === 'dashboard' && <span className="skeleton-bar skeleton-number"/>}
          <Lines heading={variant !== 'article'}/>
          {variant === 'article' && <><Lines/><Lines/></>}
        </div>)}
      </div>
      {variant === 'dashboard' && !compact && <div className="skeleton-chart"><span className="skeleton-bar"/><span className="skeleton-bar"/><span className="skeleton-bar"/><span className="skeleton-bar"/><span className="skeleton-bar"/></div>}
    </div>
    <svg className="skeleton-hourglass" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4" stroke="currentColor" strokeWidth="1.5"/><path d="m10 18 2-2 2 2" stroke="currentColor" strokeWidth="1.5"/></svg>
  </div>;
}
