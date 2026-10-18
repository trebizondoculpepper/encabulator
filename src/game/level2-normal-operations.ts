/** Normal operation is established before either fault interrupts the lesson. */
export type NormalStage =
  | 'warmup'
  | 'normal'
  | 'oil'
  | 'stalling'
  | 'oil-off'
  | 'oil-on'
  | 'restarting'
  | 'reliability'
  | 'extra'
  | 'hydro'
  | 'finished';

interface LessonInput {
  delta: number;
  powered: boolean;
  oil: boolean;
  hydro: boolean;
  normalComplete: boolean;
  extraComplete: boolean;
  stalled: boolean;
  restarted: boolean;
  speaking: boolean;
}

export function createLevel2NormalOperations() {
  let stage: NormalStage = 'warmup';
  let warmup = 0;
  let oilArmed = false;
  let hydroArmed = false;
  return {
    get stage() {
      return stage;
    },
    step(input: LessonInput) {
      if (!input.powered) {
        if (stage === 'warmup') warmup = 0;
        return null;
      }
      switch (stage) {
        case 'warmup':
          warmup += input.delta;
          if (warmup < 7) return null;
          stage = 'normal';
          return 'normal' as const;
        case 'normal':
          if (!input.normalComplete || input.speaking) return null;
          stage = 'oil';
          oilArmed = !input.oil;
          return 'prime-oil' as const;
        case 'oil':
          if (!input.oil) oilArmed = true;
          if (!input.oil || !oilArmed) return null;
          stage = 'stalling';
          return 'stall' as const;
        case 'stalling':
          if (!input.stalled) return null;
          stage = 'oil-off';
          return 'cycle-oil' as const;
        case 'oil-off':
          if (!input.oil) stage = 'oil-on';
          return null;
        case 'oil-on':
          if (!input.oil) return null;
          stage = 'restarting';
          return 'reboot' as const;
        case 'restarting':
          if (!input.restarted) return null;
          stage = 'reliability';
          return 'reliability' as const;
        case 'reliability':
          if (input.speaking) return null;
          stage = 'extra';
          return 'extra' as const;
        case 'extra':
          if (!input.extraComplete) return null;
          stage = 'hydro';
          hydroArmed = !input.hydro;
          return 'prime-hydro' as const;
        case 'hydro':
          if (!input.hydro) hydroArmed = true;
          if (!input.hydro || !hydroArmed) return null;
          stage = 'finished';
          return 'failure' as const;
        case 'finished':
          return null;
      }
    },
  };
}

/** Draw without replacement, so the post-reboot operation is a fresh one. */
export function drawNormalOperations<T>(
  ids: readonly T[],
  random = Math.random,
) {
  if (ids.length < 3)
    throw new Error('The lesson needs three distinct operations');
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { initial: shuffled.slice(0, 2), extra: shuffled[2] };
}
