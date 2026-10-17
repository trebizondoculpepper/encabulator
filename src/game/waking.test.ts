import { describe, expect, it } from 'vite-plus/test';
import {
  AWAKE,
  JUMP_AT,
  EYES_OPEN,
  SHAKE_FROM,
  SHAKE_TO,
  WAKING_ENDS,
  createWaking,
  wakingAt,
} from './waking';

/** Every moment of the waking, a millisecond apart. */
const moments = (from = 0, to = WAKING_ENDS + 0.5) =>
  Array.from({ length: Math.round((to - from) * 1000) + 1 }, (_, i) =>
    Math.min(to, from + i / 1000),
  );

describe('waking up from the dream', () => {
  it('starts with the eyes open and the view clear', () => {
    expect(wakingAt(0)).toEqual({ ...AWAKE, holding: true });
  });

  it('shuts the eyes within a tenth of a second or so', () => {
    expect(wakingAt(0.11).open).toBe(0);
    expect(wakingAt(0.11).haze).toBe(1);
  });

  it('moves the camera only while the eyes are shut, at any frame rate', () => {
    // The jump comes on the first frame at or after JUMP_AT; frames are
    // never longer than a tenth of a second.
    for (const t of moments(JUMP_AT, JUMP_AT + 0.1))
      expect(wakingAt(t).open).toBe(0);
    for (const fps of [10, 24, 30, 60, 144]) {
      let open = -1;
      const waking = createWaking(() => {
        open = waking.update(0).open;
      });
      waking.begin();
      for (let i = 0; i < fps * 2; i++) waking.update(1 / fps);
      expect(open).toBe(0);
    }
  });

  it('moves the camera once a waking, and wakes again only once it is over', () => {
    let jumps = 0;
    const waking = createWaking(() => jumps++);
    waking.begin();
    for (let i = 0; i < 60; i++) waking.update(1 / 60);
    expect(waking.begin()).toBe(false);
    for (let i = 0; i < 600; i++) waking.update(1 / 60);
    expect(jumps).toBe(1);
    expect(waking.begin()).toBe(true);
    expect(waking.frame.holding).toBe(true);
    for (let i = 0; i < 600; i++) waking.update(1 / 60);
    expect(jumps).toBe(2);
  });

  it('blinks dizzily, opening wider each time, before the eyes are fully open', () => {
    // The peaks of each opening, and the shut eyes between them.
    const peaks: number[] = [];
    let rising = false;
    let last = 0;
    let shut = 0;
    for (const t of moments(JUMP_AT, EYES_OPEN)) {
      const { open } = wakingAt(t);
      if (open < last && rising) peaks.push(last);
      if (open === 0 && last > 0) shut++;
      rising = open > last;
      last = open;
    }
    expect(shut).toBeGreaterThanOrEqual(3);
    expect(peaks.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < peaks.length; i++)
      expect(peaks[i]).toBeGreaterThan(peaks[i - 1]);
    expect(Math.max(...peaks)).toBeLessThan(1);
    expect(wakingAt(EYES_OPEN).open).toBe(1);
  });

  it('clears the haze as it goes, and never thickens it again', () => {
    let last = 1;
    for (const t of moments(0.11)) {
      const { haze } = wakingAt(t);
      expect(haze).toBeLessThanOrEqual(last + 1e-12);
      last = haze;
    }
    expect(wakingAt(WAKING_ENDS).haze).toBe(0);
  });

  it('shakes the head awake while the eyes blink, smoothly from still to still', () => {
    const still = { yaw: 0, pitch: 0, roll: 0 };
    // Still until the eyes first open: never while the camera jumps.
    expect(SHAKE_FROM).toBeGreaterThan(JUMP_AT + 0.1);
    for (const t of moments(0, SHAKE_FROM))
      expect(wakingAt(t).shake).toEqual(still);
    expect(wakingAt(SHAKE_TO).shake).toEqual(still);
    let most = 0;
    let whileBlinking = 0;
    let last = wakingAt(SHAKE_FROM).shake;
    for (const t of moments(SHAKE_FROM, SHAKE_TO)) {
      const { shake, open } = wakingAt(t);
      most = Math.max(most, Math.abs(shake.yaw));
      if (open > 0 && open < 1)
        whileBlinking = Math.max(whileBlinking, Math.abs(shake.yaw));
      // A millisecond never moves the head more than a few milliradians.
      expect(Math.abs(shake.yaw - last.yaw)).toBeLessThan(0.005);
      expect(Math.abs(shake.pitch - last.pitch)).toBeLessThan(0.005);
      expect(Math.abs(shake.roll - last.roll)).toBeLessThan(0.005);
      last = shake;
    }
    // It shakes hard while the eyes are half open, not only afterwards.
    expect(whileBlinking).toBeGreaterThan(0.06);
    expect(most).toBeGreaterThan(0.08);
    expect(most).toBeLessThan(0.2);
  });

  it('holds the player until it ends, then gives the camera back', () => {
    for (const t of moments(0, WAKING_ENDS - 0.001))
      expect(wakingAt(t).holding).toBe(true);
    expect(wakingAt(WAKING_ENDS)).toEqual(AWAKE);
    const waking = createWaking(() => {});
    expect(waking.update(1).holding).toBe(false);
    waking.begin();
    expect(waking.update(0.5).holding).toBe(true);
    for (let i = 0; i < 100; i++) waking.update(0.1);
    expect(waking.frame).toEqual(AWAKE);
    expect(waking.woken).toBe(true);
    waking.reset();
    expect(waking.woken).toBe(false);
    expect(waking.begin()).toBe(true);
  });
});
