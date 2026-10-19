import { supplyVoltage } from '../toolkit/components/architectural/logic/supply-quality';

/**
 * The building's supply as Level 0's machine pulls it about: the warehouse
 * and the machine share one incoming supply, so the machine's load shows
 * in the building's lights. Each start of a motor draws several times its
 * running current for a moment and dips the supply (its inrush, from the
 * jump in the machine's load); a load above `OVERCAPACITY_AMPS` (the drive
 * near full speed, the panendermic fan on BOOST, worn parts drawing more)
 * held for `OVERCAPACITY_SECONDS` browns the building out, sagging the
 * supply and making it wander (`supply-quality.ts`'s brownout), until the
 * load comes down. A catastrophe (the machine's breakdown, a fire in its
 * wiring) surges the supply, swelling for a moment and then swinging
 * wildly, and trips the lighting (`trip`). And as the machine nears a
 * breakdown (its `strain`), the lights join the strangeness: brief dips
 * here and there that put the oldest tubes out, more and deeper as the
 * strain grows. Pure logic; volts as a fraction of nominal.
 */

/** Above this the machine is running over capacity, amps. */
export const OVERCAPACITY_AMPS = 145;
/** How long over capacity before the building browns out, seconds. */
export const OVERCAPACITY_SECONDS = 120;
/** How long the brownout takes to build, and to clear, seconds. */
export const BROWNOUT_BUILD = 30;
export const BROWNOUT_CLEAR = 20;
/** A motor start's dip per amp of the jump in load, and the deepest. */
export const INRUSH_PER_AMP = 0.012;
export const DEEPEST_DIP = 0.35;
/** How quickly a dip recovers, seconds (an exponential time constant). */
export const DIP_RECOVERY = 0.15;
/** A jump in load smaller than this, amps, is not a motor starting. */
const START_JUMP = 2;
/** A catastrophe's surge: its swell, and how long it swings, seconds. */
export const SURGE_SWELL = 0.3;
export const SURGE_SECONDS = 3;
/** When, into the surge, the lighting trips, seconds. */
export const SURGE_TRIPS_AT = 1.5;
/** From this strain the lights begin to misbehave. */
export const STRANGE_FROM = 0.15;
/** The steady sag of a fully loaded machine. */
const SAG_AT_FULL = 0.03;
const FULL_AMPS = 150;

/** A repeatable random number in [0, 1) for an integer and a salt. */
function hash(n: number, salt: number) {
  let h = Math.imul(n ^ Math.imul(salt, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createBuildingSupply() {
  let surge = Infinity;
  /** Seconds left of a brownout forced from outside (a symptom). */
  let forced = 0;
  let tripped = false;
  let last = 0;
  let dip = 0;
  let over = 0;
  let brownout = 0;
  let clock = 0;
  return {
    /** Advance `dt` seconds with the machine drawing `amps`: the voltage. */
    step(dt: number, amps: number, strain = 0) {
      dt = Math.max(0, dt);
      clock += dt;
      surge += dt;
      const jump = amps - last;
      last = amps;
      dip *= Math.exp(-dt / DIP_RECOVERY);
      if (jump > START_JUMP)
        dip = Math.min(DEEPEST_DIP, dip + jump * INRUSH_PER_AMP);
      if (amps > OVERCAPACITY_AMPS) over += dt;
      else over = Math.max(0, over - dt);
      forced = Math.max(0, forced - dt);
      if (
        forced > 0 ||
        (amps > OVERCAPACITY_AMPS && over > OVERCAPACITY_SECONDS)
      )
        brownout = Math.min(1, brownout + dt / BROWNOUT_BUILD);
      else if (amps <= OVERCAPACITY_AMPS || forced <= 0)
        brownout = Math.max(0, brownout - dt / BROWNOUT_CLEAR);
      const sag = (SAG_AT_FULL * Math.min(amps, FULL_AMPS)) / FULL_AMPS;
      const browned = (1 - supplyVoltage('brownout', clock)) * brownout;
      // Strangeness: in each quarter second, a chance of a brief dip.
      const slot = Math.floor(clock * 4);
      const strange =
        strain > STRANGE_FROM &&
        hash(slot, 11) < (strain - STRANGE_FROM) * 0.5 &&
        clock * 4 - slot < 0.35
          ? 0.12 + 0.12 * strain * hash(slot, 12)
          : 0;
      if (surge < SURGE_SWELL) return 1.12;
      if (surge < SURGE_SECONDS) return supplyVoltage('severe', clock);
      return Math.max(0, 1 - sag - browned - dip - strange);
    },
    /** A brownout for `seconds`, whatever the load (a symptom alone). */
    brownoutFor(seconds: number) {
      forced = seconds;
    },
    /** Put everything right: no surge, brownout or over-capacity. */
    clear() {
      surge = Infinity;
      forced = 0;
      over = 0;
      brownout = 0;
      dip = 0;
    },
    /** A catastrophe: the supply surges, and soon the lighting trips. */
    catastrophe() {
      surge = 0;
      tripped = false;
    },
    /** Whether the surge has just tripped the lighting (once a surge). */
    trip() {
      if (tripped || surge < SURGE_TRIPS_AT || surge > SURGE_SECONDS)
        return false;
      tripped = true;
      return true;
    },
    /** Whether a catastrophe's surge is under way. */
    get surging() {
      return surge < SURGE_SECONDS;
    },
    /** How browned out the building is, 0 to 1. */
    get brownout() {
      return brownout;
    },
    /** How long the machine has been over capacity, seconds. */
    get over() {
      return over;
    },
  };
}
