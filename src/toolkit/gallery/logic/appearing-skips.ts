/**
 * The appearing skip (dev15): a skip appears behind the player whenever
 * they use, and skips vanish only when nobody is looking. Each time the
 * player looks away from a skip (one that was in view is not any more),
 * and there is more than one skip, the oldest skip out of view goes, so
 * one is always left and none is ever seen to vanish. Pure logic.
 */

export interface AppearingSkip {
  id: number;
  /** When it appeared, for telling the oldest. */
  born: number;
}

/**
 * Which skip to take away now, if any: `seen` were in view last frame,
 * `inView` are in view now. Only a skip leaving the view sets it off, and
 * only a skip out of view is ever taken.
 */
export function skipToVanish(
  skips: readonly AppearingSkip[],
  seen: ReadonlySet<number>,
  inView: ReadonlySet<number>,
): number | null {
  if (skips.length < 2) return null;
  const lookedAway = [...seen].some(
    (id) => !inView.has(id) && skips.some((skip) => skip.id === id),
  );
  if (!lookedAway) return null;
  const unseen = skips.filter((skip) => !inView.has(skip.id));
  if (!unseen.length) return null;
  return unseen.reduce((oldest, skip) =>
    skip.born < oldest.born ? skip : oldest,
  ).id;
}
