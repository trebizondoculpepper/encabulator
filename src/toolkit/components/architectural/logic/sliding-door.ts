/**
 * An automatic bi-parting sliding door, after dormakaba's ES 200 operator
 * (the drive most British office entrances of the 1990s were fitted
 * with): a microwave motion sensor over the doorway sees someone coming,
 * the leaves run open, stay open while anyone is in its field and for a
 * hold-open time after, then run shut, more slowly. Pure logic: `step`
 * moves the leaves; `sensed` says whether a point is in the sensor's field.
 */
export const SLIDING_DOOR = {
  /** How far each leaf travels to open, metres (half the clear opening). */
  travel: 0.8,
  /** Opening speed of each leaf, metres a second (ES 200: up to 0.7). */
  openSpeed: 0.6,
  /** Closing speed of each leaf, metres a second, slower for safety. */
  closeSpeed: 0.3,
  /** How long it stays open after the field is clear, seconds. */
  hold: 2,
  /** How far in front of the door its sensor sees, metres. */
  reach: 2.2,
  /** How far either side of the doorway's middle it sees, metres. */
  half: 1.3,
};

export type SlidingDoorSpec = typeof SLIDING_DOOR;

/**
 * Whether a point `ahead` metres in front of the doorway (along its
 * inward normal) and `across` metres to one side of its middle is in the
 * sensor's field. A point in the doorway itself (ahead 0) is seen, so the
 * door never closes on anyone standing in it.
 */
export function sensed(
  ahead: number,
  across: number,
  spec: SlidingDoorSpec = SLIDING_DOOR,
) {
  return ahead >= -0.3 && ahead <= spec.reach && Math.abs(across) <= spec.half;
}

export function createSlidingDoor(spec: SlidingDoorSpec = SLIDING_DOOR) {
  /** How far open, 0 shut to 1 fully open. */
  let open = 0;
  /** Seconds of hold-open left once the field is clear. */
  let holding = 0;
  return {
    get open() {
      return open;
    },
    /** Run `delta` seconds, someone `present` in the field or not. */
    step(delta: number, present: boolean) {
      holding = present ? spec.hold : Math.max(0, holding - delta);
      const wanted = present || holding > 0 ? 1 : 0;
      const speed = (wanted ? spec.openSpeed : spec.closeSpeed) / spec.travel;
      if (wanted > open) open = Math.min(1, open + speed * delta);
      else if (wanted < open) open = Math.max(0, open - speed * delta);
      return open;
    },
  };
}
