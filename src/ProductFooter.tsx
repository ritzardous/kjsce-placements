/** One footer for the public site and every signed-in workspace. */
export function ProductFooter({ publicView = false }: { publicView?: boolean }) {
  return <footer className={`product-footer ${publicView ? 'lp-footer' : 'portal-footer'}`}>
    <div className="product-footer-inner">
      <a className="product-footer-brand" href={publicView ? '#landing' : '#home'}>Placement Stats <span>× KJSCE</span></a>
      <details className="product-footer-privacy lp-privacy">
        <summary>Sources &amp; privacy <span aria-hidden="true">+</span></summary>
        <p>The numbers come from college reports and placement emails. If a detail is missing, we say so. Students submit hiring accounts for review; that doesn’t verify their alumni status. Sign in to see available LinkedIn links. Roles marked * are estimates based on public information, not confirmed by placement records. Company names and logos show whose records you’re reading, not a partnership or endorsement. Past hiring results can’t tell you what happens next.</p>
      </details>
      <div className="product-footer-end">
        <span className="product-footer-credit">By <a href="https://github.com/ritzardous" target="_blank" rel="noopener noreferrer">Ritesh</a> &amp; <a href="https://github.com/Saksham-Varshney07" target="_blank" rel="noopener noreferrer">Saksham</a></span>
        <div id="footer-actions" className="product-footer-actions" />
      </div>
    </div>
  </footer>;
}
