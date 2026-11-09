import { useEffect, useRef } from "react";
/** Compositor-only scroll navigation: accumulate downward intent, reveal on any upward scroll. */
export function useScrollHeader() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let frame = 0,
      previous = Math.max(0, scrollY),
      downward = 0;
    const show = () => {
      header.dataset.collapsed = "false";
      downward = 0;
    };
    show();
    function update() {
      frame = 0;
      const max = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        ),
        y = Math.min(max, Math.max(0, scrollY)),
        delta = y - previous;
      previous = y;
      const active = document.activeElement,
        keyboardFocus =
          active instanceof HTMLElement &&
          header!.contains(active) &&
          active.matches(":focus-visible");
      if (y < 140 || delta < 0 || keyboardFocus) {
        show();
        return;
      }
      if (delta > 0) {
        downward += delta;
        if (downward > 12) header!.dataset.collapsed = "true";
      }
    }
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = () => {
      previous = Math.max(0, scrollY);
      show();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Tab") show();
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("keydown", key);
    header.addEventListener("focusin", show);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", key);
      header.removeEventListener("focusin", show);
      delete header.dataset.collapsed;
    };
  }, []);
  return ref;
}
