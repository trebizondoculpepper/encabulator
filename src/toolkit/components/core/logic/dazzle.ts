/**
 * Being dazzled by a bright discharge: the flash fills the eye for a frame
 * or two, then leaves a dark afterimage where it was, stuck to the eye (so
 * it stays put on the screen however the player looks about), fading over
 * a few seconds. A comical, subjective effect; nobody is hurt.
 *
 * How long the afterimage lasts is normally distributed, `GHOST_MEAN`
 * seconds give or take `GHOST_SD`, never under `GHOST_MIN`.
 */
export const FLASH_FRAMES = 2;
export const GHOST_MEAN = 7;
export const GHOST_SD = 2;
export const GHOST_MIN = 1.5;

/** Seconds an afterimage lasts, from two uniform random numbers. */
export function ghostSeconds(random: () => number = Math.random) {
  const u = Math.max(random(), 1e-9);
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  return Math.max(GHOST_MIN, GHOST_MEAN + GHOST_SD * normal);
}

/**
 * How dark an afterimage is, `age` seconds after the flash, out of one:
 * darkest at once, fading slowly at first and then away, gone at
 * `seconds`.
 */
export function ghostLevel(age: number, seconds: number) {
  if (age <= 0) return 1;
  if (age >= seconds) return 0;
  const k = age / seconds;
  return (1 - k) * (1 - k * k);
}
