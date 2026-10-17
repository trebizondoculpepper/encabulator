# Development Diary Entry - 2026-10-17

## Context

- **Date**: 2026-10-17 21:15 UTC
- **Branch**: main
- **Commit**: uncommitted, on defe859
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for a new development room, The Appearing Skip: whenever the player presses the mouse button, a skip appears immediately behind them, and whenever they look away from a skip, if there is more than one, the oldest is despawned. It is Level 2's "skip that was always there" gag as a toy.

## Our Approach

The mouse button is the shared "use" (the control rules forbid a room its own bindings), so a click, E, a tap or A all conjure a skip, and a use on a portal still travels. The rule for vanishing is pure logic, `skipToVanish` in `src/game/appearing-skips.ts`, tested: only a skip leaving the view sets it off, only with two or more skips, and only a skip out of view is taken, the oldest of those. So the room keeps at least one skip and nothing is ever seen to vanish; "more than one skip on the screen" was read as more than one in the room, since requiring two in view at once would rarely fire and would risk taking one in sight.

## Implementation

`src/rendering/appearing-skip-room.ts` (dev15, after dev14 in the chain, so the Rhombus EXIT now leads to dev15). A skip is a clone of one `createSkip` model, placed 2.4 m behind the eye (trying 3.2 and 4.2 m, and turns of up to 60° either way, when that will not do), turned so its long, lettered side faces the player, inside the walls and clear of other skips, and kept only if its bounding box is outside the camera's frustum. Each frame the room tests every skip's box against the frustum and hands the before and after sets to `skipToVanish`. Skips are solid to walk into.

## Outcomes

All five checks pass (473 tests). In Chrome: conjured a skip facing north (it appeared 2.4 m south, unseen), turned round to see it, conjured a second (behind, to the north), turned back, and the first had gone the moment it left the view, leaving only the new one in front.

## Next Steps

The owner to try it. A skip appearing 2.4 m behind fills the lower view on turning round; a longer distance is a one-line change (`BEHIND`).

## Later: a plinth, and boards to throw

The owner asked for dev15 to have a single plinth, with a new object appearing on it whenever one is thrown into a skip. The plinth (dev14's design) stands 1.5 m north of the middle and offers dev14's eight boards in turn. Each skip is now a bin in the shared bin tossing, added as it is conjured; the tossing gained `remove` (dropping any board still flying to it) and `incoming`, and `PartSet` gained `remove`, so a vanishing skip can take its boards with it. A skip with a board on its way in counts as seen, so it cannot vanish under a board in flight. The plinth restocks from the landing callback, so the next board appears while the player is still facing the skip, behind them. Checked in Chrome: a thrown board landed in the skip behind, the Modial Interaction Controller replaced the Betaform Amplifier on the plinth, and when that skip vanished its board went with it.

## Later: ten hire firms, and an on-screen button

The owner allowed dev15, and only dev15, an on-screen SPAWN SKIP button (top right; it conjures as a use on nothing does), an exception to the rule against on-screen controls now written into AGENTS.md. Then, asked whether KESTREL is a real waste firm, I could not rule it out (searches found none, but it is a common business name), so the owner asked for ten made-up firms, one chosen at random for each skip. They are pure data in `src/game/skip-hirers.ts`, tested (ten, distinct, numbers all in Ofcom's drama range 01632 960xxx); `createSkip` takes a firm or picks one, and `letterSkip` puts a firm's name on a skip or a clone, each firm's lettering material made once per kit, so dev15's cloned skips share geometry and paint but each gets its own name. In Chrome, three spawned skips read ARCHIBALD'S SKIPS, SKIPS OF DISTINCTION and THE SKIP EMPORIUM.
