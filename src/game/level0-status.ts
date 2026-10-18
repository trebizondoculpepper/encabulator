/**
 * Level 0's annunciator as status lights: each window shows the state of
 * one subsystem, worst first.
 *
 * - off: the annunciator has no power;
 * - green flashing: waiting for its first update, as the module starts
 *   (pressure building, a controller booting) and as the annunciator
 *   powers up;
 * - green: on and OK;
 * - amber: sub-optimal, a warning;
 * - red: a failure, or the module off;
 * - red flashing: a critical failure, until it is acknowledged.
 */

export type Severity = 'warning' | 'failure' | 'critical';

export type StatusLight =
  | 'off'
  | 'green'
  | 'green-flash'
  | 'amber'
  | 'red'
  | 'red-flash';

/** How many times a second a flashing window flashes. */
export const STATUS_FLASH_HZ = 2;

const RANK: Record<Severity, number> = { warning: 1, failure: 2, critical: 3 };

/** The worst of some severities, or null for none. */
export function worstSeverity(
  severities: readonly Severity[],
): Severity | null {
  let worst: Severity | null = null;
  for (const severity of severities)
    if (!worst || RANK[severity] > RANK[worst]) worst = severity;
  return worst;
}

export interface WindowState {
  /** The annunciator has power. */
  powered: boolean;
  /** Its module is on: running, or ready for its PLC's command. */
  on: boolean;
  /** It is starting, not yet able to report. */
  starting: boolean;
  /** Its worst standing fault, if any. */
  worst: Severity | null;
  /** Its critical failure has been acknowledged (ACK). */
  acknowledged: boolean;
}

export function statusLight(window: WindowState): StatusLight {
  if (!window.powered) return 'off';
  switch (window.worst) {
    case 'critical':
      return window.acknowledged ? 'red' : 'red-flash';
    case 'failure':
      return 'red';
  }
  if (!window.on) return 'red';
  switch (window.worst) {
    case 'warning':
      return 'amber';
    default:
      return window.starting ? 'green-flash' : 'green';
  }
}

/** The colour a window shows at `seconds`, or null for dark. */
export function statusColour(
  light: StatusLight,
  seconds: number,
): 'green' | 'amber' | 'red' | null {
  const on = Math.floor(seconds * STATUS_FLASH_HZ * 2) % 2 === 0;
  switch (light) {
    case 'off':
      return null;
    case 'green-flash':
      return on ? 'green' : null;
    case 'red-flash':
      return on ? 'red' : null;
    default:
      return light;
  }
}

/** Seconds the scanner spends on each window: a 1980s scan, not real time. */
export const SCAN_SECONDS_PER_WINDOW = 0.2;

const BAD: readonly StatusLight[] = ['red', 'red-flash', 'amber'];

/**
 * The annunciator's slow scanner. It looks at one window at a time, in
 * turn, so a window changes only when the scan reaches it. Powered up,
 * every window waits for its first update, flashing green, until it is
 * first scanned. A window recovering from red or amber does not jump to
 * green: it flashes green for one scan, verifying, and goes steady green
 * at the next only if it is still well.
 */
export function createStatusScanner(
  count: number,
  { secondsPerWindow = SCAN_SECONDS_PER_WINDOW } = {},
) {
  let shown: StatusLight[] = Array.from({ length: count }, () => 'off');
  let powered = false;
  let next = 0;
  let wait = 0;
  return {
    /** What each window shows now. */
    get shown(): readonly StatusLight[] {
      return shown;
    },
    /**
     * Advance `dt` seconds with the annunciator's power and each window's
     * true status, scanning the windows whose turn comes.
     */
    step(dt: number, on: boolean, targets: readonly StatusLight[]) {
      if (!on) {
        powered = false;
        shown = shown.map(() => 'off');
        return shown;
      }
      if (!powered) {
        powered = true;
        shown = shown.map(() => 'green-flash');
        next = 0;
        wait = secondsPerWindow;
      }
      wait -= dt;
      while (wait <= 0) {
        wait += secondsPerWindow;
        const i = next;
        next = (next + 1) % count;
        const target = targets[i];
        const now = shown[i];
        shown = [...shown];
        shown[i] =
          target === 'green' && BAD.includes(now) ? 'green-flash' : target;
      }
      return shown;
    },
  };
}
