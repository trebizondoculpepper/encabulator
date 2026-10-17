import { computed, signal } from '@preact/signals-core';
import type { Readable } from './world/components';

/** A short, repeatable lamp/display self-test after the supply returns. */
export function createMachinePower(supply: Readable<boolean>) {
  const elapsed = signal(0);
  let previous = false;
  const speed = signal(0);
  const lit = computed(
    () =>
      supply.value &&
      (elapsed.value >= 2.4 || Math.floor(elapsed.value / 0.18) % 2 === 0),
  );
  return {
    lit,
    speed,
    step(delta: number) {
      speed.value = supply.value
        ? Math.min(1, speed.value + delta / 2)
        : Math.max(0, speed.value - delta / 5);
      if (!supply.value || !previous) elapsed.value = 0;
      else elapsed.value += delta;
      previous = supply.value;
    },
  };
}
