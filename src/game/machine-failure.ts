/**
 * How the machine gives up, and comes back: like the Millennium Falcon's
 * hyperdrive in *The Empire Strikes Back*, the pathetic, sad noise of an
 * engine that will not catch, conking out and losing its power. Level 2
 * uses them in turn, each worse than the last: a hiccup at the sticky
 * switch (foreshadowing, mildly alarming), a sputter to a standstill when
 * the Pepperdyne boards fry its circuits, a restart from the Automation
 * Control RESET button, and at the end the final, gut-wrenching kaput.
 *
 * Each is a timeline of the machine's running speed, as a share of normal
 * (every running sound follows it, pitch and pace together), whether its
 * lamps are lit, when its sections' own sounds drop out, its coughs and
 * sparks, and how it ends.
 */

export type FailureId = 'hiccup' | 'sputter' | 'restart' | 'kaput';

export interface Failure {
  id: FailureId;
  /** Its legend on the failure simulator. */
  legend: string;
  /** Seconds it takes to play out. */
  seconds: number;
  /**
   * How it leaves the machine: back to normal, stalled (powered but
   * stopped, until it is restarted), or dead (its main breaker trips).
   */
  ends: 'running' | 'stalled' | 'dead';
  /** When it coughs or sputters, seconds from the start. */
  coughs: readonly number[];
  /** When sparks fly from it. */
  sparks: readonly number[];
  /** When its sections' own sounds trip out, if they do. */
  dropout?: readonly [number, number];
}

export const FAILURES: readonly Failure[] = [
  {
    id: 'hiccup',
    legend: 'HICCUP',
    seconds: 1.6,
    ends: 'running',
    coughs: [0.12],
    sparks: [],
    dropout: [0.1, 1.05],
  },
  {
    id: 'sputter',
    legend: 'SPUTTER',
    seconds: 6,
    ends: 'stalled',
    coughs: [0.1, 0.35, 2.4, 2.7, 4.3, 5.1],
    sparks: [],
  },
  {
    id: 'restart',
    legend: 'RESTART',
    seconds: 4.2,
    ends: 'running',
    coughs: [0.2, 0.55, 0.95, 1.7],
    sparks: [],
  },
  {
    id: 'kaput',
    legend: 'KAPUT',
    seconds: 8,
    ends: 'dead',
    coughs: [1.32, 1.8, 2.5, 3.45, 4.1, 4.9, 5.6],
    sparks: [1.3, 1.42, 1.6, 3.4, 3.55, 4.85, 6.9],
  },
];

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
/** From `a` to `b` as `t` goes from `t0` to `t1`, eased in and out. */
const ease = (t: number, t0: number, t1: number, a: number, b: number) => {
  const x = clamp((t - t0) / (t1 - t0));
  return a + (b - a) * x * x * (3 - 2 * x);
};
/** A short dip to `depth` centred on `at`, `width` seconds wide. */
const dip = (t: number, at: number, width: number, depth: number) =>
  1 - (1 - depth) * Math.exp(-(((t - at) / width) ** 2));

/**
 * The failure at `t` seconds: the machine's speed, as a share of normal,
 * and whether its lamps are lit. After `seconds` it holds its ending.
 */
export function failureAt(id: FailureId, t: number) {
  const { seconds } = FAILURES.find((f) => f.id === id)!;
  const end = t >= seconds;
  switch (id) {
    case 'hiccup': {
      // A stumble: it sags a little, some of its noises trip out and the
      // lamps blink, and then, as if nothing had happened, it carries on.
      if (end) return { speed: 1, lit: true };
      return {
        speed: dip(t, 0.35, 0.18, 0.82) * dip(t, 0.85, 0.12, 0.93),
        lit: !(t > 0.15 && t < 0.6 && Math.sin(t * 38) < 0),
      };
    }
    case 'sputter': {
      // It falters, catches, picks up hopefully, fails again, makes one
      // last feeble attempt and sputters to a standstill.
      if (end) return { speed: 0, lit: true };
      let speed: number;
      if (t < 0.6)
        speed =
          ease(t, 0, 0.55, 1, 0.55) *
          dip(t, 0.12, 0.07, 0.75) *
          dip(t, 0.38, 0.08, 0.7);
      else if (t < 1.5) speed = ease(t, 0.6, 1.5, 0.55, 0.95);
      else if (t < 2.2) speed = ease(t, 1.5, 2.2, 0.95, 1.1);
      else if (t < 3.2) speed = ease(t, 2.2, 3.2, 1.1, 0.4);
      else if (t < 4.1) speed = ease(t, 3.2, 4.1, 0.4, 0.62);
      else
        speed = ease(t, 4.1, seconds, 0.62, 0) * (1 - 0.08 * Math.sin(t * 11));
      return {
        speed,
        lit: !(t > 2.3 && t < 3.3 && Math.sin(t * 27) < -0.2),
      };
    }
    case 'restart': {
      // From a standstill it coughs, turns over, catches, stumbles, and
      // sputters back into life.
      if (end) return { speed: 1, lit: true };
      let speed: number;
      if (t < 1.1)
        speed =
          0.25 * clamp(t / 0.4) * (0.6 + 0.4 * Math.sin(t * Math.PI * 5) ** 2);
      else if (t < 1.6) speed = ease(t, 1.1, 1.6, 0.25, 0.7);
      else if (t < 2) speed = ease(t, 1.6, 2, 0.7, 0.55);
      else speed = ease(t, 2, seconds, 0.55, 1);
      return { speed, lit: t > 1.6 || Math.sin(t * 19) > -0.4 };
    }
    case 'kaput': {
      // The last time. It winds up, hopefully, for one more go; gives way
      // with a bang, sparks and a wobbling, sad "wah"; tries again,
      // desperately; sparks again; manages a last feeble turn; and slides
      // away to nothing, for good.
      if (end) return { speed: 0, lit: false };
      let speed: number;
      if (t < 1.3) speed = ease(t, 0, 1.3, 1, 1.4);
      else if (t < 2.5)
        speed =
          ease(t, 1.3, 2.5, 1.4, 0.5) +
          0.09 * Math.sin((t - 1.3) * Math.PI * 6) * clamp((t - 1.32) * 3);
      else if (t < 3.3) speed = ease(t, 2.5, 3.3, 0.5, 0.88);
      else if (t < 4.4) speed = ease(t, 3.3, 4.4, 0.88, 0.25);
      else if (t < 5) speed = ease(t, 4.4, 5, 0.25, 0.4);
      else
        speed =
          ease(t, 5, seconds - 0.2, 0.4, 0) * (1 - 0.07 * Math.sin(t * 8));
      return {
        speed: clamp(speed, 0, 2),
        lit:
          t < 1.3 ||
          (t < 5
            ? Math.sin(t * 29) > -0.25
            : speed > 0.2 && Math.sin(t * 13) > -0.6),
      };
    }
  }
}
