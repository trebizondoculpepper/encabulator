/**
 * A damaged button shorting out now and then: not throwing sparks, only a
 * little one, and a crackle, every so often. The gaps are random, as a
 * loose contact's are: exponentially distributed (a short is as likely in
 * any moment as any other), with a median of `SHORT_MEDIAN_SECONDS`, and
 * never closer than `SHORT_MIN_GAP`, so two never run together.
 */
export const SHORT_MEDIAN_SECONDS = 9;
export const SHORT_MIN_GAP = 1.5;

/**
 * Seconds to the next short, from `u`, a uniform random number in [0, 1):
 * the exponential distribution whose median, with the minimum gap, is
 * `SHORT_MEDIAN_SECONDS`.
 */
export function shortGap(u: number) {
  const mean = (SHORT_MEDIAN_SECONDS - SHORT_MIN_GAP) / Math.LN2;
  return SHORT_MIN_GAP - mean * Math.log(1 - Math.min(u, 0.999999));
}

/**
 * A contact that shorts at random: `update(delta)` returns true on the
 * frame a short happens. Each button gets its own, so they do not spark
 * together.
 */
export function createShorting(random: () => number = Math.random) {
  let wait = shortGap(random());
  return {
    update(delta: number) {
      wait -= delta;
      if (wait > 0) return false;
      wait = shortGap(random());
      return true;
    },
  };
}
