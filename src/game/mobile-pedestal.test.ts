import { describe, expect, it } from 'vite-plus/test';
import {
  BUTTON_FORWARD,
  BUTTON_HEIGHT,
  CREEP_SPEED,
  EAGER_TURN_SPEED,
  EAGER_TURN_RAMP,
  EAGER_TRAVEL_RAMP,
  EAGER_NEAR_DISTANCE,
  WALL_MARGIN,
  PEDESTAL_MODES,
  createWanderingButton,
  createStandMotion,
  eagerTarget,
  facing,
  stepStand,
} from './mobile-pedestal';
import type { PedestalMode, Stand, Viewer } from './mobile-pedestal';

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
const run = (stand: Stand, mode: PedestalMode, v: Viewer, seconds: number) => {
  let s = { ...stand, speed: 0 };
  for (let t = 0; t < seconds; t += 0.05)
    s = stepStand(s, mode, v, floor, home, 0.05);
  return s;
};

describe('the wandering button', () => {
  it('centres the pushable lens, including its height and forward offset', () => {
    for (const dx of [0, -1, 1]) {
      const v = viewer(dx, BUTTON_HEIGHT - 1.8, -1.5);
      const t = eagerTarget(v, floor);
      const distance = Math.hypot(t.x - v.x, t.z - v.z);
      const lensX = t.x + ((v.x - t.x) / distance) * BUTTON_FORWARD;
      const lensZ = t.z + ((v.z - t.z) / distance) * BUTTON_FORWARD;
      const along = (BUTTON_HEIGHT - v.y) / v.dy;
      expect(lensX).toBeCloseTo(v.x + v.dx * along);
      expect(lensZ).toBeCloseTo(v.z + v.dz * along);
    }
  });

  it('waits its sampled delay, then turns and travels together, restarting after camera movement', () => {
    const move = createStandMotion(() => 2 / 3);
    let s = { x: 0, z: 0, heading: 0, speed: 0 };
    let v = viewer(-1, -0.4, 0);
    const tick = (dt: number) => {
      s = move(s, 'eager', v, floor, home, dt);
    };
    tick(0);
    tick(2.9);
    expect(s).toEqual({ x: 0, z: 0, heading: 0, speed: 0 });
    tick(0.2);
    expect(s.heading).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(0);
    expect(s.speed).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) tick(0.05);
    expect(s.heading).toBeCloseTo(Math.PI / 2);
    expect(s.x).toBeLessThan(0);
    const stopped = { ...s };
    v = viewer(1, -0.4, 0);
    tick(0.05);
    tick(2.9);
    expect(s).toEqual({ ...stopped, speed: 0 });
    tick(0.2);
    expect(s.heading).not.toBe(stopped.heading);
    expect(Math.hypot(s.x - stopped.x, s.z - stopped.z)).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) tick(0.05);
    expect(s.heading).toBeCloseTo(-Math.PI / 2);
    expect(s.speed).toBeGreaterThan(0);
  });

  it('samples waits from one to four seconds once per camera settlement, ignoring jitter', () => {
    for (const draw of [0, 0.5, 1]) {
      let samples = 0;
      const move = createStandMotion(() => {
        samples++;
        return draw;
      });
      let s = { x: 0, z: 0, heading: 0, speed: 0 };
      const v = viewer(-1, -0.4, 0);
      const tick = (dt: number, jitter = 0) => {
        s = move(s, 'eager', { ...v, x: jitter }, floor, home, dt);
      };
      tick(0);
      const wait = 1 + 3 * draw;
      tick(wait - 0.01, 0.001);
      expect(s).toEqual({ x: 0, z: 0, heading: 0, speed: 0 });
      expect(samples).toBe(1);
      tick(0.02, -0.001);
      expect(s.speed).toBeGreaterThan(0);
      expect(s.heading).not.toBe(0);
      tick(0.05, 0.1);
      expect(samples).toBe(2);
      expect(s.speed).toBe(0);
    }
  });

  it('eases eager translation and rotation up to their speed caps and back to rest', () => {
    const move = createStandMotion(() => 0);
    let s = { x: 0, z: 0, heading: 0, speed: 0 };
    const v = viewer(-1, -0.4, 0);
    move(s, 'eager', v, floor, home, 0);
    s = move(s, 'eager', v, floor, home, 1);
    const linear: number[] = [];
    const angular: number[] = [];
    for (let i = 0; i < 240; i++) {
      const before = s;
      s = move(s, 'eager', v, floor, home, 0.05);
      linear.push(s.speed);
      angular.push(Math.abs(s.heading - before.heading) / 0.05);
    }
    expect(linear[0]).toBeGreaterThan(0);
    expect(angular[0]).toBeGreaterThan(0);
    expect(linear[0]).toBeLessThan(linear[5]);
    expect(angular[0]).toBeLessThan(angular[5]);
    expect(Math.max(...linear)).toBeCloseTo(CREEP_SPEED);
    expect(Math.max(...angular)).toBeCloseTo(EAGER_TURN_SPEED);
    for (const speeds of [linear, angular]) {
      const moving = speeds.filter((speed) => speed > 1e-8);
      expect(moving.at(-1)!).toBeLessThan(Math.max(...moving) * 0.1);
      expect(speeds.at(-1)).toBe(0);
      // Smoothstep velocity ramps have bounded acceleration in both directions.
      const ramp = speeds === linear ? EAGER_TRAVEL_RAMP : EAGER_TURN_RAMP;
      const cap = speeds === linear ? CREEP_SPEED : EAGER_TURN_SPEED;
      for (let i = 1; i < speeds.length; i++)
        expect(Math.abs(speeds[i] - speeds[i - 1])).toBeLessThanOrEqual(
          ((1.5 * cap) / ramp) * 0.05 + 1e-9,
        );
    }
  });

  it('uses lower peak speeds for short eager adjustments without overshooting', () => {
    const move = createStandMotion(() => 0);
    const v = viewer(-1, -0.4, 0);
    const target = eagerTarget(v, floor);
    let s = {
      x: target.x + 0.01,
      z: target.z,
      heading: Math.PI / 2 - 0.01,
      speed: 0,
    };
    s = move(s, 'eager', v, floor, home, 0);
    s = move(s, 'eager', v, floor, home, 1);
    let fastest = 0;
    let fastestTurn = 0;
    for (let i = 0; i < 60; i++) {
      const before = s;
      s = move(s, 'eager', v, floor, home, 0.05);
      fastest = Math.max(fastest, s.speed);
      fastestTurn = Math.max(
        fastestTurn,
        Math.abs(s.heading - before.heading) / 0.05,
      );
      expect(s.x).toBeGreaterThanOrEqual(target.x);
      expect(s.heading).toBeLessThanOrEqual(Math.PI / 2);
    }
    expect(fastest).toBeLessThan(CREEP_SPEED);
    expect(fastestTurn).toBeLessThan(EAGER_TURN_SPEED);
    expect(s.x).toBeCloseTo(target.x, 9);
    expect(s.heading).toBeCloseTo(Math.PI / 2, 9);
    expect(s.speed).toBe(0);
  });

  it('aligns the pushable lens exactly with the view after the eager turn and approach', () => {
    const move = createStandMotion(() => 2 / 3);
    const v = viewer(1, -0.5, -1);
    let s = { x: -2, z: 0, heading: 0, speed: 0 };
    const tick = () => {
      s = move(s, 'eager', v, floor, home, 0.05);
    };
    for (let i = 0; i < 40; i++) tick();
    expect(s).toEqual({ x: -2, z: 0, heading: 0, speed: 0 });
    for (let i = 0; i < 600; i++) tick();
    const target = eagerTarget(v, floor);
    expect(s.x).toBeCloseTo(target.x);
    expect(s.z).toBeCloseTo(target.z);
    expect(s.heading).toBeCloseTo(facing(s.x, s.z, v.x, v.z));
    const lensX = s.x + Math.sin(s.heading) * BUTTON_FORWARD;
    const lensZ = s.z - Math.cos(s.heading) * BUTTON_FORWARD;
    const along = (BUTTON_HEIGHT - v.y) / v.dy;
    expect(lensX).toBeCloseTo(v.x + along * v.dx, 6);
    expect(lensZ).toBeCloseTo(v.z + along * v.dz, 6);
    const changed = move(s, 'eager', { ...v, dx: -v.dx }, floor, home, 0.1);
    expect(changed).toEqual({ ...s, speed: 0 });
  });

  it('does not let small camera jitter starve eager travel', () => {
    const move = createStandMotion(() => 2 / 3);
    let s = { x: 0, z: 0, heading: Math.PI / 2, speed: 0 };
    const v = viewer(-1, -0.4, 0);
    for (let i = 0; i < 120; i++) {
      const jitter = i % 2 ? 1 : -1;
      s = move(
        s,
        'eager',
        { ...v, x: jitter * 0.001, dy: v.dy + jitter * 0.0001 },
        floor,
        home,
        0.05,
      );
    }
    expect(s.x).toBeLessThan(-0.5);
  });

  it('turns towards the room centre during the final approach to every corner', () => {
    const centre = {
      x: (floor.minX + floor.maxX) / 2,
      z: (floor.minZ + floor.maxZ) / 2,
    };
    for (const x of [floor.minX + WALL_MARGIN, floor.maxX - WALL_MARGIN]) {
      for (const z of [floor.minZ + WALL_MARGIN, floor.maxZ - WALL_MARGIN]) {
        const target = { x, z };
        let s = {
          x: x - Math.sign(x),
          z: z - Math.sign(z),
          heading: facing(0, 0, x, z),
          speed: 0,
        };
        const v = viewer(0, 0, -1);
        const initialError = Math.abs(
          Math.atan2(
            Math.sin(facing(s.x, s.z, centre.x, centre.z) - s.heading),
            Math.cos(facing(s.x, s.z, centre.x, centre.z) - s.heading),
          ),
        );
        s = stepStand(s, 'terrified', v, floor, home, 0.1, {
          target,
          surrendered: false,
        });
        expect(Math.hypot(s.x - x, s.z - z)).toBeGreaterThan(0.1);
        const error = Math.abs(
          Math.atan2(
            Math.sin(facing(s.x, s.z, centre.x, centre.z) - s.heading),
            Math.cos(facing(s.x, s.z, centre.x, centre.z) - s.heading),
          ),
        );
        expect(error).toBeLessThan(initialError);
        for (let i = 0; i < 40; i++)
          s = stepStand(s, 'terrified', v, floor, home, 0.05, {
            target,
            surrendered: false,
          });
        expect(
          Math.cos(s.heading - facing(s.x, s.z, centre.x, centre.z)),
        ).toBeCloseTo(1);
      }
    }
  });

  it('does not delay skittish flight or the return home', () => {
    const move = createStandMotion(() => 2 / 3);
    const s = { x: 0, z: 1.5, heading: 0 };
    const v = viewer(0, 0, -1, 2);
    expect(move(s, 'skittish', v, floor, home, 0.1).speed).toBeGreaterThan(2);
    expect(move(s, 'normal', v, floor, home, 0.1).speed).toBeGreaterThan(0);
  });

  it('waits directly in front when looking level, up, too steeply down or beyond its range', () => {
    for (const v of [
      viewer(0, 0, -1),
      viewer(0, 1, -1),
      viewer(0, -1, -0.01),
      viewer(0, -0.01, -1),
      viewer(0, -0.2, 1),
    ]) {
      const t = eagerTarget(v, floor);
      const flat = Math.hypot(v.dx, v.dz);
      expect(t.x).toBeCloseTo(
        v.x + (v.dx / flat) * (EAGER_NEAR_DISTANCE + BUTTON_FORWARD),
      );
      expect(t.z).toBeCloseTo(
        v.z + (v.dz / flat) * (EAGER_NEAR_DISTANCE + BUTTON_FORWARD),
      );
    }
  });

  it('falls back in front when the sight line meets the button height through a wall', () => {
    const v = viewer(1, -0.25, 0, 0, 6, 0);
    const t = eagerTarget(v, floor);
    expect(t.x).toBeCloseTo(v.x + EAGER_NEAR_DISTANCE + BUTTON_FORWARD);
    expect(t.z).toBeCloseTo(v.z);
  });

  it('keeps the fallback clear of the player when directly ahead is blocked by a wall', () => {
    const v = viewer(1, 0, 0, 0, floor.maxX - 0.22, 0);
    const t = eagerTarget(v, floor);
    expect(t.x).toBeLessThanOrEqual(floor.maxX - WALL_MARGIN);
    expect(Math.hypot(t.x - v.x, t.z - v.z)).toBeGreaterThanOrEqual(0.55);
  });

  it('arrives in front and faces the player when the eager sight-line target is unreachable', () => {
    const move = createStandMotion(() => 0);
    const v = viewer(0, 0, -1);
    let s = { x: -2, z: -2, heading: 0, speed: 0 };
    for (let i = 0; i < 400; i++) s = move(s, 'eager', v, floor, home, 0.05);
    expect(s.x).toBeCloseTo(v.x);
    expect(s.z).toBeCloseTo(v.z - EAGER_NEAR_DISTANCE - BUTTON_FORWARD);
    expect(Math.cos(s.heading - facing(s.x, s.z, v.x, v.z))).toBeCloseTo(1);
    expect(s.speed).toBe(0);
    const lensX = s.x + Math.sin(s.heading) * BUTTON_FORWARD;
    const lensZ = s.z - Math.cos(s.heading) * BUTTON_FORWARD;
    expect(Math.hypot(lensX - v.x, lensZ - v.z)).toBeCloseTo(0.5);
  });

  it('keeps turning towards the player throughout an unreachable-target approach', () => {
    const move = createStandMotion(() => 0);
    const v = viewer(0, 0, -1);
    let s = { x: -3, z: 0, heading: facing(-3, 0, v.x, v.z), speed: 0 };
    for (let i = 0; i < 500; i++) {
      const before = s;
      s = move(s, 'eager', v, floor, home, 0.05);
      expect(Math.cos(s.heading - facing(s.x, s.z, v.x, v.z))).toBeGreaterThan(
        0.97,
      );
      expect(Math.abs(s.heading - before.heading) / 0.05).toBeLessThanOrEqual(
        EAGER_TURN_SPEED + 1e-9,
      );
    }
    expect(s.speed).toBe(0);
  });

  it('comes no closer than pressing distance, and no further than the walls', () => {
    const down = eagerTarget(viewer(0, -1, -0.01), floor);
    expect(3 - down.z).toBeCloseTo(EAGER_NEAR_DISTANCE + BUTTON_FORWARD);
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

  it('starts at the furthest corner without using an evasion', () => {
    const move = createStandMotion(() => 0);
    const v = viewer(0, 0, -1, 0, -6, 4);
    const start = { x: 0, z: 0, heading: 0 };
    const next = move(start, 'terrified', v, floor, home, 0.1);
    expect(move.escape()).toEqual({
      target: { x: floor.maxX - WALL_MARGIN, z: floor.minZ + WALL_MARGIN },
      evasions: 0,
      surrendered: false,
    });
    expect(next.x).toBeGreaterThan(0);
    expect(next.z).toBeLessThan(0);
  });

  it('makes exactly three approach-triggered random escapes, then offers its button', () => {
    const move = createStandMotion(() => 0.8);
    let s = { x: 0, z: 0, heading: 0, speed: 0 };
    let v = viewer(0, 0, -1);
    const tick = () => {
      s = move(s, 'terrified', v, floor, home, 0.05);
    };
    const arrive = () => {
      for (let i = 0; i < 240; i++) tick();
      const target = move.escape()!.target;
      expect(Math.hypot(s.x - target.x, s.z - target.z)).toBeLessThan(0.05);
      expect(s.heading).toBeCloseTo(facing(s.x, s.z, 0, 0));
    };
    tick();
    arrive();
    expect(move.escape()!.evasions).toBe(0);
    for (let escape = 1; escape <= 3; escape++) {
      const previous = move.escape()!.target;
      v = {
        ...v,
        x: previous.x - Math.sign(previous.x) * 1.2,
        z: previous.z - Math.sign(previous.z) * 1.2,
      };
      tick();
      expect(move.escape()!.evasions).toBe(escape);
      expect(move.escape()!.target).not.toEqual(previous);
      // Further frames near the old corner do not count as extra escapes.
      tick();
      expect(move.escape()!.evasions).toBe(escape);
      arrive();
    }
    expect(move.escape()!.surrendered).toBe(true);
    const stopped = { ...s };
    v = { ...v, x: s.x - Math.sign(s.x), z: s.z - Math.sign(s.z) };
    for (let i = 0; i < 60; i++) tick();
    expect(s.x).toBeCloseTo(stopped.x);
    expect(s.z).toBeCloseTo(stopped.z);
    expect(s.speed).toBe(0);
    expect(s.heading).toBeCloseTo(facing(s.x, s.z, 0, 0));
    move(s, 'normal', v, floor, home, 0.05);
    expect(move.escape()).toBeNull();
    move(s, 'terrified', v, floor, home, 0.05);
    expect(move.escape()!.evasions).toBe(0);
  });

  it('chooses different escape corners with different random draws', () => {
    const destinations = [0, 0.99].map((draw) => {
      const move = createStandMotion(() => draw);
      const s = { x: 0, z: 0, heading: 0 };
      const v = viewer(0, 0, -1);
      move(s, 'terrified', v, floor, home, 0);
      const target = move.escape()!.target;
      move(
        { ...s, ...target },
        'terrified',
        {
          ...v,
          x: target.x - Math.sign(target.x),
          z: target.z - Math.sign(target.z),
        },
        floor,
        home,
        0.05,
      );
      return move.escape()!.target;
    });
    expect(destinations[0]).not.toEqual(destinations[1]);
  });

  it('routes around the player on the way to a corner', () => {
    const move = createStandMotion(() => 0);
    let s = { x: 0, z: 0, heading: 0, speed: 0 };
    const v = viewer(0, 0, -1, 0, -2, 3);
    s = move(s, 'terrified', v, floor, home, 0.05);
    const target = move.escape()!.target;
    const obstacle = { ...v, x: target.x / 2, z: target.z / 2 };
    for (let i = 0; i < 240; i++) {
      s = move(s, 'terrified', obstacle, floor, home, 0.05);
      expect(Math.hypot(s.x - obstacle.x, s.z - obstacle.z)).toBeGreaterThan(
        0.8,
      );
      expect(s.x).toBeGreaterThanOrEqual(floor.minX + WALL_MARGIN);
      expect(s.x).toBeLessThanOrEqual(floor.maxX - WALL_MARGIN);
      expect(s.z).toBeGreaterThanOrEqual(floor.minZ + WALL_MARGIN);
      expect(s.z).toBeLessThanOrEqual(floor.maxZ - WALL_MARGIN);
    }
    expect(Math.hypot(s.x - target.x, s.z - target.z)).toBeLessThan(0.05);
  });

  it('drives the button heartbeat independently of presses at 60, 90 and 120 bpm', () => {
    const normal = createWanderingButton();
    normal.press();
    expect(normal.buttonLight.value).toBe(false);
    for (const [mode, bpm] of [
      [1, 60],
      [2, 90],
      [3, 120],
    ]) {
      const b = createWanderingButton();
      b.mode.set(mode);
      b.tick(0);
      const period = 60 / bpm;
      expect(b.buttonLight.value).toBe(true);
      b.tick(period * 0.15);
      expect(b.buttonLight.value).toBe(false);
      if (mode !== 3) {
        b.press();
        expect(b.buttonLight.value).toBe(false);
      }
      b.tick(period * 0.1);
      expect(b.buttonLight.value).toBe(true);
      b.tick(period * 0.2);
      expect(b.buttonLight.value).toBe(false);
      b.tick(period * 0.6);
      expect(b.buttonLight.value).toBe(true);
    }
  });

  it('stays dormant with its lamp off after a terrified press, until another mode is selected', () => {
    const b = createWanderingButton();
    b.mode.set(3);
    b.press();
    const s = { x: 6, z: -4, heading: 1, speed: 0 };
    const v = viewer(0, 0, -1);
    b.tick(1);
    const still = b.move(s, v, floor, home, 1);
    expect(still).toEqual(s);
    expect(b.buttonLight.value).toBe(false);
    expect(b.sparks.value).toBe(0);
    expect(b.dormant.value).toBe(true);
    b.mode.set(2);
    b.move(s, v, floor, home, 0.1);
    expect(b.dormant.value).toBe(false);
    b.mode.set(0);
    expect(b.move(s, v, floor, home, 0.1).speed).toBeGreaterThan(0);
  });

  it('sparks and switches to normal immediately when pressed in terrified mode', () => {
    const b = createWanderingButton();
    b.mode.set(3);
    b.press();
    expect(b.mood.value).toBe('normal');
    expect(b.mode.value).toBe(0);
    expect(b.indicator.value).toBe(true);
    expect(b.sparks.value).toBe(1);
    b.tick(0.4);
    expect(b.sparks.value).toBeCloseTo(0.5);
    b.tick(0.5);
    expect(b.sparks.value).toBe(0);
    b.mode.set(1);
    b.press();
    expect(b.sparks.value).toBe(0);
    expect(b.mood.value).toBe('eager');
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
    PEDESTAL_MODES.forEach((mode, i) => {
      b.mode.set(i);
      expect(b.mood.value).toBe(mode);
    });
    b.press();
    expect(b.indicator.value).toBe(true);
    for (let i = 0; i < 40; i++) b.tick(0.1);
    expect(b.indicator.value).toBe(false);
    expect(b.g.analyse().unseenControls).toEqual([]);
  });
});
