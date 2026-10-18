import { describe, expect, it } from 'vite-plus/test';
import { createLevel2FinalAction } from './level2-final-action';

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
