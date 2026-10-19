import type { EmergencyFitting } from '../toolkit/components/general-safety/logic/emergency-lighting';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';

/** The empty Guildford workshop shell, independent of the Level 2 scenario. */
export const WAREHOUSE_BOUNDS: Footprint = {
  minX: -15,
  maxX: 15,
  minZ: -15,
  maxZ: 15,
};
export const WAREHOUSE_ROOF = 7.2;
export const WAREHOUSE_TRUSSES = [-15, -9, -3, 3, 9, 15];
export const WAREHOUSE_SKYLIGHTS = [-12, -6, 0, 6, 12].flatMap((z) =>
  [-6, 6].map((x) => ({ x, z, width: 2.2, depth: 3.6 })),
);
export const WAREHOUSE_UTILITIES = [
  { x: -8.4, label: 'TOILETS' },
  { x: -4.8, label: 'ACCESSIBLE WC' },
  { x: -1.2, label: 'FIRST AID' },
  { x: 5.4, label: 'BUILDING SERVICES' },
];

/** An emergency fitting in the warehouse, in its own frame (metres). */
export interface WarehouseEmergency extends EmergencyFitting {
  kind: 'downlight' | 'bulkhead';
  /** A bulkhead's wall. */
  wall?: 'west' | 'east';
}

/** Where the emergency downlights are: 3.7 m in from the walls and between. */
const EMERGENCY_GRID = [-11.3, -3.75, 3.75, 11.3];
/** The two personnel doors (entrance west, fire exit east), along the walls. */
export const WAREHOUSE_EXITS = [
  { wall: 'west' as const, x: -15, z: 13.9 },
  { wall: 'east' as const, x: 15, z: 13.9 },
];
/** The fire points beside them: call point, extinguishers. */
export const WAREHOUSE_FIRE_POINTS = [-14.8, 14.8].map((x) => ({ x, z: 12.5 }));

/**
 * The warehouse's emergency lighting, to BS 5266-1, after Thorn's spacing
 * guide for its 7.2 m roof (`doc/research/emergency-lighting-parts.md`):
 * self-contained downlights on the roof steel at 7 m in a 4 × 4 grid, the
 * high-ceiling lens (235 lm, thrown wide) round the outside and the
 * open-area lens (270 lm) in the middle four; a bulkhead over each
 * personnel door (200 lm), which lights the fire point beside it too; and
 * the downlight on each fire point's bracket at 3.2 m.
 */
export const WAREHOUSE_EMERGENCY: readonly WarehouseEmergency[] = [
  ...EMERGENCY_GRID.flatMap((x) =>
    EMERGENCY_GRID.map((z) => {
      const inner = Math.abs(x) < 5 && Math.abs(z) < 5;
      return {
        kind: 'downlight' as const,
        x,
        z,
        height: 7,
        lumens: inner ? 270 : 235,
        spread: inner ? 0.6 : 0,
      };
    }),
  ),
  ...WAREHOUSE_EXITS.map(({ wall, x, z }) => ({
    kind: 'bulkhead' as const,
    wall,
    x: x - Math.sign(x) * 0.3,
    z,
    height: 2.75,
    lumens: 200,
    spread: 1,
  })),
  ...WAREHOUSE_FIRE_POINTS.map(({ x, z }) => ({
    kind: 'downlight' as const,
    x: x - Math.sign(x) * 0.3,
    z,
    height: 3.2,
    lumens: 235,
    spread: 0,
  })),
];

/** Where BS 5266 wants an emergency light close by, and 5 lux at the fire points. */
export const WAREHOUSE_EMPHASIS = [
  ...WAREHOUSE_EXITS.map(({ wall, x, z }) => ({
    name: `${wall} exit door`,
    x,
    z,
  })),
  ...WAREHOUSE_FIRE_POINTS.map(({ x, z }) => ({
    name: `fire point at x ${x}`,
    x,
    z,
    equipment: true,
  })),
];
