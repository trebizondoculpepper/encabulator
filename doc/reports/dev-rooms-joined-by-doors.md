# Report: the dev rooms joined by physical doors

Prompt: `doc/prompts/009-dev-rooms-joined-by-doors.md`.

## 2026-10-19: stage A, every room wired through the corridor's doors

Built: every room's way out (`devPortals`) now leads to dev_corridor, the hub, instead of to its neighbours in the chain: one portal a room (the training room's door, the Rhombus's EXIT, dev17's and dev18's by the warehouse's escape, the rest on their west wall), arriving in the corridor in front of the door that room's name is over (`arrivalAt`). The corridor's doors travel: walking through an open spring door (`walkedThrough`, tested) goes to its room; an inner door goes to the courtyard, through the matching one of its four doors (`courtyardLink`, `src/game/courtyard-link.ts`), and the courtyard's doors go back to the matching side of the corridor. Tests: the doorways (`dev-corridor-plan.test.ts`), the ways out (`portal-network.test.ts`, rewritten), the room links and portals tests updated. Checked in the browser: through the training room's door and back, and from the corridor's south side into the courtyard.

Limitations and next steps (stage B): a room is still opened on its own when its door is walked through, so nothing is seen through an open door but a dark lobby; the next step makes rooms modules sharing one renderer and scene, drawing the room behind a door while it is open, proven on the corridor and courtyard first. The ways out of the dev rooms are still portal patches, not doors. The Hall and the levels have doors on the loop but no way back except the room list.

## 2026-10-19: stage B, the corridor and the courtyard as one world

Built: the corridor and the courtyard are walked between, not travelled between. `src/rendering/dev-corridor-room.ts` is now the world: one renderer, one camera and one first-person controller for both rooms. The courtyard is a room module, `createDevCourtyardRoom(renderer, kit, m)` in `src/rendering/dev-courtyard-room.ts`, returning its scene, root, parts, doors, `place`, `update`, development hooks and `dispose`, with no renderer, canvas or controls of its own. `?room=dev_courtyard` opens the same world (`src/main.ts` keeps one instance for both names) and stands the player in the courtyard.

How it fits: the courtyard is 18 m square and the space inside the loop 47 m, so it does not fit as drawn. It stands behind whichever of the corridor's four inner doors is in use, its own door on that side lying in that doorway and not shown, so the corridor's door is the one door between them (`src/game/courtyard-join.ts`, tested: `anchor`, `toWorld`/`toLocal`, `carry`, `joinedWalls`, `inJoinedDoorway`, `pushAway`). Opening another inner door from the corridor moves it there (unseen: every other door snaps shut). Opening one of the courtyard's other doors from inside moves the courtyard, with the player in it, behind that side's inner door, so nothing the player sees changes, and opens that door instead, into the corridor. The sky dome and the sun are turned with the courtyard, so the sky looks the same whichever door it is behind.

What is drawn: each room is its own scene, lit only by its own lights (the courtyard's daylight would otherwise light the corridor). Each frame the corridor is drawn when the player is in it or the joined door is open, then the courtyard, over the corridor's depth buffer, when the player is in it or the door is open (`renderer.autoClear` off). From the courtyard the corridor's zones and its six real lights are chosen as from its doorway. Collision is the corridor's outer walls plus `joinedWalls`: the corridor's inner wall as thick as the join, and the courtyard's four walls, with a doorway only through the open joined door. The door is held open while the player stands in its doorway, and it opens away from whoever pushes it. Only one door of either room is open at a time.

Budgets: from the corridor looking in through the open door, about 470 draw calls (both scenes, the courtyard's shadow pass included). In the courtyard with its door shut, about 270. A test in `src/scene/dev-corridor.test.ts` holds both doorway views, corridor plus twice the courtyard, to 1,000. Tests: `src/game/courtyard-join.test.ts` (the courtyard behind each door, round trips, carrying a pose, walking through the open door with the real collision and not through a shut one or past its edge, holding and pushing).

Checked in the browser (with `devCorridor.shot` in a hidden tab):

- From Corridor C, opening its courtyard door shows the courtyard through it.
- Walking through, then turning round, shows Corridor C through the door with DEV18's door opposite.
- From inside, opening the north door moves the courtyard behind Corridor A with no visible change and shows DEV2's door through it; walking out arrives in Corridor A.

Removed: `src/game/courtyard-link.ts`, and the dark lobbies behind the courtyard's doors and the corridor's inner doors.

Limitations and next steps:

- The other rooms are still separate pages with their own renderers, opened when their outer door is walked through. Making them room modules on the same pattern (scene, root, parts, doors, `update`, `dispose`), built ahead and detached, is the rest of stage B. The courtyard is kept built while the corridor is, which is cheap; with more rooms, rooms will need building ahead and disposing when long unvisited.
- One scene a room, rather than one scene, was chosen so each room keeps its own lights. A room seen through a door is not lit by the other's lights, which is right for a door, though light does not spill through it.
- The two doors' frames differ a little (the courtyard's frame shows only on its other three doors).
- The Hall and the levels still have no way back but the room list.

## 2026-10-19: every dev room's way out a spring door

Built: the coloured portal patches are gone. Every dev room's way back to the corridor is now a double-action spring door in its wall, the same `springDoor` part as the corridor's, under DEV CORRIDOR on the corridor's colour, made once for every room by `createPortals` (`src/toolkit/gallery/views/portals.ts`) where `devPortals` has always put the way out. A use pushes it open, away from you; it eases shut on its spring, stays open while you stand in its doorway, and walking through it while it is open takes you to the corridor, in front of that room's door there. Coming back, you stand in front of it, shut. So every connection between the corridor and a dev room is now a spring door at both ends.

How the doorway is made without touching the rooms: the rooms build their walls solid (`devWalls`) and walk against them, and 21 rooms build and collide with their walls each in their own way. Rather than cut a hole in each, the door stands in the wall face and the doorway is drawn into the wall with the stencil buffer: the doorway marks where it is seen, the depth there is pushed back, and a dark lobby 1.6 m deep and the door's swinging leaf are drawn only there. The wall is still solid to walk against, as the corridor's are; travel happens on reaching the open doorway, as it does on the corridor. `createRenderer` now asks for a stencil buffer for this.

Kept as they were: the training room's beech fire door, the Rhombus's EXIT door and the warehouse's escape door in dev17 and dev18 are their rooms' own physical doors, and still travel at a use or a walk into them. The levels and the Hall still have no way back but the room list.

Tests: `src/toolkit/gallery/views/portals.test.ts` (a shut door goes nowhere, a use opens it without travelling, walking through it open travels once, it swings shut again) and `src/scene/portal-network.test.ts` (every room's door opens with a use and can be walked through to the corridor from where one arrives). Checked in the browser: dev22's door shut and open onto its lobby, walked through to the corridor; dev0's door.

Not yet: seeing through. An open door between the corridor and a dev room shows a dark lobby on both sides, since each dev room is still drawn by its own renderer on its own canvas. The courtyard is seen through because it was made a room module the corridor draws; doing that for every room means reworking each room's start function. A cheaper way to try first: keep each room as it is, put the other room's canvas underneath, have its camera follow the player through the join (its controls ignoring input), and draw the doorway as transparent instead of a dark lobby. It needs a way to drive a room's camera from outside (in `createFirstPerson`, for every room at once), a transparent doorway in place of the lobby, and the two doors at a joint shown as one.

