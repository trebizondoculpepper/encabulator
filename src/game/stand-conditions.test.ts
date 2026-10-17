import { describe, expect, it } from 'vite-plus/test';
import { STAND_CONDITIONS, damageOf } from './stand-conditions';

describe('the button gallery', () => {
  it('starts gleaming new, then as in service, then six or so steps worse', () => {
    expect(STAND_CONDITIONS[0].finish).toBe('chrome');
    expect(STAND_CONDITIONS[0].lamp).toBe('on');
    expect(STAND_CONDITIONS[1].finish).toBe('standard');
    expect(
      Object.values(damageOf(STAND_CONDITIONS[1])).every((v) => v === 0),
    ).toBe(true);
    expect(STAND_CONDITIONS.length).toBeGreaterThanOrEqual(7);
  });

  it('gets worse at every step: nothing mends, something more goes wrong', () => {
    for (let i = 2; i < STAND_CONDITIONS.length; i++) {
      const before = damageOf(STAND_CONDITIONS[i - 1]);
      const after = damageOf(STAND_CONDITIONS[i]);
      let worse = false;
      for (const key of Object.keys(before) as (keyof typeof before)[]) {
        expect(
          after[key],
          `${STAND_CONDITIONS[i].caption}: ${key}`,
        ).toBeGreaterThanOrEqual(before[key]);
        if (after[key] > before[key]) worse = true;
      }
      expect(worse).toBe(true);
    }
  });

  it('ends a wreck: severed, bent over, the lens shattered, leaking', () => {
    const last = STAND_CONDITIONS.at(-1)!;
    expect(last.severed).toBe(true);
    expect(last.bend).toBeGreaterThan(45);
    expect(last.lens).toBe('shattered');
    // Its vital fluid mostly leaked out, and only the wreck's.
    expect(last.leak).toBeGreaterThan(0.5);
    expect(STAND_CONDITIONS.filter((c) => c.leak > 0)).toEqual([last]);
  });

  it('numbers and captions every stand once', () => {
    const names = STAND_CONDITIONS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of STAND_CONDITIONS) expect(c.caption).toMatch(/^[A-Z ]+$/);
  });
});
