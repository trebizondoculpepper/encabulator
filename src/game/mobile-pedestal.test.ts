import { describe, expect, it } from 'vite-plus/test';
import {
  CREEP_SPEED,
  PRESSING_DISTANCE,
  WALL_MARGIN,
  createWanderingButton,
  eagerTarget,
  stepStand,
} from './mobile-pedestal';
import type { Stand, Viewer } from './mobile-pedestal';

const floor = { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
const home = { x: 0, z: 0 };
/** A viewer at the origin's south, eye 1.8 m up, looking `dx, dy, dz`. */
const viewer = (
  dx: number,
  dy: number,
  dz: number,
  speed = 0,
  x = 0,
  z = 3,
): Viewer => {
  const n = Math.hypot(dx, dy, dz);
  return { x, y: 1.8, z, dx: dx / n, dy: dy / n, dz: dz / n, speed };
};
const run = (
  stand: Stand,
  mode: 'normal' | 'eager' | 'skittish',
  v: Viewer,
  seconds: number,
) => {
  let s = { ...stand, speed: 0 };
  for (let t = 0; t < seconds; t += 0.05)
    s = stepStand(s, mode, v, floor, home, 0.05);
  return s;
};

describe('the wandering button', () => {
  it('puts itself where a downward glance meets its button', () => {
    // Looking north and down 0.75 m over 1.5 m: the button's height is met
    // 1.5 m ahead.
    const t = eagerTarget(viewer(0, -0.75, -1.5), floor);
    expect(t.x).toBeCloseTo(0);
    expect(t.z).toBeCloseTo(1.5);
  });

  it('comes no closer than pressing distance, and no further than the walls', () => {
    const down = eagerTarget(viewer(0, -1, -0.01), floor);
    expect(3 - down.z).toBeCloseTo(PRESSING_DISTANCE);
    const level = eagerTarget(viewer(0, 0, -1), floor);
    expect(level.z).toBeGreaterThanOrEqual(floor.minZ + WALL_MARGIN - 1e-9);
  });

  it('creeps, eager, to the left when the player looks left', () => {
    const v = viewer(-1, -0.4, 0);
    const s = run({ x: 0, z: 0, heading: 0 }, 'eager', v, 1);
    expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(CREEP_SPEED * 1.05);
    const later = run({ x: 0, z: 0, heading: 0 }, 'eager', v, 30);
    expect(later.x).toBeLessThan(-1);
    expect(later.z).toBeCloseTo(3, 0);
  });

  it('runs, skittish, a little faster than the player, and only when near', () => {
    const far = run(
      { x: 0, z: -3, heading: 0 },
      'skittish',
      viewer(0, 0, -1),
      1,
    );
    expect(far.x).toBeCloseTo(0);
    expect(far.z).toBeCloseTo(-3);
    const chased = stepStand(
      { x: 0, z: 1.5, heading: 0 },
      'skittish',
      viewer(0, 0, -1, 2),
      floor,
      home,
      0.1,
    );
    expect(chased.speed).toBeGreaterThan(2);
    expect(chased.z).toBeLessThan(1.5);
  });

  it('slides along a wall rather than into it when cornered', () => {
    const s = run(
      { x: 0, z: floor.minZ + 0.6, heading: 0 },
      'skittish',
      viewer(0, 0, -1, 2, 0, floor.minZ + 2),
      0.5,
    );
    expect(Math.abs(s.x)).toBeGreaterThan(0.3);
    expect(s.z).toBeGreaterThanOrEqual(floor.minZ + WALL_MARGIN - 1e-9);
  });

  it('goes home in normal mode', () => {
    const s = run({ x: 3, z: 2, heading: 0 }, 'normal', viewer(0, 0, -1), 20);
    expect(Math.hypot(s.x, s.z)).toBeLessThan(0.01);
  });

  it('keeps the knob, the button and the lamp in its model', () => {
    const b = createWanderingButton();
    expect(b.mood.value).toBe('normal');
    b.mode.set(2);
    expect(b.mood.value).toBe('skittish');
    b.press();
    expect(b.indicator.value).toBe(true);
    for (let i = 0; i < 40; i++) b.tick(0.1);
    expect(b.indicator.value).toBe(false);
    expect(b.g.analyse().unseenControls).toEqual([]);
  });
});
