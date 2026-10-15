import { describe, expect, it } from 'vitest';
import { DEV_ROOMS, devPortals, devWalls } from './dev-room-links';
import { slide } from './walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('development rooms', () => {
  it('link each room to its neighbours, both ways', () => {
    for (const [i, id] of DEV_ROOMS.entries()) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      expect(to).toEqual([DEV_ROOMS[i - 1], DEV_ROOMS[i + 1]].filter(Boolean));
      for (const next of to)
        expect(devPortals(next, bounds, 1).map((p) => p.to)).toContain(id);
    }
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
