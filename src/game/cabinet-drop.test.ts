import { describe, expect, it } from 'vite-plus/test';
import { ejectCabinetDrop } from './cabinet-drop';

const cabinet = { minX: -2, maxX: 2, back: -0.5, front: 0 };

describe('cabinet drop', () => {
  it('sends an interior release outward beyond the cabinet face', () => {
    const placed = ejectCabinetDrop(
      { x: 0, y: 0.2, z: -0.25, vx: 0.1, vz: -0.65 },
      cabinet,
    );
    expect(placed.z).toBeGreaterThan(cabinet.front + 0.12);
    expect(placed.vz).toBeGreaterThan(0);
    expect(placed.y).toBeGreaterThanOrEqual(0.35);
  });

  it('leaves ordinary floor drops outside the cabinet unchanged', () => {
    const floor = { x: 0, y: 0.8, z: 0.8, vx: 0.1, vz: -0.65 };
    expect(ejectCabinetDrop(floor, cabinet)).toBe(floor);
    const side = { ...floor, x: 2.3, z: -0.2 };
    expect(ejectCabinetDrop(side, cabinet)).toBe(side);
  });
});
