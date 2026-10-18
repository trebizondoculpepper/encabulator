import {
  LEVEL2_MACHINE,
  LEVEL2_START,
  LEVEL2_SKIP_SPOT,
} from './level2-room-plan';

/** Start from Level 2's layout; each level keeps its own placements. */
export const LEVEL0_MACHINE = { ...LEVEL2_MACHINE };
export const LEVEL0_START = { ...LEVEL2_START };
export const LEVEL0_CHAIRS = { ...LEVEL2_SKIP_SPOT };
