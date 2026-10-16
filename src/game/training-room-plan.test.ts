import { describe, expect, it } from 'vite-plus/test';
import {
  BAY,
  CEILING,
  FIRE_EXIT,
  FLOOR_BOXES,
  HEAD,
  LIGHTS,
  SILL,
  TILE,
  TRAINING_BOUNDS,
  bays,
  ceilingFittings,
  isFireExitBay,
  tileIndex,
} from './training-room-plan';

const { minX, maxX, minZ, maxZ } = TRAINING_BOUNDS;

describe('the training room plan', () => {
  it('is a whole number of 600 mm tiles and window bays each way', () => {
    for (const span of [maxX - minX, maxZ - minZ]) {
      expect(Number.isInteger(Math.round((span / TILE) * 1e6) / 1e6)).toBe(
        true,
      );
      expect(Number.isInteger(Math.round((span / BAY) * 1e6) / 1e6)).toBe(true);
    }
  });

  it('sits every ceiling fitting in a tile of its own', () => {
    const seen = new Set<string>();
    for (const { x, z } of ceilingFittings()) {
      const key = `${tileIndex(minX, x)},${tileIndex(minZ, z)}`;
      expect(key, `${x}, ${z}`).not.toContain('NaN');
      expect(seen.has(key), `${x}, ${z}`).toBe(false);
      seen.add(key);
    }
    expect(LIGHTS.length).toBe(24);
  });

  it('sits every floor box in a whole floor tile', () => {
    for (const { x, z } of FLOOR_BOXES) {
      expect(tileIndex(minX, x)).not.toBeNaN();
      expect(tileIndex(minZ, z)).not.toBeNaN();
    }
  });

  it('puts the fire exit in exactly one east-wall bay, under the head', () => {
    const exits = bays(minZ, maxZ).filter(isFireExitBay);
    expect(exits).toHaveLength(1);
    expect(FIRE_EXIT.width).toBeLessThan(BAY);
    expect(FIRE_EXIT.height).toBeLessThan(HEAD);
    expect(SILL).toBeLessThan(HEAD);
    expect(HEAD).toBeLessThan(CEILING);
  });
});
