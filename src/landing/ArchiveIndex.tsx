import { useEffect, useRef, useState } from "react";
import { archiveCompanies } from "./archive-data";
import { useMotionPolicy } from "./motion";
import type { ArchiveController } from "./ArchiveScene";
import { flameOutline, flameHeart, flameSvgPath } from "./flame-mark";
function ArchivePoster() {
  return (
    <svg className="index-poster" viewBox="0 0 650 520" aria-hidden="true">
      <g fill="none" stroke="currentColor">
        <ellipse
          cx="325"
          cy="250"
          rx="240"
          ry="150"
          transform="rotate(-28 325 250)"
        />
        <ellipse
          cx="325"
          cy="250"
          rx="240"
          ry="150"
          transform="rotate(38 325 250)"
        />
        <ellipse
          cx="325"
          cy="250"
          rx="225"
          ry="190"
          transform="rotate(-65 325 250)"
        />
        {[0, 1, 2, 3, 4].map((v) => (
          <path
            key={v}
            opacity=".15"
            d={`M${100 + v * 110} 90L325 250L${80 + v * 115} 430`}
          />
        ))}
      </g>
      <circle
        cx="325"
        cy="250"
        r="66"
        fill="var(--lp-paper)"
        stroke="currentColor"
        strokeDasharray="2 6"
      />
      <g transform="translate(325 250) scale(53 -53)">
        <path
          d={flameSvgPath(flameOutline) + flameSvgPath(flameHeart)}
          fill="currentColor"
          fillRule="evenodd"
        />
        <path
          d={flameSvgPath(flameHeart)}
          fill="currentColor"
          transform="translate(.025 -.12) scale(.65)"
          opacity=".65"
        />
      </g>
    </svg>
  );
}
export function ArchiveIndex({
  paused = false,
  onToggleMotion,
}: {
  paused?: boolean;
  onToggleMotion: () => void;
}) {
  const [selected, setSelected] = useState(0),
    [ready, setReady] = useState(false),
    [failedLogos, setFailedLogos] = useState<string[]>([]),
    motionAllowed = useMotionPolicy();
  const host = useRef<HTMLDivElement>(null),
    companyNodes = useRef<HTMLDivElement>(null),
    controller = useRef<ArchiveController | null>(null),
    selection = useRef({ selected, paused });
  selection.current = { selected, paused };
  useEffect(() => {
    if (!motionAllowed || !host.current) return;
    let disposed = false,
      scheduled = false,
      revealFrame = 0;
    const target = host.current;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || scheduled) return;
        scheduled = true;
        observer.disconnect();
        timer = setTimeout(() => {
          void import("./ArchiveScene")
            .then((module) => {
              if (disposed) return;
              try {
                const scene = module.mountArchiveScene(
                  target,
                  () => {
                    // Keep the complete SVG poster until the first rendered scene
                    // has had a paint opportunity; reveal geometry and labels together.
                    revealFrame = requestAnimationFrame(() => {
                      revealFrame = requestAnimationFrame(() => { if (!disposed) setReady(true); });
                    });
                  },
                  () => {
                    if (!disposed) {
                      cancelAnimationFrame(revealFrame);
                      setReady(false);
                      companyNodes.current
                        ?.querySelectorAll<HTMLButtonElement>("button")
                        .forEach((node) => {
                          node.style.removeProperty("--scene-company-x");
                          node.style.removeProperty("--scene-company-y");
                        });
                    }
                  },
                  (points) => {
                    companyNodes.current
                      ?.querySelectorAll<HTMLButtonElement>("button")
                      .forEach((node, index) => {
                        node.style.setProperty('--scene-company-x', `${Math.max(16, Math.min(82, points[index].x))}%`);
                        node.style.setProperty('--scene-company-y', `${Math.max(13, Math.min(86, points[index].y))}%`);
                      });
                  },
                );
                controller.current = scene;
                scene.setCompany(selection.current.selected);
                scene.setMotion(!selection.current.paused);
              } catch {
                setReady(false);
              }
            })
            .catch(() => {
              if (!disposed) setReady(false);
            });
        }, 0);
      },
      { rootMargin: "100px" },
    );
    observer.observe(target);
    return () => {
      disposed = true;
      clearTimeout(timer);
      cancelAnimationFrame(revealFrame);
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
      setReady(false);
    };
  }, [motionAllowed]);
  useEffect(() => {
    controller.current?.setCompany(selected);
    controller.current?.setMotion(!paused);
  }, [selected, paused]);
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
  function choose(index: number) {
    setSelected(index);
  }
  return (
    <figure
      className={`opportunity-index ${ready ? "is-rendered" : ""}`}
      aria-label="Interactive placement archive"
    >
      <div
        className="index-stage"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const box = event.currentTarget.getBoundingClientRect();
          controller.current?.setPointer(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            ((event.clientY - box.top) / box.height) * 2 - 1,
          );
        }}
        onPointerLeave={() => controller.current?.setPointer(0, 0)}
      >
        <ArchivePoster />
        <div ref={host} className="index-world" aria-hidden="true" />
        <div
          ref={companyNodes}
          className="index-companies"
          role="group"
          aria-label="Explore company examples"
        >
          {archiveCompanies.map((item, index) => (
            <button
              className={`index-company company-${item.id}${failedLogos.includes(item.id) ? " logo-unavailable" : ""}`}
              key={item.id}
              type="button"
              aria-label={`Explore ${item.name}`}
              aria-pressed={selected === index}
              onClick={() => choose(index)}
            >
              <span className="index-company-logo">
                {failedLogos.includes(item.id) ? (
                  item.short[0]
                ) : (
                  <img
                    src={item.logo}
                    alt=""
                    width="28"
                    height="28"
                    draggable={false}
                    onError={() =>
                      setFailedLogos((current) =>
                        current.includes(item.id)
                          ? current
                          : [...current, item.id],
                      )
                    }
                  />
                )}
              </span>
              <span>{item.short}</span>
              <span className="company-pin" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <button
        className="index-motion-icon"
        type="button"
        disabled={!motionAllowed}
        aria-label={
          paused ? "Play archive animation" : "Pause archive animation"
        }
        title={paused ? "Play animation" : "Pause animation"}
        onClick={onToggleMotion}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
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
    </figure>
  );
}
