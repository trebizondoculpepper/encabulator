import type { StatusLight } from './level0-status';

/** Transient false positives from Neumann Link 1.0. Only the indicated
 * colour changes; the scanned status and the underlying fault do not.
 */
export function createLinkGlitches(
  count: number,
  { random = Math.random, firstAfter = 60 + random() * 30 } = {},
) {
  let next = firstAfter;
  let active = -1;
  let remaining = 0;
  let wasPowered = false;
  return {
    step(
      dt: number,
      powered: boolean,
      shown: readonly StatusLight[],
      targets: readonly StatusLight[],
    ): readonly StatusLight[] {
      if (!powered) {
        active = -1;
        remaining = 0;
        if (wasPowered) next = 60 + random() * 30;
        wasPowered = false;
        return shown;
      }
      wasPowered = true;
      if (active >= 0) {
        remaining -= dt;
        if (
          remaining <= 0 ||
          shown[active] !== 'green' ||
          targets[active] !== 'green'
        ) {
          active = -1;
          remaining = 0;
          next = 45 + random() * 45;
        }
      } else {
        next -= dt;
        if (next <= 0) {
          const healthy = Array.from({ length: count }, (_, i) => i).filter(
            (i) => shown[i] === 'green' && targets[i] === 'green',
          );
          if (healthy.length) {
            active = healthy[Math.floor(random() * healthy.length)];
            remaining = 1.5 + random() * 2;
          } else next = 5;
        }
      }
      if (active < 0) return shown;
      const displayed = [...shown];
      displayed[active] = 'amber';
      return displayed;
    },
  };
}
