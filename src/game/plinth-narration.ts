import type { Arrival, ExhibitId } from './plinths';

export interface NarrationCue {
  clip: number;
  /** A more immediate moment may interrupt an earlier line. */
  priority: number;
  /** Used to leave a breath between lines about the same exhibit. */
  shape?: ExhibitId;
}

/** Choose the recorded line for each moment in the plinth room. */
export function createPlinthNarration() {
  const turns = new Map<string, number>();
  const once = new Set<number>();
  let active: ExhibitId | null = null;
  let atSeconds = 0;
  let darkSeconds = 0;
  let lingerCount = 0;
  let nearExitBefore = false;
  let visits = 0;

  const rotate = (key: string, clips: readonly number[]) => {
    const turn = turns.get(key) ?? 0;
    turns.set(key, turn + 1);
    return clips[turn % clips.length];
  };
  const unique = (clip: number, priority: number): NarrationCue | null => {
    if (once.has(clip)) return null;
    once.add(clip);
    return { clip, priority };
  };
  const arriving = (arrival: Arrival): NarrationCue => {
    const { at, previous, visit } = arrival;
    if (at === 'sphere') {
      if (previous === 'rhombus')
        return { clip: rotate('rhombus-to-sphere', [19, 20]), priority: 3 };
      if (previous === 'helix') return { clip: 7, priority: 3 };
      return { clip: visit === 1 ? 1 : 27, priority: 3 };
    }
    if (at === 'rhombus') {
      if (previous === 'sphere') return { clip: 18, priority: 3 };
      if (previous === 'helix') return { clip: 6, priority: 3 };
      return { clip: visit === 1 ? 2 : 9, priority: 3 };
    }
    if (previous === 'sphere') return { clip: 25, priority: 3 };
    if (previous === 'rhombus') return { clip: 26, priority: 3 };
    return { clip: visit === 1 ? 4 : 28, priority: 3 };
  };

  return {
    enter: () => unique(29, 4),
    update(
      delta: number,
      now: ExhibitId | null,
      arrival: Arrival | null,
      nearExit: boolean,
    ): NarrationCue | null {
      if (nearExit && !nearExitBefore) {
        nearExitBefore = true;
        const exit = unique(visits ? 31 : 30, 5);
        if (exit) return exit;
      }
      if (!nearExit) nearExitBefore = false;
      if (arrival) {
        visits++;
        active = now;
        atSeconds = 0;
        darkSeconds = 0;
        lingerCount = 0;
        return { ...arriving(arrival), shape: arrival.at };
      }
      if (active && !now) {
        const left = active;
        active = null;
        darkSeconds = 0;
        return {
          clip: rotate(
            `leave-${left}`,
            {
              sphere: [12, 13],
              rhombus: [3, 15, 16, 17],
              helix: [8, 14],
            }[left],
          ),
          priority: 2,
        };
      }
      active = now;
      if (now) {
        atSeconds += delta;
        darkSeconds = 0;
        const thresholds = [8, 28];
        if (
          lingerCount < thresholds.length &&
          atSeconds >= thresholds[lingerCount]
        ) {
          const clips = {
            sphere: [21, 34, 22, 35, 36, 37, 38, 48, 49],
            rhombus: [23, 43, 44, 45, 46, 47],
            helix: [5, 39, 24, 40, 41, 42],
          }[now];
          const clip = rotate(`linger-${now}`, clips);
          lingerCount++;
          return clip ? { clip, priority: 1, shape: now } : null;
        }
      } else {
        darkSeconds += delta;
        // Clip 10 runs for about 25 seconds. Leave a long stretch of quiet
        // after it before the second darkness line.
        if (darkSeconds >= 70) return unique(11, 1);
        if (darkSeconds >= 14) return unique(10, 1);
      }
      return null;
    },
  };
}
