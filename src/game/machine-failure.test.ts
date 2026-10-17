import { describe, expect, it } from 'vite-plus/test';
import {
  FAILURES,
  failureAt,
  faultsAt,
  smokeAt,
  sootAfter,
} from './machine-failure';
import type { FailureId } from './machine-failure';

const failure = (id: FailureId) => FAILURES.find((f) => f.id === id)!;
const speeds = (id: FailureId) =>
  Array.from(
    { length: Math.ceil(failure(id).seconds * 50) + 1 },
    (_, i) => failureAt(id, i / 50).speed,
  );

describe('the machine failing', () => {
  it('never jumps: every change is a slide, not a click', () => {
    for (const { id } of FAILURES) {
      const s = speeds(id);
      for (let i = 1; i < s.length; i++)
        expect(Math.abs(s[i] - s[i - 1])).toBeLessThan(0.12);
    }
  });

  it('starts each failure from normal running, and a restart from rest', () => {
    for (const { id } of FAILURES)
      expect(failureAt(id, 0).speed).toBeCloseTo(id === 'restart' ? 0 : 1, 1);
  });

  it('only hiccups at the sticky switch: some noises trip out, then it carries on', () => {
    const hiccup = failure('hiccup');
    expect(hiccup.ends).toBe('running');
    expect(hiccup.dropout).toBeDefined();
    expect(Math.min(...speeds('hiccup'))).toBeGreaterThan(0.75);
    expect(failureAt('hiccup', hiccup.seconds)).toEqual({
      speed: 1,
      lit: true,
    });
  });

  it('sputters to a standstill, and restarts into life', () => {
    const sputter = failure('sputter');
    expect(sputter.ends).toBe('stalled');
    expect(failureAt('sputter', sputter.seconds - 0.01).speed).toBeLessThan(
      0.05,
    );
    expect(failureAt('sputter', sputter.seconds + 9)).toEqual({
      speed: 0,
      lit: true,
    });
    const restart = failure('restart');
    expect(restart.ends).toBe('running');
    expect(failureAt('restart', restart.seconds)).toEqual({
      speed: 1,
      lit: true,
    });
  });

  it('makes the final kaput the most dramatic of all: hope, sparks, and death', () => {
    const kaput = failure('kaput');
    expect(kaput.ends).toBe('dead');
    expect(Math.max(...speeds('kaput'))).toBeGreaterThan(1.35);
    expect(kaput.sparks.length).toBeGreaterThan(
      Math.max(
        ...FAILURES.filter((f) => f.id !== 'kaput').map((f) => f.sparks.length),
      ),
    );
    expect(kaput.seconds).toBe(Math.max(...FAILURES.map((f) => f.seconds)));
    expect(failureAt('kaput', kaput.seconds + 1)).toEqual({
      speed: 0,
      lit: false,
    });
  });

  it('coughs and sparks only while it is happening', () => {
    for (const { coughs, sparks, seconds } of FAILURES)
      for (const at of [...coughs, ...sparks]) {
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThan(seconds);
      }
  });

  it('smokes only in the kaput, from the auxiliary motor and the drive isolator', () => {
    for (const { id, smoke } of FAILURES)
      if (id !== 'kaput') {
        expect(smoke).toBeUndefined();
        expect(smokeAt(id, 5)).toBe(0);
      }
    const kaput = failure('kaput');
    expect(kaput.smoke?.from).toEqual(['section2.bucket3', 'section6.bucket2']);
    // From the first bang, with the first sparks.
    expect(kaput.smoke?.start).toBe(kaput.sparks[0]);
    expect(smokeAt('kaput', kaput.sparks[0] - 0.01)).toBe(0);
  });

  it('pours smoke, then clears it about eight seconds on, never jumping', () => {
    const start = failure('kaput').smoke!.start;
    expect(smokeAt('kaput', start + 4)).toBe(1);
    expect(smokeAt('kaput', start + 7)).toBeGreaterThan(0);
    expect(smokeAt('kaput', start + 8)).toBe(0);
    expect(smokeAt('kaput', 300)).toBe(0);
    let last = 0;
    for (let t = 0; t < 20; t += 0.02) {
      const now = smokeAt('kaput', t);
      expect(Math.abs(now - last)).toBeLessThan(0.05);
      last = now;
    }
  });

  it('leaves the units above clearly sooted once the smoke has cleared', () => {
    let soot = 0;
    for (let t = 0; t < 20; t += 1 / 60)
      soot = sootAfter(soot, smokeAt('kaput', t), 1 / 60);
    expect(soot).toBeGreaterThan(0.6);
    expect(soot).toBeLessThan(0.9);
  });

  it('blackens the units above with soot that only builds up', () => {
    let soot = 0;
    for (let i = 0; i < 5 * 60; i++) soot = sootAfter(soot, 1, 1 / 60);
    expect(soot).toBeCloseTo(1 - Math.exp(-1), 3);
    // The same whatever the frame rate.
    let coarse = 0;
    for (let i = 0; i < 5 * 10; i++) coarse = sootAfter(coarse, 1, 1 / 10);
    expect(coarse).toBeCloseTo(soot, 6);
    expect(sootAfter(0.4, 0, 5)).toBe(0.4);
    expect(sootAfter(0.99, 1, 100)).toBeLessThanOrEqual(1);
  });

  it('brings up more faults the worse it fails, almost all of them in the kaput', () => {
    const count = (id: FailureId) =>
      faultsAt(id, failure(id).seconds - 0.01).alarms.length;
    expect(count('hiccup')).toBeLessThan(count('sputter'));
    expect(count('sputter')).toBeLessThan(count('kaput'));
    // Twelve windows, the last a spare: all but two in alarm at the end.
    expect(faultsAt('kaput', 9).alarms).toHaveLength(10);
    expect(faultsAt('kaput', 9).alarms).not.toContain('SPARE');
  });

  it("leaves the kaput's red trips flashing, unacknowledged, and the rest steady", () => {
    const red = ['BUS OVERVOLT', 'GROUND FAULT', 'PHASE LOSS', 'BREAKER TRIP'];
    const { alarms, acknowledged } = faultsAt('kaput', 60);
    for (const window of red) {
      expect(alarms).toContain(window);
      expect(acknowledged).not.toContain(window);
    }
    expect(acknowledged.length).toBe(alarms.length - red.length);
  });

  it('clears the faults of a failure it shakes off, and keeps those of one it does not', () => {
    for (const { id, ends, seconds, faults } of FAILURES) {
      for (const f of faults) expect(f.at).toBeLessThan(seconds);
      const after = faultsAt(id, seconds + 1).alarms;
      if (ends === 'running') expect(after).toEqual([]);
      else expect(after.length).toBe(faults.length);
    }
  });
});
