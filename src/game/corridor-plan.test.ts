import { describe, expect, it } from 'vite-plus/test';
import {
  CORRIDOR_BOUNDS,
  CORRIDOR_ZONES,
  corridorWalls,
  isCorridorFloor,
} from './corridor-plan';

describe('underground corridor plan', () => {
  it('joins the south-west entrance, both doglegs, industrial rooms and Hall exit', () => {
    const key = (x: number, z: number) => `${x},${z}`;
    const start: [number, number] = [-16, 10];
    const reached = new Set([key(...start)]);
    const queue = [start];
    while (queue.length) {
      const [x, z] = queue.shift()!;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const nz = z + dz;
        const id = key(nx, nz);
        if (
          nx < CORRIDOR_BOUNDS.minX ||
          nx >= CORRIDOR_BOUNDS.maxX ||
          nz < CORRIDOR_BOUNDS.minZ ||
          nz >= CORRIDOR_BOUNDS.maxZ ||
          reached.has(id) ||
          !isCorridorFloor(nx + 0.5, nz + 0.5)
        )
          continue;
        reached.add(id);
        queue.push([nx, nz]);
      }
    }
    for (const zone of CORRIDOR_ZONES)
      expect(reached.has(key(zone.minX, zone.minZ)), zone.name).toBe(true);
    expect(reached.has(key(-16, -10))).toBe(true);
  });

  it('produces merged solid wall runs around the route', () => {
    const walls = corridorWalls();
    expect(walls.length).toBeGreaterThan(20);
    expect(walls.some((w) => w.end - w.start > 5)).toBe(true);
    expect(walls.every((w) => w.end > w.start)).toBe(true);
  });
});
