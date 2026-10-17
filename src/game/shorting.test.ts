import { describe, expect, it } from 'vite-plus/test';
import {
  SHORT_MEDIAN_SECONDS,
  SHORT_MIN_GAP,
  createShorting,
  shortGap,
} from './shorting';

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('a button shorting out', () => {
  it('shorts about every nine seconds: that is the median gap', () => {
    expect(shortGap(0.5)).toBeCloseTo(SHORT_MEDIAN_SECONDS, 6);
    const random = rng(7);
    const gaps = Array.from({ length: 4001 }, () => shortGap(random())).sort(
      (a, b) => a - b,
    );
    expect(gaps[2000]).toBeGreaterThan(SHORT_MEDIAN_SECONDS - 0.6);
    expect(gaps[2000]).toBeLessThan(SHORT_MEDIAN_SECONDS + 0.6);
  });

  it('is not frequent: never two together, sometimes a long quiet', () => {
    expect(shortGap(0)).toBe(SHORT_MIN_GAP);
    expect(shortGap(0.95)).toBeGreaterThan(25);
    expect(Number.isFinite(shortGap(1))).toBe(true);
  });

  it('happens at the same rate at any frame rate', () => {
    for (const fps of [20, 60, 144]) {
      const shorting = createShorting(rng(fps));
      let shorts = 0;
      const hour = 3600;
      for (let t = 0; t < hour; t += 1 / fps)
        if (shorting.update(1 / fps)) shorts++;
      // The mean gap is a little over twelve seconds: ~290 an hour.
      expect(shorts).toBeGreaterThan(240);
      expect(shorts).toBeLessThan(340);
    }
  });
});
