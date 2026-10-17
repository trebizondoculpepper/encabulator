import { effect } from '@preact/signals-core';
import type { Readable } from '../game/world/components';
import type { LoopRecipe } from './part-audio';

/** The drive train winds up and coasts, losing both pitch and loudness. */
export function machineHum(speed: Readable<number>): LoopRecipe {
  return (context, out) => {
    const gain = context.createGain();
    gain.connect(out);
    const oscillators = [60, 120, 181].map((hz, i) => {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      partial.gain.value = [0.8, 0.3, 0.08][i];
      oscillator.connect(partial).connect(gain);
      oscillator.start();
      return { oscillator, partial, hz };
    });
    const stop = effect(() => {
      const level = speed.value;
      gain.gain.setTargetAtTime(
        0.11 * level * level,
        context.currentTime,
        0.08,
      );
      for (const { oscillator, hz } of oscillators)
        oscillator.frequency.setTargetAtTime(
          hz * (0.35 + 0.65 * level),
          context.currentTime,
          0.08,
        );
    });
    return [
      {
        stop(when?: number) {
          stop();
          for (const { oscillator, partial } of oscillators) {
            oscillator.stop(when);
            oscillator.onended = () => {
              oscillator.disconnect();
              partial.disconnect();
            };
          }
          oscillators[0].oscillator.addEventListener('ended', () =>
            gain.disconnect(),
          );
        },
      },
    ];
  };
}
