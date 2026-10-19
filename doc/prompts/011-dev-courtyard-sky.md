# 011: The courtyard, a light well open to the sky, for sky effects

**Status: briefed by the owner on 19 October; confirm with the owner before starting.**

Inside dev_corridor's loop (prompt 008) is the courtyard, reached by a spring door from the middle of each side's inner wall. The owner's description: a light well, a square inner courtyard three storeys high in the middle of a square office building (think of the Pentagon's inner courtyard, but a much smaller office building), open to the sky. It has potted plants, pedestal ashtrays and some chairs: the staff use it as a smoking area. Because the sky can be seen from it, it is the dev room for sky effects: different kinds of cloud and sky, visible through the open top.

Read first: `AGENTS.md` (Rules, Performance, Rooms: the training room's sky and the Hall's daylight, dev_corridor; Architecture), prompts 008 and 009 and `doc/reports/dev-corridor.md`, and the code: `src/rendering/dev-corridor-room.ts`, `src/scene/dev-corridor.ts`, the training room's sky and outside (`src/scene/training-room.ts`), the Hall's lighting and node pipeline (`src/rendering/hall-room.ts`, `src/rendering/node-pipeline.ts`), and the gallery's room conventions (`src/toolkit/gallery/CLAUDE.md`).

## The courtyard

- **A room of its own** (`dev_courtyard`, `?room=dev_courtyard`), in its own frame: rooms off the loop need not fit inside it geometrically (prompt 009), so the courtyard can be the size a small office's light well would be, say 15 to 20 m square, not the loop's 47 m.
- **Three storeys of office round it**: its four walls are the building's inner facades, about 11 m high: ground-floor walls with the four spring doors (one in the middle of each wall, back to the matching side of the corridor), and above them two storeys of office windows (dark glass, frames, sills, a few blinds drawn), a parapet with coping at the top, rainwater pipes. Real-looking, in keeping with the 1990s office the training room is in, but placeholders at true size.
- **Open to the sky**: no roof; the sky is what the room is for.
- **Dressing**: paving (slabs, a drain), potted plants in planters, pedestal ashtrays (the outdoor stainless steel kind, with a NO SMOKING BEYOND THIS POINT or SMOKING AREA sign as a UK workplace would have), a few chairs (stacking or bistro chairs), perhaps a bench, a bin.
- **Sky effects**: different kinds of skies and clouds over the open top: for example clear blue, fair-weather cumulus, overcast stratus, high cirrus, a building storm, sunset, night with stars. The sky and its light on the courtyard follow it (the sun or its absence, the colour of the light). Chosen by a physical control in the room (a panel or a console, as the Hall's console is: the project allows no on-screen controls) and by development hooks. Research how such skies look and how to draw them cheaply (a sky dome with a shader, layered cloud textures, or a few billboards), and keep the room within the draw budget.
- **Later**: windows from the corridor into the courtyard, which would need logic for seeing through glass into a room that is otherwise drawn only when its door is open (the owner's earlier note); not now.

## Verification

Tests for anything pure (the sky presets, their timings or blends); a draw budget test; the room in the browser under each sky, frames sent to the owner as separate images; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/dev-courtyard.md` (create it), a dated entry per run, for the owner and the next agent: the courtyard's design, the skies and how they are drawn, research sources, budgets, how to see it (`?room=dev_courtyard`, hooks), screenshots, limitations and open questions. A final chat response alone is not the return path.
