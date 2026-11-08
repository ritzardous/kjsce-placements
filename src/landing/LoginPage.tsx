import { useRef, useState } from "react";
import { useAuth } from "../auth";
import { LandingHeader, LandingFooter, SignInCTA } from "./LandingChrome";
import { ArchiveIndex } from "./ArchiveIndex";
import { PathwayField, useMotionPolicy, usePageMotion } from "./motion";
import "./landing.css";
export default function LoginPage({
  deepLink = false,
}: {
  deepLink?: boolean;
}) {
  const { error, user, logout, busy } = useAuth(),
    root = useRef<HTMLDivElement>(null),
    allowed = useMotionPolicy(),
    [paused, setPaused] = useState(false);
  usePageMotion(root, allowed && !paused);
  return (
    <div
      ref={root}
      className="ps-landing lp-login"
      data-motion={allowed && !paused ? "on" : "off"}
    >
      <LandingHeader login />
      <main className="lp-login-main">
        <PathwayField />
        <div className="lp-login-copy">
          <p className="lp-kicker">KJSCE Placement Stats</p>
          <h1>
            Your next chapter.
            <br />
            <em>A clearer start.</em>
          </h1>
          <p className="lp-description">
            The records, the experiences and the people.
            <br />
            One Google sign-in away.
          </p>
          {deepLink && (
            <p className="lp-return">
              We’ll take you back to the page you opened after sign-in.
            </p>
          )}
          {user && (
            <p className="lp-return">
              Sign in again with your existing Google account.
            </p>
          )}
          <SignInCTA />
          {user && (
            <button
              className="lp-text-button"
              disabled={busy}
              onClick={() => void logout()}
            >
              Sign out of the current account
            </button>
          )}
          {error && (
            <p className="lp-auth-error" role="alert">
              {error}
            </p>
          )}
          <p className="lp-access-note">Your email and drafts stay private.</p>
        </div>
        <div className="lp-login-visual">
          <ArchiveIndex
            paused={paused}
            onToggleMotion={() => setPaused((value) => !value)}
          />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
