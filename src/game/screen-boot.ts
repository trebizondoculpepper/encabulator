import type { Readable } from './world/components';

export const SCREEN_BOOT_SECONDS = 15;

/** Original BSD-style diagnostics, kept short enough for small text displays. */
const DIAGNOSTICS = [
  'EncabOS/ND 4.2',
  'Neuman Dynamik',
  'Booting kernel',
  'mem0: 16384K OK',
  'cpu0: ND/486',
  'isa0 at mainbus0',
  'vx0: modial bus',
  'io0: 24V field',
  'dingle0: found',
  'spurv0: found',
  'gram0: nominal',
  'Mounting root...',
  'fsck: clean',
  'Starting init',
  'Checking phase',
  'Loading vectors',
  'Modial sync: OK',
  'Starting encabd',
  'Network: local',
  'Services ready',
];

/** Each screen owns its clock, so its local supply can restart it independently. */
export function createScreenBoot(supply: Readable<boolean>, device: string) {
  let elapsed = 0;
  return {
    step(delta: number) {
      elapsed = supply.value
        ? Math.min(SCREEN_BOOT_SECONDS, elapsed + delta)
        : 0;
    },
    get booting() {
      return supply.value && elapsed < SCREEN_BOOT_SECONDS;
    },
    lines(rows = 12, columns = 48): string[] {
      const count = Math.min(
        DIAGNOSTICS.length,
        1 + Math.floor((elapsed / SCREEN_BOOT_SECONDS) * DIAGNOSTICS.length),
      );
      return [`ND boot: ${device}`, ...DIAGNOSTICS.slice(0, count)]
        .slice(-rows)
        .map((line) => line.slice(0, columns));
    },
  };
}
