# 007: Connected rooms: the training room, a corridor and the warehouse

The owner wants the game to grow into an "open world" made of connected rooms, and to start with three: the training room, a bland corridor and a warehouse, walked between without a portal or a loading screen. The design rule: from any room you can see into an adjacent room but never further, and rooms must be efficient, never loading or drawing objects that cannot be seen. The owner's simplification, which makes this cheap: the rooms are simple, and every door between them closes by itself, so most of the time only the room the player is in is drawn at all. This prompt records the briefing; it is not yet approved for implementation, so confirm with the owner before starting.

Read first: `AGENTS.md` (Rules, Performance, Rooms: the training room, Level 0, dev17, the portals; Architecture: the toolkit's layers), `doc/plans/level0-lighting.md`, `doc/reports/level0-lighting.md`, and the code: `src/main.ts` (how rooms are opened and kept alive), `src/rendering/training-room.ts`, `src/game/training-room-plan.ts`, `src/scene/training-room.ts`, `src/rendering/level0-room.ts` and `level0-scene.ts` (a room's scene already built apart from its renderer), `src/scene/warehouse-training-room.ts`, `src/toolkit/gallery/views/portals.ts`, `src/toolkit/controls/input/first-person.ts`, and the held fire door (`heldFireDoor` in `src/toolkit/components/fire/parts/fire-parts.ts`, a door on a closer).

## The world

- **Three rooms in a line**: the training room (the ground floor of a 1990s office on the trading estate), a corridor, and the warehouse unit the office is attached to. Assume the warehouse is Level 0's, with its machine, entered by its west ENTRANCE door, unless the owner says otherwise; whether the training room's own door then still leads to dev0 is for the owner.
- **The corridor** is bland on purpose: a present-day English office corridor, tidy and compliant like the training room (plasterboard walls, a suspended ceiling with a few fittings, vinyl or carpet tiles, emergency lighting and exit signs, FIRE DOOR KEEP SHUT signs), a few metres long, perhaps with a dog-leg so the two doors are not in line: nothing in it worth drawing from elsewhere.
- **Doors that close themselves**: fire doors on overhead closers (UK practice between an office and a warehouse), opened by a use as every door is, held open while the player is in the doorway, closing a few seconds after they leave it, never on them; with vision panels. The building's fire alarm may later hold them open or release them (the held fire door already does this).

## How it stays efficient

- **A graph of rooms joined by doors**, pure and tested in `src/game/`: each room's bounds and own frame, each door joining two rooms with the transform between their frames, so rooms are placed relative to each other through their doors.
- **What is loaded**: the room the player is in, and the rooms one door away, built and ready but not drawn; rooms two doors away prepared in the background (built, their materials compiled) so that walking through a door never stutters; anything further disposed (geometry, textures, materials, held sounds, timers). With three rooms in a line, from either end the far room is the one prepared.
- **What is drawn**: the current room, and a neighbour only while the door between them is open (or opening or closing), as the line-up's bucket interiors are drawn only while their doors are open. A closed door shows its own face; nothing behind it is drawn. Because doors close themselves, a neighbour is drawn only briefly.
- **Lights**: only the current room's real lights, and while a door is open a neighbour's lights near it (or a stand-in), within one light budget for the whole scene, since every light costs every material.
- **Sound**: a neighbour's held sounds muffled through a shut door and clearer through an open one; further rooms silent.
- **Simulation goes on regardless**: world models (Level 0's plant, the building's services and supply, the fire alarm) are pure logic and keep running whether or not their room is loaded; a room is built from its model's current state when it loads, so leaving the warehouse does not stop the machine. The building's supply and lighting become shared services, so the corridor's lights can brown out with the machine too.
- **One renderer and scene**: rooms become modules (`build(kit, models)` returning `{ group, parts, doors, bounds, lights, update, dispose }`, with no renderer of their own), as `createLevel0Scene` nearly is; one first-person controller, its collision from the current room and the doors; the current room changes as the player crosses a door's threshold.
- **Budgets**: the current room plus an open door's worth of its neighbour within the draw budget (1,000; Level 0 is allowed 1,400 for now), checked by a test from each door; a test that a room built and disposed leaves nothing behind.

## Verification

The room graph's tests; a draw-budget test from each side of each door, open and shut; the dispose test; in the browser, walking from the training room through the corridor into the warehouse and back without a stutter, a neighbour seen only through an open door and nothing beyond it, the doors closing behind the player, the machine still running after a return; frames for the owner; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/connected-rooms.md` (create it), a dated entry per run, for the owner and the next agent: the room graph and door design, what is loaded and drawn in each position, budgets measured, how to walk it (`?room=`, development hooks), screenshots, limitations, and open questions (the warehouse chosen, the training room's dev0 door, the corridor's shape). A final chat response alone is not the return path.
