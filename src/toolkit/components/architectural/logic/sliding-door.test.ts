import { describe, expect, it } from 'vite-plus/test';
import { SLIDING_DOOR, createSlidingDoor, sensed } from './sliding-door';

const run = (
  door: ReturnType<typeof createSlidingDoor>,
  seconds: number,
  present: boolean,
) => {
  for (let t = 0; t < seconds; t += 1 / 60) door.step(1 / 60, present);
  return door.open;
};

describe('the automatic sliding door', () => {
  it('starts shut and opens fully while someone is in its field', () => {
    const door = createSlidingDoor();
    expect(door.open).toBe(0);
    // 0.8 m at 0.6 m/s: open in about 1.3 s.
    expect(run(door, 0.5, true)).toBeGreaterThan(0.3);
    expect(run(door, 1, true)).toBe(1);
  });

  it('stays open for its hold-open time, then closes more slowly', () => {
    const door = createSlidingDoor();
    run(door, 2, true);
    expect(run(door, SLIDING_DOOR.hold - 0.1, false)).toBe(1);
    run(door, 0.2, false);
    expect(door.open).toBeLessThan(1);
    // Closing takes 0.8 / 0.3, about 2.7 s.
    expect(run(door, 1.5, false)).toBeGreaterThan(0);
    expect(run(door, 1.5, false)).toBe(0);
  });

  it('opens again if someone comes back while it closes', () => {
    const door = createSlidingDoor();
    run(door, 2, true);
    run(door, SLIDING_DOOR.hold + 1, false);
    const closing = door.open;
    expect(closing).toBeLessThan(1);
    door.step(0.1, true);
    expect(door.open).toBeGreaterThan(closing);
  });

  it('sees the doorway and the space in front of it, not beyond', () => {
    expect(sensed(0, 0)).toBe(true);
    expect(sensed(1.5, 0.8)).toBe(true);
    expect(sensed(3, 0)).toBe(false);
    expect(sensed(1, 2)).toBe(false);
    expect(sensed(-1, 0)).toBe(false);
  });
});
