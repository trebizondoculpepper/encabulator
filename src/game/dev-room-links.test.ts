import { describe, expect, it } from 'vite-plus/test';
import {
  DEV_ROOMS,
  ROOMS,
  HALL,
  STATION_ROOMS,
  devPortals,
  devWalls,
  resolveRoomId,
} from './dev-room-links';
import { slide } from './walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('development rooms', () => {
  it('link each room to its neighbours, both ways, and to the hall', () => {
    for (const [i, id] of DEV_ROOMS.entries()) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      for (const next of [DEV_ROOMS[i - 1], DEV_ROOMS[i + 1]].filter(
        (room) => room,
      )) {
        expect(to).toContain(next);
        expect(devPortals(next, bounds, 1).map((p) => p.to)).toContain(id);
      }
      expect(to).toContain(HALL);
    }
    expect(devPortals('rhombus', bounds, 1)).toEqual([
      { to: HALL, side: 'east', x: bounds.maxX, z: 0 },
    ]);
  });

  it('leaves the hall to its door station, with no wall portals', () => {
    expect(devPortals(HALL, bounds, 1)).toEqual([]);
    expect(STATION_ROOMS).not.toContain(HALL);
    expect(STATION_ROOMS.length).toBe(ROOMS.length - 1);
    expect(DEV_ROOMS).not.toContain('rhombus');
    expect(DEV_ROOMS).not.toContain(HALL);
    expect(DEV_ROOMS).not.toContain('dev4');
    expect(DEV_ROOMS).not.toContain('dev5');
  });

  it('keeps the old Hall and rhombus URLs as aliases', () => {
    expect(resolveRoomId('dev4')).toBe('hall');
    expect(resolveRoomId('dev5')).toBe('rhombus');
    expect(resolveRoomId('hall')).toBe('hall');
    expect(resolveRoomId('rhombus')).toBe('rhombus');
    expect(resolveRoomId('unknown')).toBeUndefined();
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
