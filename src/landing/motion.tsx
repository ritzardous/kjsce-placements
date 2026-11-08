import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** One motion policy for decorative CSS and the lazy GPU experience. */
export function useMotionPolicy() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
    const update = () => setAllowed(!media.matches && !connection?.saveData);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return allowed;
}
export function usePageMotion(
  root: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const targets = node.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    targets.forEach((target) => observer.observe(target));
    if (!enabled) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return () => observer.disconnect();
    }
    let frame = 0;
    const pointer = { x: 0, y: 0 };
    function update() {
      frame = 0;
      node!.style.setProperty("--pointer-x", `${pointer.x}px`);
      node!.style.setProperty("--pointer-y", `${pointer.y}px`);
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.x = (event.clientX / innerWidth - 0.5) * 18;
      pointer.y = (event.clientY / innerHeight - 0.5) * 12;
      if (!frame) frame = requestAnimationFrame(update);
    };
    node.addEventListener("pointermove", move, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
      node.style.removeProperty("--pointer-x");
      node.style.removeProperty("--pointer-y");
    };
  }, [root, enabled]);
}
/** Pathway traces stretch across the actual hero, independent of WebGL support. */
export function PathwayField() {
  return (
    <div className="lp-pathway-field" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern
            id="pathway-cells"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M64 0H0V64"
              fill="none"
              stroke="currentColor"
              strokeWidth=".55"
            />
          </pattern>
        </defs>
        <rect width="1600" height="900" fill="url(#pathway-cells)" />
        <g className="field-routes">
          {[0, 1, 2, 3, 4].map((i) => (
            <g
              key={i}
              style={{ "--route-delay": `${i * -2.7}s` } as React.CSSProperties}
            >
              <path
                d={`M-80 ${680 + i * 52} H${290 + i * 62} Q${360 + i * 62} ${680 + i * 52} ${420 + i * 62} ${610 + i * 40} L${800 + i * 28} ${220 + i * 34} Q${860 + i * 28} ${170 + i * 34} ${920 + i * 28} ${170 + i * 34} H1680`}
                className="field-rail"
              />
              <path
                d={`M-80 ${680 + i * 52} H${290 + i * 62} Q${360 + i * 62} ${680 + i * 52} ${420 + i * 62} ${610 + i * 40} L${800 + i * 28} ${220 + i * 34} Q${860 + i * 28} ${170 + i * 34} ${920 + i * 28} ${170 + i * 34} H1680`}
                className="field-packet"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
export function useMagnet() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const move = (event: PointerEvent) => {
      if (media.matches || event.pointerType !== "mouse") return;
      const box = node.getBoundingClientRect();
      node.style.setProperty(
        "--magnet-x",
        `${(event.clientX - box.left - box.width / 2) * 0.045}px`,
      );
      node.style.setProperty(
        "--magnet-y",
        `${(event.clientY - box.top - box.height / 2) * 0.09}px`,
      );
    };
    const reset = () => {
      node.style.setProperty("--magnet-x", "0px");
      node.style.setProperty("--magnet-y", "0px");
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", reset);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
    };
  }, []);
  return ref;
}
