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
// Keep Paper's cell rendering, adding a soft, local displacement in screen space.
// The cursor bends the cells themselves instead of moving a flat background image.
const interactiveVoronoi = voronoiFragmentShader
  .replace("precision mediump float;", "precision highp float;")
  // Shared vertex/fragment interfaces must retain identical precision on strict drivers.
  .replace("uniform float u_scale;", "uniform mediump float u_scale;")
  .replace("in vec2 v_patternUV;", "in mediump vec2 v_patternUV;")
  .replace("uniform float u_time;", `uniform float u_time;
uniform mediump vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointerStrength;`)
  .replace("float t = u_time;", `vec2 cursorDelta = gl_FragCoord.xy / u_resolution - u_pointer;
  cursorDelta.x *= u_resolution.x / u_resolution.y;
  float influence = exp(-dot(cursorDelta, cursorDelta) * 12.) * u_pointerStrength;
  shape_uv += cursorDelta * influence * 2.4;
  float t = u_time + influence * .9;`);

/** Paper's Voronoi shader, with scoped pointer deformation and bounded resolution. */
export async function mountFinaleScene(
  host: HTMLElement,
  onFailure: () => void,
): Promise<FinaleController> {
  const noise = getShaderNoiseTexture();
  if (noise) await noise.decode();
  const resolutionBudget = () => {
    const box = host.getBoundingClientRect();
    const pixels = Math.max(1, box.width * box.height),
      ratio = Math.min(2, Math.max(1.5, devicePixelRatio || 1));
    return Math.ceil(
      Math.max(pixels, Math.min(3500000, pixels * ratio * ratio)),
    );
  };
  let shader: ShaderMount;
  try {
    shader = new ShaderMount(
      host,
      interactiveVoronoi,
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
        u_pointer: [0.5, 0.5],
        u_pointerStrength: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      { alpha: true, antialias: false, powerPreference: "low-power" },
      0,
      68000,
      2 * Math.max(1, devicePixelRatio || 1),
      resolutionBudget(),
    );
    const gl = shader.canvasElement.getContext("webgl2");
    if (!gl?.getParameter(gl.CURRENT_PROGRAM)) {
      shader.dispose();
      throw new Error("Voronoi shader could not link on this GPU");
    }
  } catch (error) {
    host.replaceChildren();
    throw error;
  }
  shader.canvasElement.setAttribute("aria-hidden", "true");
  shader.canvasElement.dataset.renderer = "webgl";
  const section = host.closest("section")!,
    target = { x: 0.5, y: 0.5, strength: 0 },
    current = { ...target };
  let playing = true,
    disposed = false,
    frame = 0,
    last = performance.now(),
    inView = false,
    animationFrame = 68000;
  function tick(now: number) {
    frame = 0;
    if (disposed || !playing || !inView || document.hidden) return;
    const delta = now - last;
    if (delta >= 1000 / 30) {
      last = now;
      // A full cell cycle takes about eleven seconds. Cap long tab/GPU stalls,
      // but don't slow the experience to a crawl on a 15–30fps device.
      animationFrame += Math.min(delta, 200) * 0.55;
      const ease = 1 - Math.exp(-Math.min(delta, 200) / 110);
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) +
          Math.abs(target.strength - current.strength) > 0.0001) {
        current.x += (target.x - current.x) * ease;
        current.y += (target.y - current.y) * ease;
        current.strength += (target.strength - current.strength) * ease;
        shader.setUniforms({
          u_pointer: [current.x, current.y],
          u_pointerStrength: current.strength,
        });
      }
      shader.setFrame(animationFrame);
    }
    frame = requestAnimationFrame(tick);
  }
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = performance.now();
    if (!disposed && playing && inView && !document.hidden)
      frame = requestAnimationFrame(tick);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !playing) return;
    const box = section.getBoundingClientRect();
    target.x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    target.y = 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    target.strength = 1;
  };
  const leave = () => {
    target.strength = 0;
  };
  const visibility = () => sync();
  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0 },
  );
  observer.observe(host);
  // The pixel budget is the quality cap. A high floor also avoids fractional-DPR
  // observers (including browser zoom/emulation) undersampling the CSS surface.
  const quality = new ResizeObserver(() => {
    shader.setMinPixelRatio(2 * Math.max(1, devicePixelRatio || 1));
    shader.setMaxPixelCount(resolutionBudget());
  });
  quality.observe(host);
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
      sync();
    },
    setTheme(dark) {
      shader.setUniforms(palette(dark));
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      quality.disconnect();
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      shader.canvasElement.removeEventListener("webglcontextlost", lost);
      shader.dispose();
    },
  };
}
