import { describe, expect, it } from 'vitest';
import { devDoors, devWallPieces } from './dev-room-links';
import { overlaps, slide } from './walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('development wing', () => {
  it('connects every neighbour in both directions', () => {
    expect(devDoors('dev0', bounds, 1).map((door) => door.to)).toEqual([
      'dev1',
    ]);
    expect(devDoors('dev1', bounds, 1).map((door) => door.to)).toEqual([
      'dev0',
      'dev2',
    ]);
    expect(devDoors('dev2', bounds, 1).map((door) => door.to)).toEqual([
      'dev1',
    ]);
  });
  it('has walkable openings with solid adjacent masonry and an overhead lintel', () => {
    const doors = devDoors('dev1', bounds, 1);
    const walls = devWallPieces(bounds, doors, 1, 3.2);
    const solids = walls.filter((wall) => wall.bottom === 0);
    const [west] = doors;
    expect(slide(solids, -4, west.z, -2, 0, 0.25).x).toBeCloseTo(-6);
    expect(slide(solids, -4, west.z - 1, -2, 0, 0.25).x).toBeGreaterThan(-5);
    const lintel = walls.find(
      (wall) => wall.bottom === 2.2 && overlaps(wall, west.x, west.z, 0),
    );
    expect(lintel?.top).toBe(3.2);
  });
});
