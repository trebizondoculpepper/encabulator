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
  yaw: -0.45,
};
