import { describe, expect, it } from 'vite-plus/test';
import { checkEmergencyLighting } from '../toolkit/components/general-safety/logic/emergency-lighting';
import {
  WAREHOUSE_BOUNDS,
  WAREHOUSE_EMERGENCY,
  WAREHOUSE_EMPHASIS,
} from './warehouse-room-plan';

describe("the warehouse's emergency lighting", () => {
  it('meets BS 5266-1: the open area, a light by each exit, 5 lux at the fire points', () => {
    const check = checkEmergencyLighting(
      WAREHOUSE_EMERGENCY,
      WAREHOUSE_BOUNDS,
      WAREHOUSE_EMPHASIS,
    );
    expect(check.problems).toEqual([]);
  });
});
