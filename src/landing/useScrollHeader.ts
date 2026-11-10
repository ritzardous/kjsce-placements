import { useEffect, useRef } from "react";
/** Directional hysteresis keeps trackpad noise and scroll momentum from toggling the bar. */
export function useScrollHeader() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let frame = 0,
      anchor = Math.max(0, scrollY),
      collapsed = false,
      viewportWidth = innerWidth;
    const show = () => {
      collapsed = false;
      header.dataset.collapsed = "false";
      anchor = Math.max(0, scrollY);
    };
    show();
    function update() {
      frame = 0;
      const max = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        ),
        y = Math.min(max, Math.max(0, scrollY));
      const active = document.activeElement,
        keyboardFocus =
          active instanceof HTMLElement &&
          header!.contains(active) &&
          active.matches(":focus-visible");
      if (y <= 80 || keyboardFocus) {
        show();
        return;
      }
      if (collapsed) {
        // Measure from the furthest downward position. Small direction changes
        // don't reset progress or reveal the bar during inertial bounce.
        anchor = Math.max(anchor, y);
        if (anchor - y >= 72) show();
      } else {
        anchor = Math.min(anchor, y);
        if (y >= 160 && y - anchor >= 40) {
          collapsed = true;
          header!.dataset.collapsed = "true";
          anchor = y;
        }
      }
    }
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = () => {
      // Mobile browser chrome changes viewport height during ordinary scrolling.
      // Only a layout-width change should reset navigation visibility.
      if (Math.abs(innerWidth - viewportWidth) < 2) return;
      viewportWidth = innerWidth;
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
