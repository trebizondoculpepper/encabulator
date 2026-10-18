/**
 * The machine's stack light, red over amber over green, as it tells the
 * state of the whole line-up: red flashing in a fault (any failure but a
 * restart), amber while it boots or restarts, green in normal running,
 * and dark without power. In a fault it runs on the station battery, so
 * it still flashes once the main breaker has tripped.
 */
export interface MachineState {
  /** Whether the machine has power: the main disconnect closed. */
  powered: boolean;
  /** Whether the station battery is charged: the incoming isolator on. */
  battery: boolean;
  /** Whether a failure is in, and whether that failure is a restart. */
  fault: boolean;
  restarting: boolean;
  /** Whether it is still coming up: its lamp test or a screen's boot. */
  booting: boolean;
}

/** How many times a second the red tier flashes. */
export const BEACON_FLASH_HZ = 1.5;

/** Which tiers are lit at `seconds`: red, amber, green. */
export function stackLightAt(
  state: MachineState,
  seconds: number,
): [boolean, boolean, boolean] {
  if (state.fault && !state.restarting) {
    const flash = Math.floor(seconds * BEACON_FLASH_HZ * 2) % 2 === 0;
    return [state.battery && flash, false, false];
  }
  if (!state.powered) return [false, false, false];
  if (state.restarting || state.booting) return [false, true, false];
  return [false, false, true];
}
