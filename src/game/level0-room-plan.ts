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
 * The spares bench: a steel bench 1.2 × 0.5 m beside the east end of the
 * line-up (whose half-width is 2.03 m), a step in front of its back, its
 * top 0.9 m up, holding one healthy replacement of each PLC card.
 */
export const LEVEL0_SPARES = {
  x: LEVEL0_MACHINE.x + 3.1,
  z: LEVEL0_MACHINE.z + 0.35,
  width: 1.2,
  depth: 0.5,
  height: 0.9,
};
