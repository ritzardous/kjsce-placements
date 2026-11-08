import { useEffect, useRef, useState } from "react";
import { archiveCompanies, companyYears, companyRoute } from "./archive-data";
import { visibleYears } from "../routing";
import { useMotionPolicy } from "./motion";
import type { ArchiveController } from "./ArchiveScene";
function ArchivePoster({ year }: { year: number }) {
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
      <text
        x="325"
        y="268"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="monospace"
        fontSize="55"
      >
        {year}
      </text>
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
  const [year, setYear] = useState(2026),
    [selected, setSelected] = useState(0),
    [ready, setReady] = useState(false),
    [failedLogos, setFailedLogos] = useState<string[]>([]),
    motionAllowed = useMotionPolicy();
  const host = useRef<HTMLDivElement>(null),
    companyNodes = useRef<HTMLDivElement>(null),
    controller = useRef<ArchiveController | null>(null),
    selection = useRef({ year, selected, paused });
  selection.current = { year, selected, paused };
  useEffect(() => {
    if (!motionAllowed || !host.current) return;
    let disposed = false,
      scheduled = false;
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
                    if (!disposed) setReady(true);
                  },
                  () => {
                    if (!disposed) {
                      setReady(false);
                      companyNodes.current
                        ?.querySelectorAll<HTMLButtonElement>("button")
                        .forEach((node) => {
                          node.style.removeProperty("left");
                          node.style.removeProperty("top");
                        });
                    }
                  },
                  (points) => {
                    companyNodes.current
                      ?.querySelectorAll<HTMLButtonElement>("button")
                      .forEach((node, index) => {
                        node.style.left = `${Math.max(16, Math.min(82, points[index].x))}%`;
                        node.style.top = `${Math.max(13, Math.min(86, points[index].y))}%`;
                      });
                  },
                );
                controller.current = scene;
                scene.setYear(selection.current.year);
                scene.setCompany(selection.current.selected);
                scene.setMotion(!selection.current.paused);
              } catch {
                setReady(false);
              }
            })
            .catch(() => {
              if (!disposed) setReady(false);
            });
        }, 100);
      },
      { rootMargin: "100px" },
    );
    observer.observe(target);
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
      setReady(false);
    };
  }, [motionAllowed]);
  useEffect(() => {
    controller.current?.setYear(year);
    controller.current?.setCompany(selected);
    controller.current?.setMotion(!paused);
  }, [year, selected, paused]);
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
  const company = archiveCompanies[selected],
    years = companyYears(company),
    route = companyRoute(company, years.includes(year) ? year : years.at(-1)!);
  function choose(index: number) {
    setSelected(index);
    const supported = companyYears(archiveCompanies[index]);
    if (!supported.includes(year)) setYear(supported.at(-1)!);
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
        <ArchivePoster year={year} />
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
      <figcaption className="index-caption">
        <div className="index-controls">
          <div
            className="index-batches"
            role="group"
            aria-label="Select archive batch"
          >
            {visibleYears.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={year === value}
                onClick={() => {
                  setYear(value);
                  if (!companyYears(company).includes(value)) setSelected(0);
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            className="index-motion"
            type="button"
            disabled={!motionAllowed}
            aria-label={
              paused ? "Play archive animation" : "Pause archive animation"
            }
            onClick={onToggleMotion}
          >
            {motionAllowed
              ? paused
                ? "▶ Motion"
                : "Ⅱ Motion"
              : "Static view"}
          </button>
        </div>
        <div className="index-selected" aria-live="polite" aria-atomic="true">
          <strong>{company.name}</strong>
          <a href={route} aria-label={`Open ${company.name} placement records`}>
            Explore record <span aria-hidden="true">↗</span>
          </a>
        </div>
      </figcaption>
    </figure>
  );
}
