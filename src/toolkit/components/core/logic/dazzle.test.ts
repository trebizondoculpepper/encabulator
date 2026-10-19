import { expect, it } from 'vite-plus/test';
import {
  GHOST_MEAN,
  GHOST_MIN,
  GHOST_SD,
  ghostLevel,
  ghostSeconds,
} from './dazzle';

/** A seeded uniform random source. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

it('draws afterimages lasting about seven seconds, give or take two', () => {
  const random = seeded(7);
  const draws = Array.from({ length: 4000 }, () => ghostSeconds(random));
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  const sd = Math.sqrt(
    draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length,
  );
  expect(mean).toBeCloseTo(GHOST_MEAN, 0);
  expect(Math.abs(sd - GHOST_SD)).toBeLessThan(0.2);
  expect(Math.min(...draws)).toBeGreaterThanOrEqual(GHOST_MIN);
});

it('fades an afterimage from full to nothing, never brightening', () => {
  expect(ghostLevel(0, 7)).toBe(1);
  expect(ghostLevel(7, 7)).toBe(0);
  expect(ghostLevel(9, 7)).toBe(0);
  let last = 1;
  for (let t = 0; t <= 7; t += 0.25) {
    const level = ghostLevel(t, 7);
    expect(level).toBeLessThanOrEqual(last);
    last = level;
  }
});
