import { ThemeControl } from "../ThemeControl";
import { GoogleButton } from "../auth";
import { useMagnet } from "./motion";
export function LandingHeader({
  login = false,
  onExplore,
}: {
  login?: boolean;
  onExplore?: () => void;
}) {
  return (
    <header className="lp-header">
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
      <nav
        aria-label={login ? "Authentication navigation" : "Landing navigation"}
      >
        {login ? (
          <a href="#landing" className="lp-nav-link">
            ← Back
          </a>
        ) : (
          <a
            href="#landing?section=archive"
            className="lp-nav-link lp-index-link"
            onClick={(event) => {
              if (onExplore) {
                event.preventDefault();
                onExplore();
              }
            }}
          >
            Explore <span aria-hidden="true">↓</span>
          </a>
        )}
        <ThemeControl />
        {!login && (
          <a href="#login" className="lp-nav-link lp-signin">
            Sign in <span aria-hidden="true">↗</span>
          </a>
        )}
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
export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <a className="lp-footer-brand" href="#landing">
        Placement Stats <span>× KJSCE</span>
      </a>
      <details className="lp-privacy">
        <summary>
          Sources & privacy <span aria-hidden="true">+</span>
        </summary>
        <p>
          Statistics come from college reports and placement emails. Gaps are
          shown where information is unavailable. Community experiences are
          self-reported and reviewed, not verified alumni identities. Available
          LinkedIn links are accessible after sign-in. Roles marked * are
          estimates from public information, not confirmed placement roles.
          Company names and logos identify records, with no affiliation or
          endorsement. Historical outcomes do not guarantee future results.
        </p>
      </details>
      <span>
        By{" "}
        <a
          href="https://github.com/ritzardous"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ritesh
        </a>{" "}
        &{" "}
        <a
          href="https://github.com/Saksham-Varshney07"
          target="_blank"
          rel="noopener noreferrer"
        >
          Saksham
        </a>
      </span>
    </footer>
  );
}
