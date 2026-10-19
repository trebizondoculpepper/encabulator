import { describe, expect, it } from 'vite-plus/test';
import {
  CHAIN,
  DEV_ROOMS,
  ROOMS,
  devPortals,
  devWalls,
  resolveRoomId,
} from './dev-room-links';
import { slide } from '../../controls/logic/walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('the rooms', () => {
  it('lead every room in the chain back to dev_corridor, its hub', () => {
    for (const id of CHAIN) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      expect(to).toEqual(id === 'dev_corridor' ? [] : ['dev_corridor']);
    }
  });

  it('give the training room and the Rhombus their own doors back', () => {
    expect(CHAIN[0]).toBe('training');
    expect(CHAIN.at(-1)).toBe('rhombus');
    expect(devPortals('training', bounds, 1)).toEqual([
      {
        to: 'dev_corridor',
        side: 'north',
        x: bounds.minX + 2.1,
        z: bounds.minZ,
      },
    ]);
    expect(devPortals('rhombus', bounds, 1)).toEqual([
      { to: 'dev_corridor', side: 'east', x: bounds.maxX, z: 0 },
    ]);
  });

  it('leave the Hall out: no portals lead to it or from it', () => {
    expect(CHAIN).not.toContain('hall');
    expect(devPortals('hall', bounds, 1)).toEqual([]);
    for (const id of ROOMS)
      expect(devPortals(id, bounds, 1).map((p) => p.to)).not.toContain('hall');
    expect(DEV_ROOMS).not.toContain('rhombus');
    expect(DEV_ROOMS).not.toContain('level2');
    expect(CHAIN).not.toContain('level2');
    expect(resolveRoomId('level2')).toBe('level2');
    expect(resolveRoomId('level0')).toBe('level0');
    expect(DEV_ROOMS).not.toContain('level0');
    expect(devPortals('level2', bounds, 1)).toEqual([]);
  });

  it('keeps the old rhombus URL as an alias, and dev4 is a room again', () => {
    expect(resolveRoomId('dev4')).toBe('dev4');
    expect(resolveRoomId('dev5')).toBe('rhombus');
    expect(resolveRoomId('retro-computing')).toBe('dev19');
    expect(resolveRoomId('hall')).toBe('hall');
    expect(resolveRoomId('rhombus')).toBe('rhombus');
    expect(resolveRoomId('training')).toBe('training');
    expect(resolveRoomId('unknown')).toBeUndefined();
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
