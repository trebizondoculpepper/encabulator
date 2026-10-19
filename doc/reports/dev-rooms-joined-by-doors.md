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
