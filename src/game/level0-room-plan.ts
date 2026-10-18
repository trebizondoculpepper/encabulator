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
 * The cheat console: on its pole beyond the line-up's right-hand end (its
 * half-width is 2.03 m), a little in front, turned towards the middle.
 */
export const LEVEL0_CHEATS = {
  x: LEVEL0_MACHINE.x + 2.95,
  z: LEVEL0_MACHINE.z + 1.4,
  yaw: -0.45,
};
