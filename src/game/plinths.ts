/**
 * The plinth room's three exhibits and who is standing at which. Walk
 * within `REACH` metres of a plinth and it becomes the active one: its
 * spotlight comes up and the others go down. Every arrival is recorded in
 * order, so what is said at a plinth can depend on where the visitor has
 * already been (the story told by context-sensitive audio, still to come).
 */

export type ExhibitId = 'rhombus' | 'helix' | 'sphere';

export interface Plinth {
  id: ExhibitId;
  /** Where it stands on the floor, metres. */
  x: number;
  z: number;
}

/** How near, metres, counts as at a plinth. */
export const REACH = 4;
/**
 * How far apart the plinths stand, metres: a corner of an equilateral
 * triangle each, about ten seconds' walk apart at 2 m/s.
 */
export const PLINTH_SPACING = 20;

const circumradius = PLINTH_SPACING / Math.sqrt(3);
const corner = (id: ExhibitId, degrees: number): Plinth => ({
  id,
  x:
    Math.round(circumradius * Math.sin((degrees * Math.PI) / 180) * 1000) /
    1000,
  z:
    Math.round(-circumradius * Math.cos((degrees * Math.PI) / 180) * 1000) /
    1000,
});

/** The three plinths, round the middle of the room: north, south-east, south-west. */
export const PLINTHS: readonly Plinth[] = [
  corner('rhombus', 0),
  corner('helix', 120),
  corner('sphere', 240),
];

export interface Arrival {
  /** The plinth arrived at. */
  at: ExhibitId;
  /** The plinth visited last before this one, or null on a first visit. */
  previous: ExhibitId | null;
  /** Every plinth arrived at before, oldest first. */
  before: readonly ExhibitId[];
  /** How many times this plinth has been arrived at, this one included. */
  visit: number;
}

/**
 * Follows the visitor: `update` takes where they stand (metres) and says
 * which plinth they are at, if any, and, the moment they reach one, the
 * arrival. Leaving and coming back to the same plinth is a new arrival.
 */
export function createPlinthTracker(
  plinths: readonly Plinth[] = PLINTHS,
  reach = REACH,
) {
  let active: ExhibitId | null = null;
  const history: ExhibitId[] = [];
  return {
    update(
      x: number,
      z: number,
    ): { active: ExhibitId | null; arrival: Arrival | null } {
      let nearest: Plinth | null = null;
      let best = reach;
      for (const p of plinths) {
        const d = Math.hypot(p.x - x, p.z - z);
        if (d <= best) {
          best = d;
          nearest = p;
        }
      }
      const now = nearest?.id ?? null;
      let arrival: Arrival | null = null;
      if (now && now !== active) {
        arrival = {
          at: now,
          previous: history.at(-1) ?? null,
          before: [...history],
          visit: history.filter((h) => h === now).length + 1,
        };
        history.push(now);
      }
      active = now;
      return { active, arrival };
    },
    active: () => active,
    /**
     * The plinth visited before the one the visitor is at now, or, away
     * from every plinth, the last one they were at.
     */
    previous: (): ExhibitId | null =>
      (active ? history.at(-2) : history.at(-1)) ?? null,
    history: (): readonly ExhibitId[] => [...history],
  };
}

/**
 * How bright each plinth's spotlight should be, 0 to 1: the active one
 * full and the others dimmed right down, or, at none, all at a low
 * standing level so the room can be found. The standing level is kept
 * well down (over four stops below full) so that arriving at a plinth
 * plainly lights it; the exhibits' own glow shows where they stand.
 */
export function spotlightLevels(
  active: ExhibitId | null,
): Record<ExhibitId, number> {
  const idle = 0.05;
  const dimmed = 0.015;
  const level = (id: ExhibitId) =>
    active === null ? idle : id === active ? 1 : dimmed;
  return {
    rhombus: level('rhombus'),
    helix: level('helix'),
    sphere: level('sphere'),
  };
}
