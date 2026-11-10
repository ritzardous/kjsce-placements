import type { FinaleController } from "./VoronoiScene";
type Point = { x: number; y: number };

// Clip a cell by the perpendicular bisector between two moving sites.
function clip(polygon: Point[], site: Point, other: Point): Point[] {
  const nx = other.x - site.x, ny = other.y - site.y;
  const limit = (other.x ** 2 + other.y ** 2 - site.x ** 2 - site.y ** 2) / 2;
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = a.x * nx + a.y * ny - limit;
    const db = b.x * nx + b.y * ny - limit;
    if (da <= 0) result.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const ratio = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
    }
  }
  return result;
}

/** Real moving Voronoi cells for browsers that deny WebGL or lose their GPU context. */
export function mountFallbackScene(host: HTMLElement): FinaleController {
  const canvas = document.createElement("canvas");
  canvas.dataset.renderer = "canvas2d";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering unavailable");
  host.replaceChildren(canvas);
  const section = host.closest("section")!;
  let width = 1, height = 1, columns = 1, rows = 1;
  let frame = 0, last = performance.now(), time = 68;
  let playing = true, visible = false, disposed = false;
  let dark = document.documentElement.dataset.theme === "dark";
  const pointer = { x: .5, y: .5, strength: 0 };
  const target = { ...pointer };
  const spacing = 72;
  function draw() {
    const ctx = context!;
    const colors = dark
      ? ["#172327", "#213048", "#304779", "#182624", "#355792"]
      : ["#d6def2", "#e8ece5", "#b6c7ed", "#edf0e6", "#91abe1"];
    ctx.fillStyle = dark ? "#101411" : "#f7f7ef";
    ctx.fillRect(0, 0, width, height);
    const sites: Point[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const seed = row * 127.1 + col * 311.7;
        let x = (col - 1 + .5 + (row % 2) * .5 + .28 * Math.sin(seed + time)) * spacing;
        let y = (row - 1 + .5 + .28 * Math.cos(seed * 1.37 + time * .9)) * spacing * .86;
        const dx = x - pointer.x * width, dy = y - pointer.y * height;
        const influence = Math.exp(-(dx * dx + dy * dy) / 28000) * pointer.strength * .24;
        x += dx * influence;
        y += dy * influence;
        sites.push({ x, y });
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const site = sites[row * columns + col];
        let polygon = [{ x: 0, y: 0 }, { x: width, y: 0 },
          { x: width, y: height }, { x: 0, y: height }];
        for (let r = Math.max(0, row - 2); r <= Math.min(rows - 1, row + 2); r++) {
          for (let c = Math.max(0, col - 2); c <= Math.min(columns - 1, col + 2); c++) {
            if (r !== row || c !== col) polygon = clip(polygon, site, sites[r * columns + c]);
            if (!polygon.length) break;
          }
          if (!polygon.length) break;
        }
        if (!polygon.length) continue;
        ctx.beginPath();
        polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = colors[((row * 13 + col * 7) ^ (row + col)) % colors.length];
        ctx.fill();
        ctx.strokeStyle = dark ? "#101411" : "#d0d9ea";
        ctx.lineWidth = .8;
        ctx.stroke();
      }
    }
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !playing || !visible || document.hidden) return;
    const delta = now - last;
    if (delta >= 1000 / 24) {
      last = now;
      time += Math.min(delta, 200) * .00055;
      const ease = 1 - Math.exp(-Math.min(delta, 200) / 110);
      pointer.x += (target.x - pointer.x) * ease;
      pointer.y += (target.y - pointer.y) * ease;
      pointer.strength += (target.strength - pointer.strength) * ease;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    last = performance.now();
    if (!disposed && playing && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const box = host.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    const ratio = Math.max(1, Math.min(2, Math.max(1.5, devicePixelRatio || 1), Math.sqrt(3500000 / (width * height))));
    canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.ceil(width / spacing) + 2; rows = Math.ceil(height / (spacing * .86)) + 2;
    draw();
  }
  const move = (event: PointerEvent) => {
    if (!playing || event.pointerType === "touch") return;
    const box = section.getBoundingClientRect();
    target.x = (event.clientX - box.left) / box.width;
    target.y = (event.clientY - box.top) / box.height;
    target.strength = 1;
  };
  const leave = () => { target.strength = 0; };
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const size = new ResizeObserver(resize);
  resize(); visibility.observe(host); size.observe(host);
  section.addEventListener("pointermove", move, { passive: true });
  section.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", sync);
  return {
    setMotion(value) { playing = value; sync(); },
    setTheme(value) { dark = value; draw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); visibility.disconnect(); size.disconnect();
      section.removeEventListener("pointermove", move); section.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync); canvas.remove();
    },
  };
}
