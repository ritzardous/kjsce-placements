/** One footer for the public site and every signed-in workspace. */
export function ProductFooter({ publicView = false, showCredits = true }: { publicView?: boolean; showCredits?:boolean }) {
  return <footer className={`product-footer ${publicView ? 'lp-footer' : 'portal-footer'}`}>
    <div className="product-footer-inner">
      <a className="product-footer-brand" href={publicView ? '#landing' : '#home'}>Placement Stats <span>× KJSCE</span></a>
      <a className="product-footer-about" href="#about">About this project</a>
      <div className="product-footer-end">
        {showCredits && <span className="product-footer-credit">By <a href="https://github.com/ritzardous" target="_blank" rel="noopener noreferrer">Ritesh</a> &amp; <a href="https://github.com/Saksham-Varshney07" target="_blank" rel="noopener noreferrer">Saksham</a></span>}
        <div id="footer-actions" className="product-footer-actions" />
      </div>
    </div>
  </footer>;
}
