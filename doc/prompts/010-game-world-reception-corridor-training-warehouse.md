# 010: The game's world: reception, corridor, training room and warehouse

**Status: parked (owner, 19 October: today is only for wiring up the dev rooms). A note for later, not to be started. Follows prompts 008 and 009, whose corridor and door machinery it would reuse.**

The game proper is to be a small world of connected rooms, walked between through physical spring doors: an office reception (a new room), the corridor, the training room and the warehouse. It is separate from the dev world (the loop of dev rooms, prompts 008 and 009): the same square corridor set piece and the same door, room-module and draw-while-open machinery, wired differently. The dev rooms are not part of it.

Read first: `AGENTS.md` (Rules, Performance, Rooms: the training room, dev17, Level 0, Level 2), prompts 007 to 009 and their reports, `doc/design/warehouse-training-room.md`, and the code for the training room (`src/rendering/training-room.ts`, `src/game/training-room-plan.ts`, `src/scene/training-room.ts`) and the warehouse (`src/scene/warehouse-training-room.ts`, `src/rendering/level0-scene.ts`).

## The world (owner, 19 October)

- **Reception**: a new room, a present-day English office reception on the trading estate, in keeping with the training room (tidy, respectable, compliant with UK health and safety): its own design is to be briefed by the owner; until then a simple placeholder.
- **The corridor**: the square looping corridor of prompt 008, reused as a set piece with this world's doors, signs and landmarks.
- **The training room**: as it is, its door into the corridor in place of its portal to dev0, and wired to the warehouse.
- **The warehouse**: the Guildford warehouse shell (which scenario it hosts, Level 0's sandbox or Level 2's, is for the owner).
- **How they join** is to be confirmed with the owner: the working assumption is reception to corridor, corridor to training room, and training room to warehouse, with the corridor perhaps also giving onto the warehouse.

## Verification

As prompt 009: the door graph reaches every room and back, draw budgets from each door open and shut, nothing left behind when a room is detached or disposed, and a walk from reception to the warehouse and back without a stutter; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/game-world.md` (create it), a dated entry per run, for the owner and the next agent: the world's graph, the reception's design, which scenario the warehouse hosts, budgets, how to walk it, screenshots, limitations and open questions. A final chat response alone is not the return path.
