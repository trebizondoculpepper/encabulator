import { expect, it } from 'vite-plus/test';
import {
  LEVEL2_MACHINE,
  LEVEL2_START,
  LEVEL2_SKIP_SPOT,
} from './level2-room-plan';
import { WAREHOUSE_BOUNDS } from './warehouse-room-plan';

it('places the machine five metres from the north wall and leaves the south apron clear', () => {
  expect(LEVEL2_MACHINE.x).toBe(0);
  expect(LEVEL2_MACHINE.z - WAREHOUSE_BOUNDS.minZ).toBe(5);
  expect(LEVEL2_START.z).toBeGreaterThan(LEVEL2_MACHINE.z + 3);
  for (const spot of [LEVEL2_SKIP_SPOT]) {
    expect(
      Math.hypot(spot.x - LEVEL2_MACHINE.x, spot.z - LEVEL2_MACHINE.z),
    ).toBeGreaterThan(19);
    expect(spot.z + 1.22 / 2).toBeLessThan(12.85);
    expect(Math.abs(spot.x) + 1.83 / 2).toBeLessThan(WAREHOUSE_BOUNDS.maxX - 1);
  }
});
