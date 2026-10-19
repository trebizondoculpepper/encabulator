# 012: dev23, the Reception

**Status: approved by the owner (19 October 2026); building.**

The owner wants a new development room: the reception of the training and distribution office the game is set in, as a dev room of its own (dev23). It gives the place a clear identity: a reception fitted out in the mid-to-late 1990s, still serving its original purpose at a regional training and distribution office on a trading estate in England, today. Read `AGENTS.md` first (Rules, Performance, Rooms, Architecture), and the training room (`src/rendering/training-room.ts`, `src/scene/training-room.ts`, `src/game/training-room-plan.ts`) for the look, standards and tidiness of the same company's building. Prompt 010 (parked) has the wider game world this reception will one day join.

## The owner's briefing (19 October 2026, close to their words)

The heater above the entrance is an air curtain: a long cream-coloured unit with a slotted grille, blowing down across the doorway. Pair that with aluminium-framed automatic sliding glass doors, a small black motion-sensor housing above them, and yellow safety markings (manifestation) on the glass.

- Curved reception desk: pale beech laminate, a grey countertop and a recessed plinth. A practical opening at one end lets the receptionist get behind it.
- Finishes: muted blue or teal carpet tiles, warm off-white walls, light-grey skirting and a suspended ceiling with rectangular fluorescent fittings.
- Waiting area: three upholstered chairs with dark metal frames, a low beech table and a small rack of training brochures.
- Corporate identity: one company logo behind the desk, with matching colours on the directional signs. Plain, professionally made signage. (Use a brand from `src/toolkit/components/core/logic/brands.ts`: the owner's correction (19 October 2026): this is a Neumann Dynamik office, so it is Neumann Dynamik's logo, not any other company's; draw it with `brandLogoTexture` / `createBrandBadge`, never a new mark.)
- Reception equipment: a corded desk phone, a chunky monitor, a visitor book, a paper course register and a shallow tray of visitor badges. A CRT would firmly establish the period; a later LCD would suggest an old fit-out still in use. (Choose one and say which in the report.)
- Main corridor doorway: visible from the entrance, with a simple "Training rooms / Warehouse / Toilets" sign. Its frame and finishes should match the corridor (dev_corridor, `src/scene/dev-corridor.ts`): use the same double-action spring door (`springDoor`) and frame.
- Secured upstairs access: a closed door labelled "First floor offices", with a keypad or proximity reader. No view beyond it needed.
- Small practical fittings: a wall clock, a fire alarm call point near the exit, a radiator beneath a window, and a thermostat. (Reuse the catalogue's parts: `architecturalPart` kinds in `src/toolkit/components/architectural/`, the fire parts in `src/toolkit/components/fire/`.)
- Through the entrance glass, a narrow view of block paving, parking spaces and the opposite industrial unit, to establish the trading estate (the training room's outside, `src/scene/training-room.ts`, shows how).

The period should come through in the materials, colours and equipment. Everything should look routinely cleaned and maintained, with modest wear at the entrance and the desk: an entirely ordinary place to arrive for a Tuesday training course.

## How

- Placeholders before detail (the owner's standing rule): true-size placeholder models after real catalogue products (say which product each copies), mechanics first; another agent may improve the models later. Model fittings on real parts at true size; never scale a part to fit.
- A gallery room, `src/toolkit/gallery/rooms/reception-room.ts`, exporting `startReceptionRoom(canvas)`, built like the other dev rooms (e.g. `src/toolkit/gallery/rooms/fires-room.ts`): `createRenderer`, `createFirstPerson`, `createPortals('dev23', devPortals('dev23', bounds, m), 0, m)` for its spring door back to the corridor, `devWalls` for walls and collision, a `devReception` development hook on `window` (`view`, `place`, `stats`, `shot(seconds, w, h)`), `?view=` starts, `enter(previous)` like the other rooms. New props it needs go in the toolkit by category (`site-dressing/views/`, `architectural/views/`), placeholders. Everything static merged (`mergeStatic`); keep to the draw budget (under 1,000 calls; aim for a few hundred) with a budget test like `src/scene/dev-corridor.test.ts`'s.
- The automatic sliding doors may open as one approaches (it is a working door, not an exit: travel nowhere). The upstairs door does not open.
- Do not edit the shared registration (`src/toolkit/gallery/logic/dev-room-links.ts`, `src/main.ts`, `index.html`, `AGENTS.md`): the lead agent registers dev23 (name `DEV23 · RECEPTION`). Do not commit. Another agent is working in the same checkout on the doors (`src/toolkit/gallery/views/portals.ts`, `src/toolkit/controls/input/first-person.ts`, `src/main.ts`, `src/rendering/dev-corridor-room.ts`): do not edit those files.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check` and the room's tests; check it in the browser at `?room=dev23` once registered (or report that you could not).

## Return path

Leave completion notes in `doc/reports/dev-reception.md` (create it; add a dated entry on each run, keeping earlier ones), for the owner and the lead agent: what was built and where, which real product each placeholder copies, CRT or LCD and why, the draw calls from the entrance and the desk, how to view it (`?room=dev23&view=…`), screenshots taken (as separate images, not contact sheets) if any, limitations and open questions. A final chat response alone is not the return path.
