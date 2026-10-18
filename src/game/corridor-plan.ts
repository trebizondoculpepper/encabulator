import type { Footprint } from '../toolkit/controls/logic/walk-collision';

/** Metre-grid floor plan of the photographed service-corridor language. */
export const CORRIDOR_BOUNDS: Footprint = {
  minX: -16,
  maxX: 16,
  minZ: -12,
  maxZ: 12,
};

export const CORRIDOR_ZONES = [
  // A six-leg dogleg from the south-west entrance to the north-west exit.
  { name: 'entry', minX: -16, maxX: -7, minZ: 9, maxZ: 12 },
  { name: 'south turn', minX: -10, maxX: -7, minZ: 2, maxZ: 12 },
  { name: 'long south corridor', minX: -10, maxX: 10, minZ: 2, maxZ: 5 },
  { name: 'east turn', minX: 7, maxX: 10, minZ: -5, maxZ: 5 },
  { name: 'long north corridor', minX: -10, maxX: 10, minZ: -5, maxZ: -2 },
  { name: 'north turn', minX: -10, maxX: -7, minZ: -12, maxZ: -2 },
  { name: 'hall exit', minX: -16, maxX: -7, minZ: -12, maxZ: -8 },
  // Doorway throats and small industrial spaces branching from the route.
  { name: 'locker doorway', minX: -4, maxX: -2, minZ: 5, maxZ: 6 },
  { name: 'lockers', minX: -6, maxX: 0, minZ: 6, maxZ: 10 },
  { name: 'bins doorway', minX: 0, maxX: 2, minZ: 5, maxZ: 6 },
  { name: 'service bay', minX: -1, maxX: 5, minZ: 6, maxZ: 10 },
  { name: 'plant doorway', minX: 10, maxX: 11, minZ: -1, maxZ: 1 },
  { name: 'plant room', minX: 11, maxX: 15, minZ: -3, maxZ: 3 },
  { name: 'lift doorway', minX: -3, maxX: -1, minZ: -6, maxZ: -5 },
  { name: 'lift lobby', minX: -5, maxX: 2, minZ: -11, maxZ: -6 },
] as const;

export type CorridorZone = (typeof CORRIDOR_ZONES)[number]['name'];

export function isCorridorFloor(x: number, z: number) {
  return CORRIDOR_ZONES.some(
    (zone) =>
      x >= zone.minX && x < zone.maxX && z >= zone.minZ && z < zone.maxZ,
  );
}

export interface CorridorWall {
  axis: 'x' | 'z';
  position: number;
  start: number;
  end: number;
}

/** Merge the exposed grid edges into long, cheap wall meshes. */
export function corridorWalls(): CorridorWall[] {
  const edges: CorridorWall[] = [];
  for (let x = CORRIDOR_BOUNDS.minX; x < CORRIDOR_BOUNDS.maxX; x++)
    for (let z = CORRIDOR_BOUNDS.minZ; z < CORRIDOR_BOUNDS.maxZ; z++) {
      if (!isCorridorFloor(x + 0.5, z + 0.5)) continue;
      if (x > CORRIDOR_BOUNDS.minX && !isCorridorFloor(x - 0.5, z + 0.5))
        edges.push({ axis: 'x', position: x, start: z, end: z + 1 });
      if (x + 1 < CORRIDOR_BOUNDS.maxX && !isCorridorFloor(x + 1.5, z + 0.5))
        edges.push({ axis: 'x', position: x + 1, start: z, end: z + 1 });
      if (z > CORRIDOR_BOUNDS.minZ && !isCorridorFloor(x + 0.5, z - 0.5))
        edges.push({ axis: 'z', position: z, start: x, end: x + 1 });
      if (z + 1 < CORRIDOR_BOUNDS.maxZ && !isCorridorFloor(x + 0.5, z + 1.5))
        edges.push({ axis: 'z', position: z + 1, start: x, end: x + 1 });
    }
  edges.sort(
    (a, b) =>
      a.axis.localeCompare(b.axis) ||
      a.position - b.position ||
      a.start - b.start,
  );
  const runs: CorridorWall[] = [];
  for (const edge of edges) {
    const last = runs.at(-1);
    if (
      last &&
      last.axis === edge.axis &&
      last.position === edge.position &&
      last.end === edge.start
    )
      last.end = edge.end;
    else runs.push({ ...edge });
  }
  return runs;
}
