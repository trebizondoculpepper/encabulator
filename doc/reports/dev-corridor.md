# Report: dev_corridor, the looping corridor

Prompt: `doc/prompts/008-dev-corridor.md`. Next: `doc/prompts/009-dev-rooms-joined-by-doors.md`.

## 2026-10-19: the loop built

Built:

- **The plan** (`src/game/dev-corridor-plan.ts`, tested): a 50 m square loop on its centre line, 3 m wide, 3 m high; sixteen zones (each side's ends, 6 m, and middle, and four corners); `zoneAt`, `visibleZones` (from a side: the side, its corners and the end of each side round them; from a corner: both sides' views; never the opposite side); 28 door stations on the outer walls every 7 m and a door to the courtyard in the middle of each side's inner wall; eight fire points (never more than 30 m away, BS 5306-8); a landmark a side; battens every 5 m.
- **The spring door** (`src/toolkit/components/architectural/logic/spring-door.ts`, tested; `springDoor` part in `building-parts.ts`; view `views/spring-door.ts`, a placeholder: a 926 × 2040 mm timber leaf in a steel frame, a frosted vision panel, push and kick plates): pushed, it swings open away from the pusher (0.7 s), dwells, and eases shut on its spring over a few seconds with a soft thud; `hold` keeps it open; `snapShut` closes it at once and silently.
- **The scene** (`src/scene/dev-corridor.ts`): built zone by zone, each zone's still things merged on their own; painted breeze block (the old corridor's mortar texture), skirting, a cable tray, battens; triangles at each turn in the side's colours; a full-length stripe a side in the owner's colours (north grey, east purple, south blue, west orange); CORRIDOR A to D signs near the turns; doors with their room's name on its colour (`LOOP_ROOMS`: the training room, the dev rooms in order, the Rhombus, the Hall and the levels, then stores) and a dark lobby behind each; fire points (catalogue water and CO₂ extinguishers under a FIRE POINT sign); landmarks (placeholders in `site-dressing/views/cleaning-props.ts`): a mop bucket and wet floor sign (north), a rotary scrubber (east), a eurobin trolley (south), cleaning store shelving (west).
- **The room** (`src/rendering/dev-corridor-room.ts`): shows only the zones in view; six real lights moved to the nearest battens in view; one door open at a time (opening one snaps the rest shut); the portals at its south-west and south-east corners still link it into the chain. `dev7` is now `dev_corridor` (`RoomId`), `?room=dev7` an alias; the old corridor's room, scene and plan are deleted.

Checked: the five checks pass (800 tests), including a draw budget test from a side, a side's middle and a corner (about 100 to 160 draw calls; the budget is 1,000) and the portal network. In the browser: each side's stripe and landmark, both kinds of corner, a door sprung open and closing, the fire points; frames sent to the owner.

Limitations and next steps: the doors lead to dark lobbies (prompt 009 makes them lead to rooms); no emergency lighting or exit signs yet; landmarks and doors are placeholders; no research yet into the real door, scrubber, mop bucket and trolley (the placeholders follow common sizes); `?view=` names are start, a to d, the corners and courtyard.

The owner then made the inner room the COURTYARD, with a door to it from the middle of each side's inner wall, so it can be reached from whichever side the player is on; what the courtyard is, the owner is about to describe.
