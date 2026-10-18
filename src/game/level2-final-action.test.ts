import { describe, expect, it } from 'vite-plus/test';
import {
  createLevel2Closing,
  createLevel2FinalAction,
} from './level2-final-action';

describe('Level 2 final action', () => {
  it('requires a new TEST press after recovery and fires once', () => {
    const action = createLevel2FinalAction();
    expect(action.take(2, false)).toBe(false);
    action.arm(2);
    expect(action.take(2, false)).toBe(false);
    expect(action.take(3, true)).toBe(false);
    expect(action.take(3, false)).toBe(true);
    expect(action.take(4, false)).toBe(false);
  });
});

it('waits twenty quiet seconds after the farewell, then finishes only after the recital', () => {
  const closing = createLevel2Closing();
  expect(closing.step(30, true)).toBeNull();
  expect(closing.step(19, false)).toBeNull();
  expect(closing.step(1, true)).toBeNull();
  expect(closing.step(19, false)).toBeNull();
  expect(closing.step(1, false)).toBe('recite');
  expect(closing.step(60, true)).toBeNull();
  expect(closing.step(0.1, false)).toBe('complete');
  expect(closing.step(30, false)).toBeNull();
});
