/**
 * The Encabulator's dimensionality: how many dimensions it has achieved,
 * from none to six, as its startup conditions are met one after another.
 * The ENCABULATOR SYSTEMS display draws it (`src/scene/dimensionality-picture.ts`);
 * other equipment reads the achieved value from the world graph.
 */

export const STAGE_NAMES = [
  'NONE',
  'LINE',
  'SQUARE',
  'CUBE',
  'TESSERACT',
  'PENTERACT',
  'HEXERACT',
] as const;

export const MAX_DIMENSION = STAGE_NAMES.length - 1;

/** Seconds to build each new dimension once its conditions are met. */
export const BUILD_SECONDS = 4;
/** Dimensions lost a second when a condition goes. */
export const COLLAPSE_RATE = 2;

/**
 * What each stage needs, in order; each needs every one before it too.
 * 1: the Encabulator Control unit powered and its controller booted.
 * 2: Automation Control running.
 * 3: the main drive at 40 % speed or more, with lube oil pressure.
 * 4: the phase reference locked, measured through the analogue card, and
 *    the control section cool enough.
 * 5: hydrocoptic flow established and the panendermic fan at 2 inWC or more.
 * 6: the reciprocating dingle arm stroking.
 */
export interface DimensionConditions {
  control: boolean;
  automation: boolean;
  drive: boolean;
  phase: boolean;
  flow: boolean;
  arm: boolean;
}

export const DIMENSION_CONDITIONS: readonly (keyof DimensionConditions)[] = [
  'control',
  'automation',
  'drive',
  'phase',
  'flow',
  'arm',
];

/** The highest dimension these conditions allow. */
export function allowedDimension(conditions: DimensionConditions) {
  let n = 0;
  for (const key of DIMENSION_CONDITIONS) {
    if (!conditions[key]) break;
    n++;
  }
  return n;
}

/**
 * Progress towards `allowed`, a dimension every `BUILD_SECONDS` going up,
 * `COLLAPSE_RATE` a second coming down; without the control unit (`allowed`
 * 0 and no supply) it is lost at once.
 */
export function stepDimension(
  progress: number,
  allowed: number,
  dt: number,
  supplied = true,
) {
  if (!supplied) return 0;
  if (progress < allowed)
    return Math.min(allowed, progress + dt / BUILD_SECONDS);
  return Math.max(allowed, progress - dt * COLLAPSE_RATE);
}

/** The dimension achieved so far: a stage is achieved once fully built. */
export const achievedDimension = (progress: number) =>
  Math.floor(progress + 1e-9);

/** An n-cube: its 2^n corners, each ±1, and its edges between neighbours. */
export function hypercube(n: number) {
  const vertices: number[][] = [];
  for (let i = 0; i < 2 ** n; i++)
    vertices.push(
      Array.from({ length: n }, (_, axis) => ((i >> axis) & 1 ? 1 : -1)),
    );
  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++)
    for (let axis = 0; axis < n; axis++) {
      const j = i ^ (1 << axis);
      if (j > i) edges.push([i, j]);
    }
  return { vertices, edges };
}

/**
 * The stage being built, projected flat: the cube of the dimension being
 * built, its newest axis grown by how far it has got, turned in a few
 * planes at once and seen in perspective from each dimension down to the
 * plane. Returns its edges' ends, in roughly -1 to 1.
 */
export function projectStage(progress: number, seconds: number) {
  const whole = achievedDimension(progress);
  const growing = Math.min(MAX_DIMENSION, whole + 1);
  const grown = whole >= MAX_DIMENSION ? 1 : progress - whole;
  const n = Math.max(1, grown > 0.001 ? growing : whole);
  const { vertices, edges } = hypercube(n);
  const points = vertices.map((corner) => {
    const v = corner.map((c, axis) =>
      axis === n - 1 && n > whole ? c * grown : c,
    );
    // Turn it in the plane of each axis with the next, at its own rate.
    for (let axis = 0; axis + 1 < n; axis++) {
      const angle = seconds * (0.21 + axis * 0.13) + axis;
      const [a, b] = [v[axis], v[axis + 1]];
      v[axis] = a * Math.cos(angle) - b * Math.sin(angle);
      v[axis + 1] = a * Math.sin(angle) + b * Math.cos(angle);
    }
    // In perspective, one dimension at a time, from far enough away that
    // nothing comes round behind the eye.
    for (let k = n; k > 2; k--) {
      const distance = 2.5 * Math.sqrt(k);
      const scale = distance / (distance - v[k - 1]);
      for (let axis = 0; axis < k - 1; axis++) v[axis] *= scale;
    }
    return [v[0] ?? 0, v[1] ?? 0] as const;
  });
  // Fit it to the screen, whatever its dimension.
  const reach = Math.max(
    1e-6,
    ...points.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]),
  );
  const fitted = points.map(([x, y]) => [x / reach, y / reach] as const);
  return { n, edges: edges.map(([i, j]) => [fitted[i], fitted[j]] as const) };
}
