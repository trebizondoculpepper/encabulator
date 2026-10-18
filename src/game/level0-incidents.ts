/**
 * Level 0's random failures: one at a time, after a few minutes of
 * powered, functioning operation. The clock is simulation time (it stops
 * with the room) and the random source is injected, so a test can repeat
 * a choice and its timing exactly.
 */

/** The shortest and longest wait for a failure, seconds of operation. */
export const INCIDENT_MIN_SECONDS = 180;
export const INCIDENT_MAX_SECONDS = 300;

export interface IncidentConditions {
  /** Powered and functioning: the time that counts towards a failure. */
  operating: boolean;
  /**
   * Nothing is wrong: no fault condition is standing and no failed part is
   * installed. While anything is, no new failure comes.
   */
  healthy: boolean;
  /** What may fail now: installed, powered, healthy and able to fail so. */
  eligible: readonly string[];
}

export function createIncidentScheduler({
  random = Math.random,
  min = INCIDENT_MIN_SECONDS,
  max = INCIDENT_MAX_SECONDS,
}: { random?: () => number; min?: number; max?: number } = {}) {
  const fresh = () => min + random() * (max - min);
  let remaining = fresh();
  let incident: string | null = null;
  let wasHealthy = true;
  return {
    /** The failure now being dealt with, if any. */
    get incident() {
      return incident;
    },
    /** Seconds of healthy operation before the next failure. */
    get remaining() {
      return remaining;
    },
    /**
     * Advance by `dt` seconds; returns what to fail now, if anything. A
     * failure is over once the machine is healthy again, and every return
     * to health starts a fresh wait, so a long-paused clock can never bring
     * a second failure straight after a repair.
     */
    step(dt: number, conditions: IncidentConditions): string | null {
      const { operating, healthy, eligible } = conditions;
      const recovered = healthy && !wasHealthy;
      wasHealthy = healthy;
      if (recovered) {
        incident = null;
        remaining = fresh();
      }
      if (incident || !healthy || !operating) return null;
      remaining -= dt;
      if (remaining > 0 || eligible.length === 0) return null;
      incident = eligible[Math.floor(random() * eligible.length)];
      remaining = fresh();
      return incident;
    },
  };
}
