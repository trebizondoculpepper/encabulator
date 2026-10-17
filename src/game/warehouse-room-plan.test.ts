import { describe, expect, it } from 'vite-plus/test';
import {
  WAREHOUSE_BOUNDS,
  WAREHOUSE_ROOF,
  WAREHOUSE_SKYLIGHTS,
  WAREHOUSE_TRUSSES,
  WAREHOUSE_UTILITIES,
} from './warehouse-room-plan';
import { devPortals } from './dev-room-links';

describe('the warehouse training shell', () => {
  it('keeps ten rooflights between the trusses and inside the thirty-metre room', () => {
    const b = WAREHOUSE_BOUNDS;
    expect(b.maxX - b.minX).toBe(30);
    expect(b.maxZ - b.minZ).toBe(30);
    expect(WAREHOUSE_ROOF).toBeGreaterThan(7);
    expect(WAREHOUSE_SKYLIGHTS).toHaveLength(10);
    for (const light of WAREHOUSE_SKYLIGHTS) {
      expect(light.x - light.width / 2).toBeGreaterThan(b.minX);
      expect(light.x + light.width / 2).toBeLessThan(b.maxX);
      expect(light.z - light.depth / 2).toBeGreaterThan(b.minZ);
      expect(light.z + light.depth / 2).toBeLessThan(b.maxZ);
      expect(
        WAREHOUSE_TRUSSES.every((z) => Math.abs(z - light.z) > light.depth / 2),
      ).toBe(true);
    }
  });
  it('provides opposing pedestrian escape routes and leaves the utility doorway faces clear', () => {
    const portals = devPortals('dev17', WAREHOUSE_BOUNDS, 1);
    expect(portals.map((p) => p.to)).toEqual(['dev16', 'rhombus']);
    expect(portals.map((p) => p.side)).toEqual(['west', 'east']);
    expect(WAREHOUSE_UTILITIES.map((d) => d.label)).toEqual([
      'TOILETS',
      'ACCESSIBLE WC',
      'FIRST AID',
      'BUILDING SERVICES',
    ]);
    for (let i = 1; i < WAREHOUSE_UTILITIES.length; i++)
      expect(
        WAREHOUSE_UTILITIES[i].x - WAREHOUSE_UTILITIES[i - 1].x,
      ).toBeGreaterThan(1.3);
  });
});
