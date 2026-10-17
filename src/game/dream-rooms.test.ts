import { describe, expect, it } from 'vite-plus/test';
import { NINETIES_PATTERNS, WAKE_SPOTS, createDreamRooms } from './dream-rooms';

/** A repeatable stand-in for Math.random. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe('the rooms dev10 wakes into', () => {
  it('shows every pattern once before any comes again', () => {
    const rooms = createDreamRooms(seeded(7));
    for (let round = 0; round < 5; round++) {
      const seen = NINETIES_PATTERNS.map(() => rooms.next().pattern);
      expect([...seen].sort()).toEqual([...NINETIES_PATTERNS].sort());
    }
  });

  it('never wakes into the same pattern or the same place twice running', () => {
    for (const seed of [1, 2, 3, 42, 99]) {
      const rooms = createDreamRooms(seeded(seed));
      let last = rooms.next();
      for (let i = 0; i < 200; i++) {
        const room = rooms.next();
        expect(room.pattern).not.toBe(last.pattern);
        expect(room.pose).not.toBe(last.pose);
        last = room;
      }
    }
  });

  it('wakes inside the room, clear of the walls, looking diagonally down into it', () => {
    for (const spot of WAKE_SPOTS) {
      expect(Math.abs(spot.x)).toBeLessThan(8 - 1);
      expect(Math.abs(spot.z)).toBeLessThan(6 - 1);
      expect(spot.pitch).toBeCloseTo(-0.6);
      // Looking towards the middle: the forward direction, (sin yaw,
      // −cos yaw), does not point away from it.
      const ahead = { x: Math.sin(spot.yaw), z: -Math.cos(spot.yaw) };
      expect(ahead.x * -spot.x + ahead.z * -spot.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('lays each room out afresh', () => {
    const rooms = createDreamRooms(seeded(5));
    const seeds = new Set(Array.from({ length: 20 }, () => rooms.next().seed));
    expect(seeds.size).toBe(20);
  });
});
