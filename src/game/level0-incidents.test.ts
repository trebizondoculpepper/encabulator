import { describe, expect, it } from 'vite-plus/test';
import {
  INCIDENT_MAX_SECONDS,
  INCIDENT_MIN_SECONDS,
  createIncidentScheduler,
} from './level0-incidents';

/** A repeatable random sequence. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const running = { operating: true, healthy: true, eligible: ['a', 'b', 'c'] };

/** Run until something fails, or `limit` seconds pass. */
function until(
  scheduler: ReturnType<typeof createIncidentScheduler>,
  conditions = running,
  limit = 1000,
) {
  for (let t = 0; t < limit; t += 0.5) {
    const failed = scheduler.step(0.5, conditions);
    if (failed) return { failed, t: t + 0.5 };
  }
  return null;
}

describe('Level 0 random failures', () => {
  it('waits three to five minutes of operation, then picks one eligible part', () => {
    const scheduler = createIncidentScheduler({ random: sequence(0.5, 0.7) });
    const first = until(scheduler)!;
    expect(first.t).toBeCloseTo(
      INCIDENT_MIN_SECONDS +
        0.5 * (INCIDENT_MAX_SECONDS - INCIDENT_MIN_SECONDS),
      0,
    );
    expect(first.failed).toBe('c');
  });

  it('repeats the same choice and timing from the same random source', () => {
    const a = until(createIncidentScheduler({ random: sequence(0.2, 0.4) }));
    const b = until(createIncidentScheduler({ random: sequence(0.2, 0.4) }));
    expect(a).toEqual(b);
  });

  it('counts only powered, functioning operation', () => {
    const scheduler = createIncidentScheduler({ random: () => 0 });
    expect(until(scheduler, { ...running, operating: false }, 2000)).toBeNull();
    expect(scheduler.remaining).toBe(INCIDENT_MIN_SECONDS);
  });

  it('allows one failure at a time, and none while anything is wrong', () => {
    const scheduler = createIncidentScheduler({ random: () => 0 });
    until(scheduler);
    expect(scheduler.incident).toBe('a');
    // Its consequences are not new failures, however long they last.
    expect(until(scheduler, { ...running, healthy: false }, 2000)).toBeNull();
    expect(until(scheduler, running, 2000)).not.toBeNull();
  });

  it('starts a fresh wait after a repair, not an accumulated one', () => {
    const scheduler = createIncidentScheduler({ random: () => 0 });
    until(scheduler);
    scheduler.step(1, { ...running, healthy: false });
    scheduler.step(1, running);
    expect(scheduler.incident).toBeNull();
    expect(scheduler.remaining).toBe(INCIDENT_MIN_SECONDS - 1);
    // A fault the player made pauses it, and recovery starts afresh too.
    for (let t = 0; t < 170; t++) scheduler.step(1, running);
    scheduler.step(1, { ...running, healthy: false });
    scheduler.step(1, running);
    expect(scheduler.remaining).toBe(INCIDENT_MIN_SECONDS - 1);
  });

  it('fails nothing when nothing is eligible', () => {
    const scheduler = createIncidentScheduler({ random: () => 0 });
    expect(until(scheduler, { ...running, eligible: [] }, 2000)).toBeNull();
  });
});
