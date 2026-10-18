import { WAREHOUSE_HEADS } from '../toolkit/components/architectural/logic/warehouse-services';
import {
  LEVEL2_MACHINE,
  LEVEL2_START,
  LEVEL2_SKIP_SPOT,
} from './level2-room-plan';

/** Start from Level 2's layout; each level keeps its own placements. */
export const LEVEL0_MACHINE = { ...LEVEL2_MACHINE };
export const LEVEL0_START = { ...LEVEL2_START };
export const LEVEL0_CHAIRS = { ...LEVEL2_SKIP_SPOT };
/**
 * The Hyperplasc Scenario Simulator: a 42U rack beyond the line-up's
 * right-hand end (its half-width is 2.03 m), a little in front of it,
 * turned towards the middle.
 */
export const LEVEL0_SCENARIOS = {
  x: LEVEL0_MACHINE.x + 3.1,
  z: LEVEL0_MACHINE.z + 1.3,
  // Turned about 46° clockwise (seen from above) from facing the room.
  yaw: -0.45 - (20 * Math.PI) / 180,
};

/** The line-up's half-width, metres, and its depth behind its front. */
const MACHINE_HALF = 2.03;
const MACHINE_DEPTH = 0.51;
/**
 * A sprinkler head's place in the room: the warehouse shell is built
 * turned a quarter about the vertical, so its (x, z) is the room's (z, -x).
 */
export const headInRoom = (i: number) => ({
  x: WAREHOUSE_HEADS[i].z,
  z: -WAREHOUSE_HEADS[i].x,
});
/**
 * The sprinkler heads over the machine, by index into `WAREHOUSE_HEADS`:
 * within its width, and over its roof or just in front of it (a pendant
 * head throws its water a metre or so round).
 */
export const LEVEL0_MACHINE_HEADS = WAREHOUSE_HEADS.map((_, i) => i).filter(
  (i) => {
    const { x, z } = headInRoom(i);
    return (
      Math.abs(x - LEVEL0_MACHINE.x) < MACHINE_HALF &&
      z > LEVEL0_MACHINE.z - MACHINE_DEPTH - 0.6 &&
      z < LEVEL0_MACHINE.z + 0.6
    );
  },
);
