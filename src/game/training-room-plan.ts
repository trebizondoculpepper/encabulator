import type { Footprint } from './walk-collision';

/**
 * The training room: a large, empty meeting room on the ground floor of
 * an English business-park office, at the building's south-east corner.
 * Windows run along the south and east walls, with a fire exit in the east
 * glazing; the door to the rest of the building is in the north wall.
 * Everything is in metres, on the floor at y = 0, and the ceiling and
 * floor are on a 600 mm grid, so every fitting sits in a whole tile.
 */
export const TRAINING_BOUNDS: Footprint = {
  minX: -7.2,
  maxX: 7.2,
  minZ: -4.8,
  maxZ: 4.8,
};

/** The suspended ceiling's height, and its (and the floor's) tile, m. */
export const CEILING = 2.7;
export const TILE = 0.6;
/** The window band: sill and head heights, and the mullion pitch, m. */
export const SILL = 0.85;
export const HEAD = 2.45;
export const BAY = 1.2;
/** Where the door to the building stands, from the west wall, m. */
export const ROOM_DOOR_FROM_WEST = 2.1;
/** The fire exit: a glazed door in the east wall, filling one bay. */
export const FIRE_EXIT = { z: 1.8, width: 1.0, height: 2.1 };

/** Centre of tile `i` along an axis that starts at `min`. */
const tile = (min: number, i: number) => min + TILE * (i + 0.5);
/** The tile index whose centre is `v`, or NaN if `v` is not a centre. */
export function tileIndex(min: number, v: number) {
  const i = (v - min) / TILE - 0.5;
  return Math.abs(i - Math.round(i)) < 1e-6 ? Math.round(i) : Number.NaN;
}

const grid = (xs: number[], zs: number[]) =>
  xs.flatMap((x) => zs.map((z) => ({ x, z })));

/** The recessed 600 × 600 fluorescent fittings: six by four. */
export const LIGHTS = grid(
  [-5.7, -3.3, -0.9, 0.9, 3.3, 5.7],
  [-3.3, -0.9, 0.9, 3.3],
);
/** The four-way air-conditioning cassettes. */
export const CASSETTES = grid([-2.1, 2.1], [0.3]);
/** Ceiling odds and ends, each in a tile of its own. */
export const SMOKE_DETECTORS = [
  { x: -4.5, z: -2.1 },
  { x: 0.3, z: 2.1 },
  { x: 4.5, z: -2.1 },
];
export const MOTION_SENSORS = [
  { x: -2.7, z: -2.1 },
  { x: 2.7, z: 2.1 },
];
/** Emergency lights: by the fire exit, by the door and in the middle. */
export const EMERGENCY_LIGHTS = [
  { x: 6.3, z: 2.1 },
  { x: -5.1, z: -3.9 },
  { x: 0.3, z: -0.3 },
];
export const SPEAKERS = [
  { x: -4.5, z: 2.1 },
  { x: 4.5, z: 2.1 },
];

/** Flip-lid floor boxes, flush in the raised floor, all shut. */
export const FLOOR_BOXES = grid([-4.5, -0.9, 2.7], [-1.5, 1.5]);

/** Every ceiling fitting, for checking that none share a tile. */
export function ceilingFittings() {
  return [
    ...LIGHTS,
    ...CASSETTES,
    ...SMOKE_DETECTORS,
    ...MOTION_SENSORS,
    ...SPEAKERS,
    ...EMERGENCY_LIGHTS,
  ];
}

/** The window bays along a wall `length` long, as [start, end] pairs. */
export function bays(min: number, max: number) {
  const out: [number, number][] = [];
  for (let s = min; s < max - 1e-6; s += BAY) out.push([s, s + BAY]);
  return out;
}

/** True if the bay [start, end] on the east wall holds the fire exit. */
export const isFireExitBay = ([start, end]: [number, number]) =>
  FIRE_EXIT.z > start && FIRE_EXIT.z < end;

export { tile };
