import { describe, expect, it } from 'vite-plus/test';
import { FAILURES, failureAt } from './machine-failure';
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
});
