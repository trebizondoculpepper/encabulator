/**
 * How strange Level 0 becomes as its machine nears breakdown: the effects
 * of dev1 (colour channels breathing apart, π drifting, space warping)
 * and of dev2 (ghosting, geometric patterns, apparitions) building with
 * the model's strain, 0 to 1. Faint at first, easy to put down to tired
 * eyes; strongest just before the end. When the machine breaks down they
 * stop at once, and normality ensues.
 */

export interface Strangeness {
  /** dev1's activity, 0 to 1: colour channels, π drift, warp. */
  activity: number;
  /** dev2's ghosting strength, 0 to 1. */
  ghosting: number;
  /** dev2's geometric patterns' strength, 0 to 1. */
  patterns: number;
  /** dev2's apparitions, how many a minute. */
  apparitionsPerMinute: number;
}

/** Where each effect begins and is full, as strain. */
export const STRANGENESS = {
  activity: [0.15, 1],
  ghosting: [0.15, 0.6],
  patterns: [0.35, 0.9],
  apparitions: [0.5, 1],
} as const;

const ramp = (x: number, [from, to]: readonly [number, number]) =>
  Math.max(0, Math.min(1, (x - from) / (to - from)));

/**
 * The most each gets, just before breakdown: well short of dev1's and
 * dev2's full strength (dev1's activity 1 is the VX3's end-state chaos),
 * so the room is unsettling, not unreadable. The owner found the first
 * tuning (activity 1, ghosting 0.55, patterns 0.65, 14 a minute) far too
 * strong, and the patterns at 0.2 still too strong.
 */
export const MOST: Strangeness = {
  activity: 0.3,
  ghosting: 0.25,
  // Much fainter again, at the owner's word: a ghost of a pattern.
  patterns: 0.06,
  apparitionsPerMinute: 4,
};

export const NORMAL: Strangeness = {
  activity: 0,
  ghosting: 0,
  patterns: 0,
  apparitionsPerMinute: 0,
};

export function strangeness(strain: number, brokenDown: boolean): Strangeness {
  if (brokenDown) return NORMAL;
  return {
    activity: MOST.activity * ramp(strain, STRANGENESS.activity),
    ghosting: MOST.ghosting * ramp(strain, STRANGENESS.ghosting),
    patterns: MOST.patterns * ramp(strain, STRANGENESS.patterns),
    apparitionsPerMinute:
      MOST.apparitionsPerMinute * ramp(strain, STRANGENESS.apparitions),
  };
}
