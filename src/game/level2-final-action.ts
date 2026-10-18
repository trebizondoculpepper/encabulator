import { createNarrationPause } from './narration-pause';

/** A fresh TEST press after the recovery speech licenses the final failure. */
export function createLevel2FinalAction() {
  let baseline: number | null = null;
  let taken = false;
  return {
    arm(presses: number) {
      baseline = presses;
    },
    take(presses: number, speaking: boolean) {
      if (baseline === null || taken || speaking || presses <= baseline)
        return false;
      taken = true;
      return true;
    },
  };
}

/** The farewell must finish, then twenty quiet seconds precede the recital. */
export function createLevel2Closing() {
  const pause = createNarrationPause(20);
  let stage: 'farewell' | 'recital' | 'done' = 'farewell';
  return {
    step(delta: number, speaking: boolean): 'recite' | 'complete' | null {
      if (stage === 'farewell') {
        pause.step(delta, speaking);
        if (!speaking && pause.take()) {
          stage = 'recital';
          return 'recite';
        }
      } else if (stage === 'recital' && !speaking) {
        stage = 'done';
        return 'complete';
      }
      return null;
    },
  };
}
