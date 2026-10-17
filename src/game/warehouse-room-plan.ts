import type { Footprint } from './walk-collision';

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
