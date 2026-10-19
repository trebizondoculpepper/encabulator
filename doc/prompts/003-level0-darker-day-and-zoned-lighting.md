# 003: Level 0's darker day and its warehouse lighting

Fit the lighting proven in dev18 (prompts 001 and 002) to Level 0, so the room is lit mostly by its own lights and those lights can come to life, misbehave and fail. Read first: `AGENTS.md` (Level 0, dev17, Performance), `doc/plans/level0-lighting.md` (step 3), `doc/reports/level0-lighting.md`, prompts 001 and 002, and the code: `src/rendering/level0-scene.ts`, `src/rendering/level0-room.ts`, `src/rendering/warehouse-lighting.ts`, `src/scene/warehouse-training-room.ts`, `src/rendering/level0-draw-budget.test.ts`.

## Behaviour

- **A darker day**: daylight from 0.5 to about 0.2 in Level 0, the battens a little brighter, and the light bounced about the room following the battens' output as it does in dev18, so the room goes properly dark without them.
- **The warehouse's fittings** (shared with dev17 and Level 2): the twelve battens in their three zones become switch-start fluorescent battens (prompt 002), and the room's real lights follow their zone's fittings' output (one per fitting or per pair, within the draw budget), dimmed rather than hidden. The two switch banks, the zone breakers, the presence detectors (Level 0 already feeds them the player's position; choose a time-out that makes the lights noticeably follow the player) and the bulkheads are already installed.
- **Emergency lighting** laid out for the warehouse's 7.2 m roof by Thorn's spacing guide (`doc/research/emergency-lighting-parts.md`), as a plan checked by `checkEmergencyLighting` in a test (as dev18's is), each fitting fed from its zone's circuit and lighting the floor when lit.
- **dev17 and Level 2** keep a steady supply; give them a shared lighting model too if it is cheap, so their banks and detectors work.

## Verification

A BS 5266-1 test of the warehouse's emergency plan; the Level 0 draw budget still met; Level 0 in the browser from its starting view: a zone switched off and on from either bank, a zone tripped and reset at the board, the detectors following the player, the emergency lighting on a lighting fault; frames for the owner; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/level0-lighting.md` as a dated entry under prompt 003, preserving earlier entries: what was built, the emergency plan and its check, the draw budget, how to see it, screenshots, limitations and open questions. A final chat response alone is not the return path.
