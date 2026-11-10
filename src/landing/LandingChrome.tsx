import { ProductFooter } from '../ui/ProductFooter';
import { ThemeControl } from "../ui/ThemeControl";
import { GoogleButton, useAuth } from "../lib/auth";
import { useMagnet } from "./motion";
import { useScrollHeader } from "./useScrollHeader";
export function LandingHeader() {
  const header = useScrollHeader();
  const { login, busy, ready } = useAuth();
  return (
    <header ref={header} className="lp-header" data-collapsed="false">
      <a
        className="lp-brand"
        href="#landing"
        aria-label="Placement Stats KJSCE home"
      >
        <span className="lp-brand-mark" aria-hidden="true">
          p<span>↗</span>
        </span>
        <span>
          Placement
          <br />
          <strong>Stats.</strong>
        </span>
      </a>
      <nav aria-label="Landing navigation">
        <ThemeControl />
        <button type="button" className="lp-nav-link lp-signin" disabled={busy || !ready} onClick={() => void login()}>
          {busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">↗</span>
        </button>
      </nav>
    </header>
  );
}
export function SignInCTA() {
  const magnet = useMagnet();
  return (
    <div ref={magnet} className="lp-signin-cta">
      <GoogleButton />
      <span className="cta-shadow" aria-hidden="true" />
    </div>
  );
}
export function LandingFooter() { return <ProductFooter publicView/>; }
