import {
  ShaderMount,
  voronoiFragmentShader,
  getShaderColorFromString,
  getShaderNoiseTexture,
} from "@paper-design/shaders";
export type FinaleController = {
  setMotion: (playing: boolean) => void;
  setTheme: (dark: boolean) => void;
  dispose: () => void;
};
const palette = (dark: boolean) => ({
  u_colors: (dark
    ? ["#172327", "#213048", "#304779", "#182624", "#355792"]
    : ["#d6def2", "#e8ece5", "#b6c7ed", "#edf0e6", "#91abe1"]
  ).map(getShaderColorFromString),
  u_colorGap: getShaderColorFromString(dark ? "#101411" : "#f7f7ef"),
  u_colorGlow: getShaderColorFromString(dark ? "#7495ed" : "#5076d8"),
});
/** Paper's Voronoi shader, with scoped pointer parallax and bounded resolution. */
export async function mountFinaleScene(
  host: HTMLElement,
  onFailure: () => void,
): Promise<FinaleController> {
  const noise = getShaderNoiseTexture();
  if (noise) await noise.decode();
  let shader: ShaderMount;
  try {
    shader = new ShaderMount(
      host,
      voronoiFragmentShader,
      {
        ...palette(document.documentElement.dataset.theme === "dark"),
        u_colorsCount: 5,
        u_stepsPerColor: 2,
        u_distortion: 0.32,
        u_gap: 0.018,
        u_glow: 0.12,
        u_noiseTexture: noise,
        u_fit: 0,
        u_scale: 0.38,
        u_rotation: -12,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      { alpha: true, antialias: false, powerPreference: "low-power" },
      0.12,
      68000,
      0.75,
      innerWidth < 761 ? 140000 : 380000,
    );
  } catch (error) {
    host.replaceChildren();
    throw error;
  }
  shader.canvasElement.setAttribute("aria-hidden", "true");
  const section = host.closest("section")!,
    target = { x: 0, y: 0 },
    current = { x: 0, y: 0 };
  let playing = true,
    disposed = false,
    frame = 0,
    last = 0,
    inView = true;
  function tick(now: number) {
    frame = 0;
    if (disposed || !playing || !inView || document.hidden) return;
    if (now - last < 1000 / 30) {
      frame = requestAnimationFrame(tick);
      return;
    }
    last = now;
    current.x += (target.x - current.x) * 0.09;
    current.y += (target.y - current.y) * 0.09;
    shader.setUniforms({
      u_offsetX: current.x * 0.027,
      u_offsetY: current.y * 0.02,
      u_rotation: -12 + current.x * 1.8,
    });
    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.002)
      frame = requestAnimationFrame(tick);
  }
  const wake = () => {
    if (!frame && playing && inView && !document.hidden)
      frame = requestAnimationFrame(tick);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !playing) return;
    const box = section.getBoundingClientRect();
    target.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    target.y = ((event.clientY - box.top) / box.height) * 2 - 1;
    wake();
  };
  const leave = () => {
    target.x = 0;
    target.y = 0;
    wake();
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (!inView) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { threshold: 0 },
  );
  observer.observe(host);
  const lost = (event: Event) => {
    event.preventDefault();
    playing = false;
    cancelAnimationFrame(frame);
    frame = 0;
    shader.setSpeed(0);
    onFailure();
  };
  shader.canvasElement.addEventListener("webglcontextlost", lost);
  section.addEventListener("pointermove", move, { passive: true });
  section.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", visibility);
  return {
    setMotion(value) {
      playing = value;
      shader.setSpeed(value ? 0.12 : 0);
      if (!value) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setTheme(dark) {
      shader.setUniforms(palette(dark));
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      shader.canvasElement.removeEventListener("webglcontextlost", lost);
      shader.dispose();
    },
  };
}
