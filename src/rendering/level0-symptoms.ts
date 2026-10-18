import { sootAfter } from '../game/machine-failure';
import { createUnitSmoke } from '../scene/mcc-smoke';
import { UNITS } from '../scene/level0-faces';
import type { createLevel0Machine } from './level0-machine';

type Level0Machine = ReturnType<typeof createLevel0Machine>;

/** Seconds an oil leak symptom takes to spread its full width. */
export const LEAK_SECONDS = 60;
/** A fire symptom: seconds its smoke thickens, pours, then clears. */
export const FIRE_SECONDS = { catching: 4, burning: 25, dying: 10 } as const;
/** The units a fire symptom smokes out of: the drive's section. */
const BURNING = [UNITS.driveIsolator, UNITS.auxDrive] as const;
/** A dimensional warp symptom: seconds building, holding, then gone. */
export const WARP_SECONDS = { building: 8, holding: 12 } as const;
/** How strong a warp symptom gets, as strain: just short of breakdown. */
const WARP_STRAIN = 0.95;

/**
 * The scenario simulator's SYMPTOMS: a failure's effects alone, without
 * the cause that would bring them in play, for trying them out. OIL LEAK
 * spreads oil over the floor from the lube section without any loss of
 * pressure; FIRE pours smoke out of the seams of the drive's units,
 * sooting the faces above them, until it clears (the soot stays); and
 * DIMENSIONAL WARP builds the strangeness almost to breakdown, holds it,
 * and stops abruptly. RESET puts each away.
 */
export function createLevel0Symptoms(machine: Level0Machine) {
  const { mcc } = machine;
  let leak = 0;
  let leaking = false;
  let fireAge = -1;
  let warpAge = -1;
  // The fire: no flames, only smoke pouring from round the doors of the
  // units it burns in, and the soot it leaves on the faces above them.
  // (The components inside, ruined, come later.)
  const fires = BURNING.map((id, i) => {
    const source = mcc.unitFaces.get(id)!;
    const faces = [...mcc.unitFaces.values()]
      .filter(
        (u) => u.bay === source.bay && u.face.bottom >= source.face.bottom,
      )
      .map((u) => u.face);
    return {
      soot: 0,
      view: createUnitSmoke(source.section, {
        x: source.centre,
        width: source.face.width,
        seam: source.face.top + 0.003,
        z: mcc.doorFront,
        seed: 5200 + i,
        faces,
      }),
    };
  });
  let clock = 0;
  const fireSize = () => {
    const { catching, burning, dying } = FIRE_SECONDS;
    if (fireAge < 0) return 0;
    if (fireAge < catching) return fireAge / catching;
    if (fireAge < catching + burning) return 1;
    return Math.max(0, 1 - (fireAge - catching - burning) / dying);
  };
  return {
    /** OIL LEAK: oil spreads over the floor, the pressure untouched. */
    oilLeak() {
      leaking = true;
    },
    /** FIRE: smoke from the drive's units, soot on the faces above. */
    fire() {
      fireAge = 0;
    },
    /** DIMENSIONAL WARP: strangeness almost to breakdown, then gone. */
    warp() {
      warpAge = 0;
    },
    /** Put every symptom away. */
    reset() {
      leak = 0;
      leaking = false;
      fireAge = -1;
      warpAge = -1;
      // Cleaned up, as if it had never burnt.
      for (const f of fires) f.soot = 0;
    },
    /** Oil the leak symptom has spread, 0 to 1, on top of the model's. */
    get spill() {
      return leak;
    },
    /** Strain the warp symptom forces, 0 to 1; 0 again once it ends. */
    get strain() {
      const { building, holding } = WARP_SECONDS;
      if (warpAge < 0 || warpAge >= building + holding) return 0;
      return WARP_STRAIN * Math.min(1, warpAge / building);
    },
    /** How sooted the most sooted face is, 0 to 1. */
    get soot() {
      return Math.max(...fires.map((f) => f.soot));
    },
    get burning() {
      return fireSize() > 0;
    },
    update(delta: number) {
      if (leaking) leak = Math.min(1, leak + delta / LEAK_SECONDS);
      if (fireAge >= 0) {
        fireAge += delta;
        const { catching, burning, dying } = FIRE_SECONDS;
        if (fireAge > catching + burning + dying) fireAge = -1;
      }
      if (warpAge >= 0) {
        warpAge += delta;
        if (warpAge >= WARP_SECONDS.building + WARP_SECONDS.holding)
          warpAge = -1;
      }
      clock += delta;
      const strength = fireSize();
      for (const f of fires) {
        f.soot = sootAfter(f.soot, strength, delta);
        f.view.update(clock, strength, f.soot);
      }
    },
    dispose() {
      for (const f of fires) f.view.dispose();
    },
  };
}

export type Level0Symptoms = ReturnType<typeof createLevel0Symptoms>;
