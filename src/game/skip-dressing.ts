/**
 * How a skip is dressed beyond its paint: spray-painted graffiti tags on
 * its sides and ends, and amber flashing skip lamps clamped to its top
 * rail's corners, as councils require of a skip left on the road after
 * dark (one at each corner, at least 1 candela, flashing or steady, the
 * battery lamps that clip to a skip and light themselves at dusk). Not
 * every skip has either: each is chosen at random. Pure logic.
 */

/** A face of a skip: its two long sides, and its two sloping ends. */
export type SkipFace = 'front' | 'back' | 'left' | 'right';
/** A corner of its top rail, by its end (-1 left, 1 right) and side. */
export interface SkipCorner {
  end: -1 | 1;
  side: -1 | 1;
}

export interface GraffitiTag {
  face: SkipFace;
  /** Across the face, -1 to 1, and up it, 0 (bottom) to 1 (top). */
  u: number;
  v: number;
  text: string;
  colour: string;
  /** Letter height, metres, and slant, radians. */
  size: number;
  angle: number;
  /** Whether it is outlined in a second colour. */
  outline: string | null;
}

export interface SkipLamp extends SkipCorner {
  /** Where in its flash it starts, 0 to 1, so lamps never flash as one. */
  phase: number;
}

export interface SkipDressing {
  tags: GraffitiTag[];
  lamps: SkipLamp[];
}

/** How often a skip has graffiti, and lamps. */
export const GRAFFITI_CHANCE = 0.7;
export const LAMP_CHANCE = 0.4;
/** A skip lamp flashes once a second, briefly. */
export const FLASH_SECONDS = 1;
export const FLASH_ON = 0.18;

export const SPRAY_COLOURS = [
  '#e8306b',
  '#2fd0e0',
  '#f5e23a',
  '#7ee04a',
  '#f5f5f5',
  '#1a1a1a',
  '#8b5cf6',
  '#ff7a1a',
];
export const TAG_WORDS = [
  'ZOK',
  'KRAK',
  'OI',
  'NOPE',
  'DAZ',
  'BOSH',
  'SKUD',
  'WOT',
  'KEV',
  'GRIM',
  'X',
  '2 COOL',
];

const pick = <T>(list: readonly T[], random: () => number) =>
  list[Math.floor(random() * list.length)];

/**
 * A skip's dressing at random: perhaps a few tags, sprayed on its long
 * sides either side of the hire firm's name and low on its ends below
 * the marker boards; perhaps lamps, on two or all four corners.
 */
export function dressSkip(random: () => number = Math.random): SkipDressing {
  const tags: GraffitiTag[] = [];
  if (random() < GRAFFITI_CHANCE) {
    const count = 1 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) {
      const face = pick(['front', 'back', 'left', 'right'] as const, random);
      const end = face === 'left' || face === 'right';
      tags.push({
        face,
        // On a side, clear of the firm's name in the middle panel.
        u: end
          ? (random() * 2 - 1) * 0.55
          : (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.35),
        v: end ? 0.12 + random() * 0.25 : 0.2 + random() * 0.6,
        text: pick(TAG_WORDS, random),
        colour: pick(SPRAY_COLOURS, random),
        size: 0.09 + random() * 0.09,
        angle: (random() - 0.6) * 0.5,
        outline: random() < 0.5 ? pick(SPRAY_COLOURS, random) : null,
      });
    }
  }
  const lamps: SkipLamp[] = [];
  if (random() < LAMP_CHANCE) {
    const corners: SkipCorner[] = [
      { end: -1, side: -1 },
      { end: 1, side: -1 },
      { end: -1, side: 1 },
      { end: 1, side: 1 },
    ];
    // Four, as the councils ask; often only the two on the road side.
    const all = random() < 0.5;
    const roadSide = random() < 0.5 ? -1 : 1;
    for (const corner of corners)
      if (all || corner.side === roadSide)
        lamps.push({ ...corner, phase: random() });
  }
  return { tags, lamps };
}

/** Whether a lamp is lit at `seconds`, flashing from its phase. */
export function lampLit(lamp: SkipLamp, seconds: number) {
  const at = (seconds / FLASH_SECONDS + lamp.phase) % 1;
  return at < FLASH_ON / FLASH_SECONDS;
}
