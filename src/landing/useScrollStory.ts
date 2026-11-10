import { useCallback, useEffect, useRef, useState } from "react";

/** Native scrolling drives a short editorial sequence; no wheel/touch interception. */
export function useScrollStory(count: number, enabled: boolean, pinOnly = false) {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const active = useRef(0);
  const manualAt = useRef<number | null>(null);
  const select = useCallback((value: number) => {
    manualAt.current = scrollY;
    active.current = value;
    setIndex(value);
  }, []);
  useEffect(() => {
    const section = ref.current;
    const panel = section?.querySelector<HTMLElement>(".lp-story-pin");
    if (!section || !panel) return;
    const focus = section.querySelector<HTMLElement>("[data-story-focus]") || panel;
    if (!enabled) {
      section.dataset.scrollStory = "off";
      return;
    }
    let frame = 0, pinned = false, runway = 1, top = 0, padding = 0;
    const update = () => {
      frame = 0;
      if (pinOnly && !pinned) return;
      const box = section.getBoundingClientRect();
      const focusBox = pinned ? box : focus.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, pinned
        ? (top - box.top - padding) / runway
        : (innerHeight * .75 - focusBox.top) / Math.max(1, focusBox.height + innerHeight * .25)));
      section.style.setProperty("--story-progress", progress.toFixed(4));
      if (manualAt.current !== null) {
        if (Math.abs(scrollY - manualAt.current) < 48) return;
        manualAt.current = null;
      }
      const next = Math.min(count - 1, Math.floor(progress * count));
      // A narrow dead band prevents trackpad bounce from repeatedly turning a page.
      if (next === active.current ||
          (next === active.current + 1 && progress * count < next + .06) ||
          (next === active.current - 1 && progress * count > active.current - .06)) return;
      active.current = next;
      setIndex(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const height = panel.offsetHeight;
      const style = getComputedStyle(section);
      padding = parseFloat(style.paddingTop);
      pinned = height <= innerHeight - 144 && innerHeight >= 620;
      runway = Math.min(1100, Math.max(640, innerHeight * 1.1));
      top = Math.max(112, (innerHeight - height) / 2);
      section.dataset.scrollStory = pinned ? "pinned" : pinOnly ? "manual" : "inline";
      section.style.setProperty("--story-height", `${height}px`);
      section.style.setProperty("--story-runway", `${runway}px`);
      section.style.setProperty("--story-padding", `${padding + parseFloat(style.paddingBottom)}px`);
      section.style.setProperty("--story-top", `${top}px`);
      schedule();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      section.dataset.scrollStory = "off";
      for (const name of ["height", "runway", "padding", "top", "progress"])
        section.style.removeProperty(`--story-${name}`);
    };
  }, [count, enabled, pinOnly]);
  return { ref, index, select };
}
