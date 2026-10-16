import { createGraph } from './world/graph';

/**
 * Dev9's wandering button: a push button on a mobile floor stand (four
 * swivel castors) that a three-position knob on the wall puts into one of
 * three moods.
 *
 * - **Normal**: it stays put, going back to its spot in the middle of the
 *   room if it has wandered.
 * - **Eager**: it wants to be pressed. Whichever way the player looks, it
 *   creeps (a quarter of walking speed) to the spot on the floor that puts
 *   its red button nearest the middle of the player's view, never closer
 *   than a comfortable pressing distance, and turns to face them.
 * - **Skittish**: it does not want to be pressed. When the player comes
 *   near it moves away, always a little faster than they are moving
 *   (walking or running), choosing the way that keeps it furthest from
 *   them and clear of the walls, so it can only be caught in a corner.
 *
 * Everything here is in metres on the floor plan; the stand is a disc of
 * `STAND_RADIUS` on the floor, its button `BUTTON_HEIGHT` up.
 */

export type PedestalMode = 'normal' | 'eager' | 'skittish';
export const PEDESTAL_MODES: readonly PedestalMode[] = [
  'normal',
  'eager',
  'skittish',
];

export const BUTTON_HEIGHT = 1.05;
export const STAND_RADIUS = 0.3;
/** Eager and normal: a quarter of walking speed, m/s. */
export const CREEP_SPEED = 0.5;
/** Eager: the nearest it comes to the player, and the furthest it goes. */
export const PRESSING_DISTANCE = 0.8;
export const FURTHEST = 6;
/** Skittish: how near the player may come before it moves away. */
export const FLEE_RADIUS = 2.5;
/** Skittish: how much faster than the player it moves. */
export const FLEE_MARGIN = 1.12;
/** Skittish: its least speed while it flees, m/s. */
export const FLEE_MIN_SPEED = 0.6;
/** How close to a wall its centre may come. */
export const WALL_MARGIN = STAND_RADIUS + 0.1;

export interface Floor {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Viewer {
  /** The eye, metres. */
  x: number;
  y: number;
  z: number;
  /** Where it looks: a unit vector. */
  dx: number;
  dy: number;
  dz: number;
  /** How fast the player is moving over the floor, m/s. */
  speed: number;
}

export interface Stand {
  x: number;
  z: number;
  /** Which way its button faces, radians (0 faces −z, as the walker's yaw). */
  heading: number;
}

const clampTo = (floor: Floor, x: number, z: number) => ({
  x: Math.min(floor.maxX - WALL_MARGIN, Math.max(floor.minX + WALL_MARGIN, x)),
  z: Math.min(floor.maxZ - WALL_MARGIN, Math.max(floor.minZ + WALL_MARGIN, z)),
});

/**
 * Eager: the floor spot that puts the button nearest the middle of the
 * viewer's view. Along the view's direction over the floor, the button is
 * dead centre where the line of sight comes down to the button's height;
 * looking level or up, the further the better, up to `FURTHEST` and the
 * walls; looking straight down, as near as `PRESSING_DISTANCE` allows.
 */
export function eagerTarget(viewer: Viewer, floor: Floor) {
  const flat = Math.hypot(viewer.dx, viewer.dz);
  const ux = flat > 1e-6 ? viewer.dx / flat : 0;
  const uz = flat > 1e-6 ? viewer.dz / flat : -1;
  let distance = FURTHEST;
  if (viewer.dy < 0) {
    const drop = viewer.y - BUTTON_HEIGHT;
    distance = drop > 0 ? (drop / -viewer.dy) * flat : PRESSING_DISTANCE;
  }
  distance = Math.min(FURTHEST, Math.max(PRESSING_DISTANCE, distance));
  // Not through a wall: as far as the floor goes that way.
  const reach = (along: number, at: number, min: number, max: number) =>
    along > 1e-6
      ? (max - WALL_MARGIN - at) / along
      : along < -1e-6
        ? (min + WALL_MARGIN - at) / along
        : Infinity;
  distance = Math.min(
    distance,
    reach(ux, viewer.x, floor.minX, floor.maxX),
    reach(uz, viewer.z, floor.minZ, floor.maxZ),
  );
  distance = Math.max(PRESSING_DISTANCE, distance);
  return clampTo(floor, viewer.x + ux * distance, viewer.z + uz * distance);
}

/** The heading that faces from (x, z) towards (tx, tz). */
export const facing = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(tx - x, -(tz - z));

/** Turn `from` towards `to` by at most `step` radians. */
function turn(from: number, to: number, step: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-step, Math.min(step, d));
}

/** Move (x, z) towards (tx, tz) at `speed` for `dt` seconds. */
function towards(
  x: number,
  z: number,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
) {
  const dx = tx - x;
  const dz = tz - z;
  const gap = Math.hypot(dx, dz);
  const step = Math.min(gap, speed * dt);
  return gap > 1e-6
    ? { x: x + (dx / gap) * step, z: z + (dz / gap) * step, moved: step }
    : { x, z, moved: 0 };
}

/**
 * Skittish: where to go to get away from the viewer: of sixteen ways, the
 * one whose next step leaves it furthest from them, less a penalty for
 * coming near a wall, so in a corner it slides along a wall rather than
 * pressing into it.
 */
export function fleeStep(
  stand: Stand,
  viewer: Viewer,
  floor: Floor,
  speed: number,
  dt: number,
) {
  let best = { x: stand.x, z: stand.z, score: -Infinity };
  const step = speed * dt;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const next = clampTo(
      floor,
      stand.x + Math.sin(a) * step,
      stand.z - Math.cos(a) * step,
    );
    const away = Math.hypot(next.x - viewer.x, next.z - viewer.z);
    const wall = Math.min(
      next.x - floor.minX,
      floor.maxX - next.x,
      next.z - floor.minZ,
      floor.maxZ - next.z,
    );
    const score = away - Math.max(0, 1.5 - wall) * 0.8;
    if (score > best.score) best = { ...next, score };
  }
  return { x: best.x, z: best.z };
}

/**
 * One step of the stand's behaviour in `mode`, for `dt` seconds: where it
 * goes, which way it turns, and how fast it moved (for its castors and
 * their sound).
 */
export function stepStand(
  stand: Stand,
  mode: PedestalMode,
  viewer: Viewer,
  floor: Floor,
  home: { x: number; z: number },
  dt: number,
): Stand & { speed: number } {
  const near = Math.hypot(stand.x - viewer.x, stand.z - viewer.z);
  let next = { x: stand.x, z: stand.z, moved: 0 };
  let heading = stand.heading;
  if (mode === 'normal') {
    next = towards(stand.x, stand.z, home.x, home.z, CREEP_SPEED, dt);
  } else if (mode === 'eager') {
    const target = eagerTarget(viewer, floor);
    next = towards(stand.x, stand.z, target.x, target.z, CREEP_SPEED, dt);
    heading = turn(
      heading,
      facing(next.x, next.z, viewer.x, viewer.z),
      dt * 1.5,
    );
  } else if (near < FLEE_RADIUS) {
    const speed = Math.max(FLEE_MIN_SPEED, viewer.speed * FLEE_MARGIN);
    const to = fleeStep(stand, viewer, floor, speed, dt);
    next = { ...to, moved: Math.hypot(to.x - stand.x, to.z - stand.z) };
    // It turns its button away from the player.
    heading = turn(heading, facing(viewer.x, viewer.z, next.x, next.z), dt * 3);
  }
  // Never into the player.
  const gap = Math.hypot(next.x - viewer.x, next.z - viewer.z);
  const least = STAND_RADIUS + 0.3;
  if (gap < least && gap > 1e-6) {
    next.x = viewer.x + ((next.x - viewer.x) / gap) * least;
    next.z = viewer.z + ((next.z - viewer.z) / gap) * least;
  }
  const at = clampTo(floor, next.x, next.z);
  return {
    x: at.x,
    z: at.z,
    heading,
    speed: dt > 0 ? Math.hypot(at.x - stand.x, at.z - stand.z) / dt : 0,
  };
}

/**
 * Dev9's world model: the mode knob, the button and the lamp that shows
 * it was pressed.
 */
export function createWanderingButton() {
  const g = createGraph();
  const mode = g.input<number>('pedestal.mode', 0, { where: 'mode knob' });
  const pressedFor = g.state('pedestal.pressedFor', 0);
  const indicator = g.output('pedestal.indicator', [pressedFor], (t) => t > 0, {
    where: 'PRESSED lamp',
  });
  const moodOf = g.output(
    'pedestal.mood',
    [mode],
    (m): PedestalMode => PEDESTAL_MODES[m] ?? 'normal',
    { where: 'the stand' },
  );
  g.process('pedestal.lamp', [], [pressedFor], (dt) =>
    pressedFor.set(Math.max(0, pressedFor.peek() - dt)),
  );
  const press = g.action('pedestal.press', [], [pressedFor], () =>
    pressedFor.set(PRESSED_SECONDS),
  );
  return {
    g,
    mode,
    mood: moodOf,
    indicator,
    press,
    tick: (dt: number) => g.tick(dt),
  };
}

/** How long the PRESSED lamp stays lit after a press. */
export const PRESSED_SECONDS = 3;
