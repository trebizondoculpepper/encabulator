# 009: The dev rooms joined by physical doors off the loop

**Status: approved and under way. Stage A (every room's way out leads to the corridor, the corridor's doors travel) is done; stage B (rooms walked into through open doors, one renderer) is done for the corridor and the courtyard; every dev room's way out is now a spring door like the corridor's, and seeing through into the other rooms is to follow. Follows prompt 008. See the report.**

The owner has decided that from now on the dev rooms are connected by physical doors, not portals: the looping corridor (dev_corridor, prompt 008) is the hub, each room is reached through a spring door off it, and the portal network is retired or parked. Walking the loop and opening a door should feel like an open world, while the game draws only the corridor and, at most, the one room whose door is open.

Read first: `AGENTS.md` (Rules, Performance, Rooms, Architecture), prompts 007 and 008 and their reports, and the code: `src/main.ts` (rooms opened by `?room=` and kept alive, each with its own renderer and canvas), `src/toolkit/gallery/logic/dev-room-links.ts` (`CHAIN`, `ROOMS`, `devPortals`), `src/toolkit/gallery/views/portals.ts`, `src/scene/portal-network.test.ts`, `src/toolkit/controls/input/first-person.ts`, and one room's split of scene from renderer (`createLevel0Scene`).

Its purpose, above all, is a test of whether rooms can be wired together this way (owner, 19 October): the dev rooms are the proving ground for the doors, the room modules and draw-while-open, before anything is done to the game. This world consists of the dev rooms only. The game's own world (reception, corridor, training room, warehouse) is a separate world built on the same corridor and door mechanism (prompt 010), so build the room modules, doors and draw-while-open as shared machinery that both worlds use.

## The design (agreed in conversation, 19 October)

- **Spring doors**: double-action doors that a player walks through, which ease shut on their springs. A room behind a door is drawn only while that door is not fully shut; a shut door draws nothing behind it. Standing in the doorway holds it open, so both sides are drawn.
- **How doors close (owner, 19 October)**: watched, a door eases shut slowly on its spring, as a real one does; the moment another door is opened, every other door closes instantly and silently. So only one door is ever open, and the corridor and at most one room are drawn. (The rule holds even for an open door in plain view: it is seen to vanish shut. The owner accepts this as a small break in the simulation; with the loop's corners it is rare.). dev15's out-of-view test, `skipToVanish`, can tell when a door is watched.)
- **Rooms do not have to fit**: each room keeps its own frame; a door joins the corridor's frame to the room's, at the room's own door. Rooms of any size can stand behind doors 7 m apart, because only one is ever drawn.
- **Rooms kept built, detached**: a room must appear on the first frame of its door's swing, so rooms are built ahead (those with doors on the side the player is on, or all of them while they are few) and kept detached from the scene (not drawn, not updated, silent) rather than disposed; a room long unvisited may be disposed. Shaders are compiled while a room is prepared.
- **One renderer, one scene, one controller**: rooms become modules (`build(kit, models)` returning `{ group, parts, doors, bounds, lights, update, dispose }`, no renderer of their own); the current room changes as the player crosses a door's threshold; collision comes from the current room and the doorway.
- **Lights and sound**: only the current room's lights, and the open room's nearest its door, are real, within one light budget; a shut door silences what is behind it (or muffles it); world models (Level 0's plant, building services) keep running while their room is detached, so a machine does not stop because the player left.
- **Vision panels**: through a shut door's glass nothing behind it is drawn, so the glass is wired or frosted, with a dim stand-in behind it.
- **Each dev room gets a door back** to the loop in place of its portals; the portals are parked (left in the code, unused) or removed, and `portal-network.test.ts` is replaced by a test that every room's door reaches the loop and back.
- **Order**: the door mechanism and draw-while-open with two or three rooms first (say dev0, dev1 and the blank inner room), then the rest, then the training room and the levels.

## Verification

Tests for the door graph (every room reachable from the loop and back), the out-of-view snap-shut, a draw budget from each door open and shut, and a room built, detached and disposed leaving nothing behind; in the browser, walking the loop into several rooms and back without a stutter, a room seen only through its open door, nothing behind a shut one; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/dev-rooms-joined-by-doors.md` (create it), a dated entry per run, for the owner and the next agent: the door and room-module design, which room is behind which door, what is loaded, detached and drawn in each position, budgets, how to walk it, screenshots, limitations and open questions (the portals' fate, the levels' place on the loop, the courtyard). A final chat response alone is not the return path.
