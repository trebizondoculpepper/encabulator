/**
 * Waking up from the dream (dev10): what the eyes and head do, second by
 * second, after the player uses something in the room.
 *
 * The eyes snap shut; while they are shut the camera is moved to where the
 * player really is, so the move is never seen; they open slowly, a little
 * way at first, onto a dim, blurred view, and blink a few times, dizzily,
 * each time opening wider and seeing more clearly, while the head sways
 * and shakes itself awake; then the player has the camera back.
 *
 * The blink is subjective: one view closing, as the two eyes are seen as
 * one, not two eyelids. `open` is how open that view is (1 open, 0 shut);
 * `haze` is how blurred and dim it is, from waking (1) to clear-headed (0);
 * the shake is a turn of the head on top of where the player looks.
 */

export interface WakingFrame {
  /** How open the eyes are: 1 open, 0 shut. */
  open: number;
  /** How blurred and dim the view is: 1 just woken, 0 clear. */
  haze: number;
  /** The head's shake, radians, on top of the player's aim. */
  shake: { yaw: number; pitch: number; roll: number };
  /** Whether the player's walking and looking are held. */
  holding: boolean;
}

/** When the camera moves to where the player wakes: deep in the first, long closing. */
export const JUMP_AT = 0.4;
/** When the eyes are fully open at last, after the dizzy blinks. */
export const EYES_OPEN = 4.6;
/**
 * When the head starts to move, as the eyes first open, and when it is
 * still again: it shakes itself awake while it blinks.
 */
export const SHAKE_FROM = 1.15;
export const SHAKE_TO = 6;
/** When the player has the camera back. */
export const WAKING_ENDS = 6.1;

/**
 * How open the eyes are, at each moment: a quick shut, a long dark, then
 * dizzy blinks, irregular, each opening wider. Closing is quick (a tenth
 * of a second), as a blink is; opening is slower.
 */
const OPEN: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.11, 0],
  [1.15, 0],
  [1.85, 0.28],
  [2.25, 0.32],
  [2.37, 0],
  [2.55, 0],
  [2.95, 0.55],
  [3.45, 0.6],
  [3.56, 0],
  [3.66, 0],
  [3.95, 0.8],
  [4.15, 0.78],
  [4.26, 0],
  [4.34, 0],
  [EYES_OPEN, 1],
];

/** How hazy the view is: clearing a little with every blink. */
const HAZE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.11, 1],
  [1.15, 1],
  [2.3, 0.75],
  [3.5, 0.45],
  [4.3, 0.2],
  [5.2, 0.05],
  [WAKING_ENDS, 0],
];

const smooth = (u: number) => u * u * (3 - 2 * u);

/** The value of a curve of keyframes at `t`, eased between them. */
function along(curve: readonly (readonly [number, number])[], t: number) {
  if (t <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [t1, v1] = curve[i];
    if (t < t1) {
      const [t0, v0] = curve[i - 1];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return curve[curve.length - 1][1];
}

/**
 * Shakes of the head, each a few quick turns from side to side with a
 * roll, swelling and dying away: one with each dizzy blink, and the last
 * and hardest once the eyes are open. `at` and `length` in seconds,
 * `size` a share of the hardest.
 */
const SHAKES = [
  { at: 1.95, length: 0.7, size: 0.5 },
  { at: 2.95, length: 0.8, size: 0.7 },
  { at: 3.85, length: 0.65, size: 0.6 },
  { at: 4.75, length: 1.25, size: 1 },
] as const;

/**
 * The head shaking itself awake while the eyes blink: a slow, groggy sway
 * from the moment the eyes first open, with quick shakes from side to side
 * through it, as if trying to throw off sleep. All smooth, so it reads as a
 * head and not a camera shaking, and still at both ends. The room turns
 * the head about the neck, not the eyes, so they move as well as turn.
 */
function shakeAt(t: number) {
  if (t <= SHAKE_FROM || t >= SHAKE_TO) return { yaw: 0, pitch: 0, roll: 0 };
  // The sway: slow, lolling, fading as the head clears.
  const s = t - SHAKE_FROM;
  const u = s / (SHAKE_TO - SHAKE_FROM);
  const sway = Math.sin(Math.PI * u) * (1 - u);
  let yaw = 0.06 * sway * Math.sin(2 * Math.PI * 0.45 * s);
  let pitch = 0.03 * sway * Math.sin(2 * Math.PI * 0.3 * s + 0.8);
  let roll = 0.05 * sway * Math.sin(2 * Math.PI * 0.6 * s + 0.4);
  for (const shake of SHAKES) {
    const k = t - shake.at;
    if (k <= 0 || k >= shake.length) continue;
    const v = k / shake.length;
    const envelope = shake.size * Math.sin(Math.PI * v) * Math.sqrt(1 - v);
    const turn = 2 * Math.PI * k;
    yaw += 0.14 * envelope * Math.sin(turn * 3.2);
    pitch += 0.035 * envelope * Math.sin(turn * 4.1 + 1.1);
    roll += 0.06 * envelope * Math.sin(turn * 3.2 + 0.6);
  }
  return { yaw, pitch, roll };
}

/** The eyes and head `t` seconds after waking began. */
export function wakingAt(t: number): WakingFrame {
  return {
    open: along(OPEN, t),
    haze: along(HAZE, t),
    shake: shakeAt(t),
    holding: t < WAKING_ENDS,
  };
}

/** Not waking: eyes open, view clear, the player in charge. */
export const AWAKE: WakingFrame = {
  open: 1,
  haze: 0,
  shake: { yaw: 0, pitch: 0, roll: 0 },
  holding: false,
};

/**
 * The waking, as the room runs it: `begin` it (again, once it has ended,
 * to wake again); `update` it each frame, and it calls `jump` once a
 * waking, on the first frame at or after `JUMP_AT`, while the eyes are
 * shut. `reset` makes it a dream again.
 */
export function createWaking(jump: () => void) {
  let since: number | null = null;
  let jumped = false;
  let frame = AWAKE;
  return {
    /** Start waking, unless already waking. Returns whether it started. */
    begin() {
      if (since !== null && since < WAKING_ENDS) return false;
      since = 0;
      jumped = false;
      frame = wakingAt(0);
      return true;
    },
    update(delta: number) {
      if (since === null) return frame;
      since += delta;
      if (!jumped && since >= JUMP_AT) {
        jumped = true;
        jump();
      }
      frame = wakingAt(since);
      return frame;
    },
    /** Go straight to `t` seconds into waking (for development). */
    seek(t: number) {
      since = t;
      if (!jumped && since >= JUMP_AT) {
        jumped = true;
        jump();
      }
      frame = wakingAt(since);
    },
    get frame() {
      return frame;
    },
    /** Whether the player has woken (or is waking) since the dream began. */
    get woken() {
      return since !== null;
    },
    reset() {
      since = null;
      jumped = false;
      frame = AWAKE;
    },
  };
}
