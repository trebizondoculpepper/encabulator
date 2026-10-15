import { describe, expect, it } from 'vitest';
import {
  DEV_ROOMS,
  HALL,
  STATION_ROOMS,
  devPortals,
  devWalls,
} from './dev-room-links';
import { slide } from './walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('development rooms', () => {
  it('link each room to its neighbours, both ways, and to the hall', () => {
    for (const [i, id] of STATION_ROOMS.entries()) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      for (const next of [STATION_ROOMS[i - 1], STATION_ROOMS[i + 1]].filter(
        Boolean,
      )) {
        expect(to).toContain(next);
        expect(devPortals(next, bounds, 1).map((p) => p.to)).toContain(id);
      }
      expect(to).toContain(HALL);
    }
  });

  it('leaves the hall to its door station, with no wall portals', () => {
    expect(devPortals(HALL, bounds, 1)).toEqual([]);
    expect(STATION_ROOMS).not.toContain(HALL);
    expect(STATION_ROOMS.length).toBe(DEV_ROOMS.length - 1);
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
