import { describe, expect, it } from 'vite-plus/test';
import {
  createLevel2NormalOperations,
  drawNormalOperations,
} from './level2-normal-operations';

function fixture() {
  const lesson = createLevel2NormalOperations();
  const input = {
    delta: 0,
    powered: true,
    oil: false,
    hydro: false,
    normalComplete: false,
    extraComplete: false,
    stalled: false,
    restarted: false,
    speaking: false,
  };
  const step = (patch: Partial<typeof input> = {}) => {
    Object.assign(input, patch);
    return lesson.step(input);
  };
  return { lesson, step };
}

describe('the normal-operation lesson', () => {
  it('establishes normal operation before the first oil-pump fault', () => {
    const { lesson, step } = fixture();
    expect(step({ delta: 6 })).toBeNull();
    expect(step({ delta: 1 })).toBe('normal');
    // Early pump operation cannot bypass the three normal adjustments.
    expect(step({ delta: 0, oil: true, hydro: true })).toBeNull();
    expect(lesson.stage).toBe('normal');
    expect(step({ normalComplete: true })).toBe('prime-oil');
    // A pump left on prematurely must still be operated for its task.
    expect(step()).toBeNull();
    expect(step({ oil: false })).toBeNull();
    expect(step({ oil: true })).toBe('stall');
  });

  it('waits for an actual stop, an OFF/ON cycle, reboot and reliability speech', () => {
    const { lesson, step } = fixture();
    expect(step({ delta: 7 })).toBe('normal');
    expect(step({ delta: 0, normalComplete: true })).toBe('prime-oil');
    expect(step({ oil: true })).toBe('stall');
    expect(step({ delta: 60 })).toBeNull();
    expect(lesson.stage).toBe('stalling');
    expect(step({ delta: 0, stalled: true })).toBe('cycle-oil');
    expect(step({ delta: 60 })).toBeNull();
    expect(lesson.stage).toBe('oil-off');
    expect(step({ delta: 0, oil: false })).toBeNull();
    expect(lesson.stage).toBe('oil-on');
    expect(step({ oil: true })).toBe('reboot');
    expect(step({ stalled: false })).toBeNull();
    expect(step({ restarted: true })).toBe('reliability');
    expect(step({ speaking: true })).toBeNull();
    expect(step({ speaking: false })).toBe('extra');
    expect(step()).toBeNull();
    expect(step({ extraComplete: true })).toBe('prime-hydro');
    expect(step({ hydro: true })).toBe('failure');
    expect(step()).toBeNull();
  });

  it('requires seven consecutive powered seconds before the readout line', () => {
    const { step } = fixture();
    expect(step({ delta: 6 })).toBeNull();
    expect(step({ powered: false, delta: 10 })).toBeNull();
    expect(step({ powered: true, delta: 6 })).toBeNull();
    expect(step({ delta: 1 })).toBe('normal');
  });

  it('draws three distinct operations and a different additional instruction', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const { initial, extra } = drawNormalOperations(ids, random);
      expect(initial).toHaveLength(3);
      expect(new Set([...initial, extra]).size).toBe(4);
      for (const id of [...initial, extra]) expect(ids).toContain(id);
    }
  });
});
