/** One normalized outline drives the GPU sculpture and the no-WebGL SVG. */
type FlameContour = {
  start: readonly [number, number];
  curves: readonly (readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ])[];
};
export const flameOutline: FlameContour = {
  start: [0.05, 1.35],
  curves: [
    [0.75, 0.95, 1, 0.35, 0.92, -0.25],
    [0.84, -0.94, 0.34, -1.17, -0.11, -1.13],
    [-0.76, -1.1, -1.05, -0.56, -0.84, 0.04],
    [-0.76, 0.28, -0.6, 0.44, -0.46, 0.64],
    [-0.45, 0.25, -0.26, 0.1, -0.18, 0.05],
    [-0.39, 0.67, 0.13, 0.8, 0.05, 1.35],
  ],
};
export const flameHeart: FlameContour = {
  start: [0.06, -0.77],
  curves: [
    [-0.34, -0.76, -0.43, -0.39, -0.21, -0.1],
    [-0.03, 0.13, 0.07, 0.32, 0.04, 0.5],
    [0.25, 0.29, 0.52, -0.05, 0.44, -0.36],
    [0.4, -0.64, 0.23, -0.8, 0.06, -0.77],
  ],
};
export const flameSvgPath = (shape: FlameContour) =>
  `M${shape.start.join(" ")} ${shape.curves.map((curve) => "C" + curve.join(" ")).join(" ")}Z`;
