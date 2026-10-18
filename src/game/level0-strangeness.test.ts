import { expect, it } from 'vite-plus/test';
import { NORMAL, strangeness } from './level0-strangeness';

it('is perfectly normal without strain', () => {
  expect(strangeness(0, false)).toEqual(NORMAL);
  expect(strangeness(0.1, false)).toEqual(NORMAL);
});

it('builds as the machine nears breakdown, the subtlest effects first', () => {
  const early = strangeness(0.3, false);
  expect(early.ghosting).toBeGreaterThan(0);
  expect(early.activity).toBeGreaterThan(0);
  expect(early.patterns).toBe(0);
  expect(early.apparitionsPerMinute).toBe(0);
  const middle = strangeness(0.6, false);
  expect(middle.patterns).toBeGreaterThan(0);
  expect(middle.apparitionsPerMinute).toBeGreaterThan(0);
  const late = strangeness(0.99, false);
  for (const key of Object.keys(late) as (keyof typeof late)[])
    expect(late[key]).toBeGreaterThanOrEqual(middle[key]);
  expect(late.activity).toBeGreaterThan(middle.activity);
});

it('stops at once when the machine breaks down: normality ensues', () => {
  expect(strangeness(1, true)).toEqual(NORMAL);
  expect(strangeness(0.95, true)).toEqual(NORMAL);
});
