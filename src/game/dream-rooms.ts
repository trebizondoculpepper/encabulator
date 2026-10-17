/**
 * Dev10's rooms: each time the player wakes, they wake in a different room,
 * and the one before was a dream. A room here is a wall pattern, one of the
 * garish abstract designs of the early 1990s (`src/scene/nineties-patterns.ts`),
 * with a seed for its layout, and a place in the room to wake, looking
 * diagonally down.
 */

export const NINETIES_PATTERNS = [
  /** Teal brush swathes crossed by purple squiggles, as on a paper cup. */
  'cup',
  /** Memphis confetti: triangles, squiggles, dots and zigzags. */
  'memphis',
  /** Arcade carpet: neon planets, rings and stars on black. */
  'arcade',
  /** Shards of teal, magenta and yellow on purple, with white zigzags. */
  'shards',
  /** Neon paint splats on black. */
  'splatter',
  /** Black and white checks under fat pastel squiggles. */
  'checks',
  /** Windbreaker colour blocks in diagonal bands, with zigzags. */
  'windbreaker',
  /** Bright confetti chips on white. */
  'confetti',
] as const;
export type NinetiesPattern = (typeof NINETIES_PATTERNS)[number];

export interface WakePose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface DreamRoom {
  pattern: NinetiesPattern;
  /** Lays the pattern's shapes out differently each time. */
  seed: number;
  /** Where the player wakes. */
  pose: WakePose;
}

/**
 * Where the player may wake, in a 16 × 12 m room centred on the origin:
 * near each corner and side, facing into the room (a yaw of 0 faces −z),
 * looking diagonally down.
 */
export const WAKE_SPOTS: readonly WakePose[] = [
  [5.2, -3.6],
  [-5.2, -3.6],
  [-5.4, 3.2],
  [4.6, 3.4],
  [0.8, -4.2],
  [-1.2, 1.4],
].map(([x, z]) => ({
  x,
  z,
  // Face the middle of the room, or straight ahead when nearly there.
  yaw: Math.hypot(x, z) > 2 ? Math.atan2(-x, z) : 0.7,
  pitch: -0.6,
}));

/**
 * The rooms the player wakes in, one after another: every pattern once, in
 * a shuffled order, before any comes again, and never the same pattern or
 * the same place twice running. `random` returns numbers in [0, 1).
 */
export function createDreamRooms(random: () => number = Math.random) {
  let bag: NinetiesPattern[] = [];
  let last: DreamRoom | null = null;
  const pick = <T>(items: readonly T[]) =>
    items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  return {
    /** The next room to wake in. */
    next(): DreamRoom {
      if (!bag.length) {
        bag = [...NINETIES_PATTERNS];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        // A new round never starts with the pattern just seen.
        if (bag[bag.length - 1] === last?.pattern)
          [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      const pattern = bag.pop()!;
      const pose = pick(WAKE_SPOTS.filter((spot) => spot !== last?.pose));
      last = { pattern, seed: Math.floor(random() * 2 ** 31), pose };
      return last;
    },
    /** Forget the rooms woken in: the next round starts afresh. */
    reset() {
      bag = [];
      last = null;
    },
  };
}
