import { describe, expect, it } from 'vite-plus/test';
import { skipToVanish } from './appearing-skips';

const skips = (...born: number[]) => born.map((b, id) => ({ id, born: b }));
const set = (...ids: number[]) => new Set(ids);

describe('skips that come and go unseen', () => {
  it('takes the oldest away when the player looks away from one', () => {
    expect(skipToVanish(skips(1, 2), set(0), set())).toBe(0);
  });

  it('keeps the last skip, however often it is looked away from', () => {
    expect(skipToVanish(skips(1), set(0), set())).toBeNull();
  });

  it('does nothing while nothing leaves the view', () => {
    expect(skipToVanish(skips(1, 2), set(), set())).toBeNull();
    expect(skipToVanish(skips(1, 2), set(1), set(1))).toBeNull();
    expect(skipToVanish(skips(1, 2), set(), set(0))).toBeNull();
  });

  it('never takes a skip that is in view, even the oldest', () => {
    // The newest was looked away from; the oldest is still in view.
    expect(skipToVanish(skips(1, 2, 3), set(0, 2), set(0))).toBe(1);
    expect(skipToVanish(skips(1, 2), set(0, 1), set(0))).toBe(1);
  });

  it('takes nothing when every skip is in view', () => {
    expect(skipToVanish(skips(1, 2), set(0, 1), set(0, 1))).toBeNull();
  });

  it('ignores a skip already gone', () => {
    expect(skipToVanish(skips(1, 2), set(7), set())).toBeNull();
  });
});
