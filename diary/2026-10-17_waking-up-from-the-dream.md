# Development Diary Entry - 2026-10-17

## Context

- **Date**: 2026-10-17 01:10 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for a new development room, dev10, and then named it Waking Up from the Dream: pressing the mouse button there should not work anything but wake the player, revealing that everything before was a dream. The eyes blink shut, the camera moves while they are shut so the move is never seen, they open somewhere else looking diagonally down, blink repeatedly and dizzily, the head shakes itself awake, and the player has the camera back. The owner asked for a description first, then for the blink to be subjective: we see one view closing, not two eyes blinking.

## Our Approach

The room cannot bind an input of its own, so "use" means "wake" there, by every input. The timeline is pure, tested logic (`src/game/waking.ts`): eased keyframes for how open the eyes are and how hazy the view is, a smooth decaying head shake, and a hold flag. The camera's jump is a callback on the first frame past 0.4 s, deep inside the first long shut, and a test checks it lands while the eyes are shut at frame rates from 10 to 144. The blink is drawn as one full-screen pass over the rendered frame (`src/rendering/eyelid-overlay.ts`, copying the frame as `ghost-overlay.ts` does): the upper lid, broad and out of focus, comes down across the whole view to just below the middle, the lower lid rises a little to meet it, the lashes are a darker blur along the edge, light dims as the lids close, and shut it is the red-brown of light through skin. Haze blurs (a golden-angle disc), dims, desaturates and vignettes the view, clearing with every blink.

## Implementation

The room was created empty first (`src/rendering/waking-room.ts`, linked between dev9 and the Rhombus mini-game, whose exit now leads to dev10), then given the waking. `first-person.ts` gained `hold(on)`, which ignores walking and looking from every input while the room moves the camera; it binds nothing. The shake is applied on top of the controller's aim after its update, so control returns exactly where the camera rests, and it is left out under reduced motion. Entering the room again makes it a dream again; `devWaking.at(t)` freezes the timeline for inspection.

## Outcomes

- Checked in Chrome at each stage (closing, shut, partial openings, the shake) and by pressing E: the eyes shut, the view reopens in the north-east of the room looking down, and control returns after about six seconds, with no console errors.
- The room is empty, so waking shows a plain floor; it will read better once the owner furnishes it.

## Waking into a different room each time

The owner then asked that each waking change the walls, to garish abstract designs of the early 1990s like the teal-and-purple squiggles on paper cups, so every waking is into a different room and the last was a dream. Eight patterns are drawn procedurally on seamless 512-pixel canvas tiles (each shape drawn again across every edge), laid out from a seed: the cup, Memphis confetti, arcade carpet, shards, splatter, checks, windbreaker bands (four bands a tile so the diagonals meet) and confetti chips. `dream-rooms.ts` deals them from a shuffled bag, and picks one of six waking places, never repeating either. Waking can now be repeated once it has ended. At the owner's suggestion the pattern is the walls' own material (box UVs scaled to 1.6 m tiles on every face), running under the portals, which now stand 2 mm off the wall in every room, with a polygon offset on their patches and signs so they never fight the wall for depth.

Screenshots of every pattern and of each stage of waking were sent to the owner. Looking diagonally down (pitch −0.6) from inside a 16 × 12 m room, the waking view is mostly floor, with only a strip of the new wall at the top, so the change of room shows most once the player looks up.

## Shaking awake while blinking

The owner asked for the head to shake itself awake at the same time as the blinking, moving side to side and turning on the spine. The shake had come only after the blinks, and turned the camera about the eye. Now a slow, groggy sway begins as the eyes first open (1.15 s, well after the camera's jump), with a quick shake of side-to-side turns and roll at each dizzy blink, growing, and the hardest once the eyes are open, all still again at 6 s. The room turns the head about a neck pivot 12 cm below and 9 cm behind the eyes, so the eyes swing as well as turn. Tests check it is still through the jump, shakes hard while the eyes are half open, moves smoothly and ends still.

## Next Steps

The owner will say what else goes in the room.
