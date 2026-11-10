import { useEffect, useRef, useState } from "react";
import type { FinaleController } from "./VoronoiScene";
function FinalePattern({
  allowed,
  paused,
  onReady,
}: {
  allowed: boolean;
  paused: boolean;
  onReady: (ready: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<FinaleController | null>(null),
    [ready, setReady] = useState(false),
    motion = useRef(!paused);
  motion.current = !paused;
  useEffect(() => onReady(ready), [ready, onReady]);
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
    controller.current?.setMotion(!paused);
  }, [paused]);
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
export function ClosingSection({
  allowed,
  paused,
  onToggleMotion,
}: {
  allowed: boolean;
  paused: boolean;
  onToggleMotion: () => void;
}) {
  const [ready, setReady] = useState(false);
  return (
    <section className="lp-finale" aria-labelledby="finale-title">
      <FinalePattern allowed={allowed} paused={paused} onReady={setReady} />
      <div className="lp-finale-copy" data-reveal>
        <h2 id="finale-title">
          Their experience.
          <br />
          <em>Your next move.</em>
        </h2>
        <p>A clearer view of placements. A better place to start.</p>
        <a className="lp-action-link" href="#login">
          Find your perspective <span aria-hidden="true">↗</span>
        </a>
      </div>
      {allowed && ready && (
        <button
          type="button"
          className="lp-finale-motion"
          aria-label={
            paused ? "Play background animation" : "Pause background animation"
          }
          title={paused ? "Play animation" : "Pause animation"}
          onClick={onToggleMotion}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            {paused ? (
              <path d="M8 5L19 12L8 19Z" />
            ) : (
              <path d="M8 5V19M16 5V19" />
            )}
          </svg>
        </button>
      )}
    </section>
  );
}
