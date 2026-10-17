import type { LensDamage } from './lens-damage';
import { lensDamageLevel } from './lens-damage';

/**
 * The wandering button's stand (dev9) in every state of repair, for the
 * gallery in dev11: gleaming new, as it is in service, and then worse and
 * worse, each stand keeping every hurt of the one before it and adding
 * more, to a wreck. Drawn by `src/scene/stand-condition.ts`.
 *
 * Amounts run from 0 (none) to 1 (as bad as it gets).
 */
export interface StandCondition {
  /** Its number in the gallery and the caption under it. */
  name: string;
  caption: string;
  /** New, it is chrome-plated all over and glows; otherwise as built. */
  finish: 'chrome' | 'standard';
  /** Its lamp: lit, dark, or flickering on a failing contact. */
  lamp: 'on' | 'off' | 'flickering';
  lens: LensDamage;
  /** Scratches and scrapes in the post and base. */
  scratches: number;
  /** Dirt, hand marks and grime. */
  grime: number;
  /** Cracks in the control station's plastic case. */
  cracks: number;
  /** Rust coming through where the zinc is worn. */
  rust: number;
  /** Graffiti tags and stickers. */
  graffiti: number;
  /** Smoke stains: soot streaked up from below. */
  soot: number;
  /** Fire: the case blistered and sagging, the post's zinc burnt dark. */
  scorch: number;
  /** How far the post is bent, degrees from upright, at its bend. */
  bend: number;
  /** Whether the post is torn most of the way through at its bend. */
  severed: boolean;
  /** Castors broken off. */
  castorsMissing: number;
  /**
   * How much of whatever vital fluid the stand runs on has leaked out of
   * it: brown, glossy, run down the post and pooled on the floor.
   */
  leak: number;
}

export const STAND_CONDITIONS: readonly StandCondition[] = [
  {
    name: '1',
    caption: 'NEW',
    finish: 'chrome',
    lamp: 'on',
    lens: 'intact',
    scratches: 0,
    grime: 0,
    cracks: 0,
    rust: 0,
    graffiti: 0,
    soot: 0,
    scorch: 0,
    bend: 0,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '2',
    caption: 'IN SERVICE',
    finish: 'standard',
    lamp: 'off',
    lens: 'intact',
    scratches: 0,
    grime: 0,
    cracks: 0,
    rust: 0,
    graffiti: 0,
    soot: 0,
    scorch: 0,
    bend: 0,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '3',
    caption: 'WORN',
    finish: 'standard',
    lamp: 'off',
    lens: 'scuffed',
    scratches: 0.4,
    grime: 0.35,
    cracks: 0.15,
    rust: 0.05,
    graffiti: 0,
    soot: 0,
    scorch: 0,
    bend: 0,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '4',
    caption: 'KNOCKED ABOUT',
    finish: 'standard',
    lamp: 'off',
    lens: 'cracked',
    scratches: 0.6,
    grime: 0.5,
    cracks: 0.4,
    rust: 0.15,
    graffiti: 0,
    soot: 0,
    scorch: 0,
    bend: 9,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '5',
    caption: 'VANDALISED',
    finish: 'standard',
    lamp: 'off',
    lens: 'crazed',
    scratches: 0.75,
    grime: 0.6,
    cracks: 0.55,
    rust: 0.25,
    graffiti: 1,
    soot: 0.25,
    scorch: 0,
    bend: 16,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '6',
    caption: 'SET ON FIRE',
    finish: 'standard',
    lamp: 'off',
    lens: 'chipped',
    scratches: 0.8,
    grime: 0.75,
    cracks: 0.8,
    rust: 0.4,
    graffiti: 1,
    soot: 1,
    scorch: 1,
    bend: 22,
    severed: false,
    castorsMissing: 0,
    leak: 0,
  },
  {
    name: '7',
    caption: 'WRECKED',
    finish: 'standard',
    lamp: 'flickering',
    lens: 'shattered',
    scratches: 1,
    grime: 1,
    cracks: 1,
    rust: 0.7,
    graffiti: 1,
    soot: 1,
    scorch: 1,
    bend: 68,
    severed: true,
    castorsMissing: 1,
    leak: 0.85,
  },
];

/** Every amount of damage a condition has, as numbers, worse as they grow. */
export function damageOf(condition: StandCondition) {
  return {
    lens: lensDamageLevel(condition.lens),
    scratches: condition.scratches,
    grime: condition.grime,
    cracks: condition.cracks,
    rust: condition.rust,
    graffiti: condition.graffiti,
    soot: condition.soot,
    scorch: condition.scorch,
    bend: condition.bend,
    severed: condition.severed ? 1 : 0,
    castorsMissing: condition.castorsMissing,
    leak: condition.leak,
  };
}
