import { signal } from '@preact/signals-core';

/** One selected cue repeats every five seconds; pressing it again stops it. */
export function createComputerCueSelector(
  count: number,
  play: (index: number) => void,
) {
  const selected = signal<number | null>(null);
  let elapsed = 0;
  return {
    selected,
    select(index: number) {
      if (!Number.isInteger(index) || index < 0 || index >= count) return;
      selected.value = selected.value === index ? null : index;
      elapsed = 0;
      if (selected.value !== null) play(selected.value);
    },
    step(delta: number) {
      if (selected.value === null) return;
      elapsed += Math.max(0, delta);
      if (elapsed >= 5) {
        elapsed %= 5;
        play(selected.value);
      }
    },
  };
}
