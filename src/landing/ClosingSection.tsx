import { useEffect, useRef, useState } from "react";
import type { FinaleController } from "./VoronoiScene";
import { playSignInClick } from "./signin-sound";
import { useAuth } from "../lib/auth";
function FinalePattern({
  allowed,
}: {
  allowed: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<FinaleController | null>(null),
    [ready, setReady] = useState(false),
    motion = useRef(true);
  useEffect(() => {
    if (!allowed || !host.current) return;
    const element = host.current;
    let disposed = false,
      scheduled = false,
      fallbackStarted = false;
    const startFallback = () => {
      if (disposed || fallbackStarted) return;
      fallbackStarted = true;
      controller.current?.dispose();
      controller.current = null;
      setReady(false);
      void import("./VoronoiFallback").then((module) => {
        if (disposed) return;
        const mounted = module.mountFallbackScene(element);
        controller.current = mounted;
        mounted.setMotion(motion.current);
        setReady(true);
      }).catch(() => {
        if (!disposed) setReady(false);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || scheduled) return;
        scheduled = true;
        observer.disconnect();
        void import("./VoronoiScene")
          .then(async (module) => {
            if (disposed) return;
            const mounted = await module.mountFinaleScene(element, startFallback);
            if (disposed) {
              mounted.dispose();
              return;
            }
            controller.current = mounted;
            mounted.setMotion(motion.current);
            setReady(true);
          })
          .catch(startFallback);
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
      setReady(false);
    };
  }, [allowed]);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      controller.current?.setTheme(
        document.documentElement.dataset.theme === "dark",
      ),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={`lp-finale-pattern${ready ? " is-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="lp-finale-poster" />
      <div ref={host} className="lp-finale-canvas" />
    </div>
  );
}
export function ClosingSection({ allowed }: { allowed: boolean }) {
  const auth = useAuth();
  return (
    <section className="lp-finale" aria-labelledby="finale-title">
      <FinalePattern allowed={allowed} />
      <div className="lp-finale-copy" data-reveal>
        <h2 id="finale-title">
          Placement intelligence.
          <br />
          <em>Turn it into your edge.</em>
        </h2>
        <p>Connect the evidence. Learn from those who went before you. Walk into your next opportunity with a clearer plan.</p>
        <button type="button" className="lp-action-link" disabled={auth.busy || !auth.ready} onClick={() => { playSignInClick(); void auth.login(); }}>
          Build your next move <span aria-hidden="true">↗</span>
        </button>
      </div>

    </section>
  );
}
