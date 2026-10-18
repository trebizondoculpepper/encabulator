import { computed, signal } from '@preact/signals-core';
import { createSwitch } from '../../core/logic/world/components';

export type ScreenLine = readonly [text: string, ink: string];
export const BBC_LOAD_SECONDS = 4.5;

/** The standalone exhibit's boot; a future diagnostic link can supply live text. */
export function createBbcComputer() {
  const power = createSwitch({ initial: false });
  const elapsed = signal(0);
  const stop = power.onEvent(() => {
    elapsed.value = 0;
  });
  const phase = computed(() =>
    !power.state.value
      ? 'off'
      : elapsed.value < 2
        ? 'boot'
        : elapsed.value < BBC_LOAD_SECONDS
          ? 'loading'
          : 'ready',
  );
  const lines = computed<readonly ScreenLine[]>(() => {
    if (phase.value === 'off' || elapsed.value < 0.25) return [];
    const boot: ScreenLine[] = [
      ['BBC Computer 32K', '#f2f2ee'],
      ['Acorn DFS', '#f2f2ee'],
      ['', '#f2f2ee'],
      ['BASIC', '#f2f2ee'],
    ];
    if (phase.value === 'boot') return boot;
    if (phase.value === 'loading')
      return [
        ...boot,
        ['>CHAIN "DIAG"', '#f2f2ee'],
        ['Loading diagnostics...', '#f2f2ee'],
      ];
    return [
      ['NEUMANN DYNAMIK', '#5fe0e8'],
      ['BBC MICRO DIAGNOSTICS', '#f2f2ee'],
      ['', '#f2f2ee'],
      ['RETRO COMPUTING EXHIBIT', '#f4e04a'],
      ['', '#f2f2ee'],
      ['RAM              32K', '#6ef06e'],
      ['FLOPPY DRIVE     READY', '#6ef06e'],
      ['DIAGNOSTIC LINK  NOT CONNECTED', '#f4e04a'],
      ['', '#f2f2ee'],
      ['Standalone demonstration', '#f2f2ee'],
    ];
  });
  return {
    power,
    elapsed,
    phase,
    lines,
    step(delta: number) {
      if (power.state.value)
        elapsed.value = Math.min(
          BBC_LOAD_SECONDS,
          elapsed.value + Math.max(0, delta),
        );
    },
    dispose() {
      stop();
      power.dispose();
    },
  };
}
