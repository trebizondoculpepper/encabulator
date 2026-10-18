import { WAREHOUSE_BOUNDS } from './warehouse-room-plan';

/** North is -Z; the machine's centre stands five metres in from that wall. */
export const LEVEL2_MACHINE = { x: 0, z: WAREHOUSE_BOUNDS.minZ + 5 };
export const LEVEL2_START = {
  x: 0,
  z: LEVEL2_MACHINE.z + 4.8,
  yaw: 0,
  pitch: 0.05,
};
/** About twenty metres' carrying distance, clear of the south loading-gate apron. */
export const LEVEL2_SKIP_SPOTS = [
  { x: -8, z: 10 },
  { x: 0, z: 10.5 },
  { x: 8, z: 10 },
];
