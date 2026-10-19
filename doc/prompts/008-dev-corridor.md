# 008: dev_corridor, a square looping corridor, the hub of the dev rooms

**Status: planning; not yet approved for implementation. Confirm with the owner before starting.**

The room is called **dev_corridor** (owner, 19 October): `?room=dev_corridor`, `src/rendering/dev-corridor-room.ts` or the like, development hooks on `devCorridor`. It takes over dev7 (owner, 19 October): dev_corridor replaces the zig-zag basement corridor, keeping its look, and dev7's room, its plan (`src/game/corridor-plan.ts`) and its scene (`src/scene/underground-corridor.ts`) are rebuilt as the loop or retired in its favour; `?room=dev7` should still open it (as `?room=dev5` still opens the Rhombus), and dev7's place in the room chain and its portals stand until prompt 009 parks the portals.

The owner wants the dev rooms reached as an open world rather than a chain of portals: a corridor that loops round a square, with a spring door to each dev room off it, so that wandering the corridor reaches every room. This prompt is step 1 and its groundwork: rebuild dev7 (the Corridor) as the loop, with placeholder doors, fire extinguishers, landmarks and visibility zones. The spring doors that open onto real rooms, and rooms kept built but detached and drawn only while their door is open, follow in prompt 009 (prompt 007's design is superseded for the corridor). The owner has decided that physical doors are how dev rooms connect from now on: the portal network is to be retired, or at most parked.

Read first: `AGENTS.md` (Rules, Performance, Rooms: dev7 and the portal network; Architecture), `doc/prompts/007-connected-rooms-training-corridor-warehouse.md`, and the code: `src/rendering/corridor-room.ts`, `src/scene/underground-corridor.ts` (its painted breeze-block, blue and purple triangle motifs, orange markings and industrial signage, which the loop keeps), `src/game/corridor-plan.ts`, `src/toolkit/gallery/logic/dev-room-links.ts` and `src/scene/portal-network.test.ts`, the catalogue's extinguishers and doors (`architecturalPart`), `src/rendering/detail-culling.ts` and `merge-static.ts`.

## A reusable corridor

The loop is to be built as a reusable set piece, not only dev7 (owner, 19 October): the dev world uses it as the hub of the dev rooms, and the game's own world (prompt 010: reception, corridor, training room and warehouse) uses the same corridor, wired differently. So build it as a component (in `src/scene/`, or in the toolkit's `architectural` category if it proves general) that takes its door slots, the room each leads to and each door's sign, and its landmarks and side lettering, from the world that places it; dev7 is one placing of it.

## The loop

- A square corridor 50 × 50 m on its centre line, about 2.5 to 3 m wide: walk 50 m, turn, and four sides later you are back where you started (200 m of corridor). It keeps dev7's look: painted breeze block, the blue and purple triangles, orange markings, industrial signage, a concrete floor, fluorescent fittings.
- **Doors**: placeholder realistic doors on the outer walls, about one every 7 m (some 28, enough for every dev room, the training room, the levels, the Rhombus and the Hall, with spares), each a double-action spring door (it swings both ways and returns to closed; research a common UK one, such as a timber or steel door on spring hinges or a floor spring, with push plates, kick plates and a vision panel, and model it at true size), under a sign in its room's colour naming the room, as the portals are labelled now. One door on an inner wall leads to the inner room. For now the doors open and swing shut but lead nowhere (or keep today's portal behaviour behind them); they become real in the next prompt.
- **The inner room**, about 45 × 45 m inside the loop, is blank for now (owner, 19 October): a plain grey box with no visible light fittings or anything else, only its spring door in and out. The owner may later make it a courtyard, which will need windows from the corridor and logic for seeing through them (transparency, and what is drawn through glass); not now.
- **Fire extinguishers**: placeholder catalogue extinguishers (water and CO₂ on a stand under their identification signs), at fire points spaced so that nobody is more than 30 m from one (BS 5306-8: about eight round the loop, one near each corner and one mid-side), with the FIRE ACTION notice; emergency lighting and exit signs as a corridor of this kind would have.
- **Landmarks, so nobody gets lost**: each side looks a little different, with its own landmark, modelled as placeholders after real products (research a common UK one of each): a yellow industrial mop and wringer bucket with a wet floor sign; a rotary floor cleaner (a Numatic or Victor rotary machine) parked against the wall; a bin trolley (a wheeled waste trolley or eurobin); an alcove with shelving stacked with cleaning supplies (bottles, rolls, boxes). Vary each side further: its motifs' colours or rhythm, a side letter or name in its signage (A to D), its floor markings.

## Zones, so the side you cannot see is not drawn

The square's corners hide one side from the next, so the corridor is divided into zones: its four sides and four corners. Pure logic in `src/game/` (tested) says, from where the player stands, which zones can be seen: on a side, that side and its two corners (with a short stub of each neighbouring side, which can be seen obliquely round the corner); at a corner, the two sides it joins. The opposite side is never drawn; nor are the sides out of view. Each zone is merged separately (`mergeTree`, with `fine` bands and detail culling), so hiding a zone hides a few meshes. Lights follow the zones: only the zones in view have real lights (a handful), the others' fittings glow without lighting; so the light budget stays small however long the corridor.

## Budgets and tests

A draw budget test for the loop from a standing place on each side and at each corner (the 1,000-call budget), the zone visibility tests (the opposite side never visible; a corner sees two sides), a collision test that a walk round the loop returns to its start, and the portal network test kept passing for now (dev7 still links its neighbours until prompt 009 parks the portals).

## Verification

The tests above; in the browser, a walk all the way round, each side recognisable by its landmark, frames from each side and corner, the draw calls and frame time from `devCorridor` (or the room's hook); the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/dev-corridor.md` (create it), a dated entry per run, for the owner and the next agent: the plan of the loop, the products researched for the doors, extinguishers and landmarks (confirmed or estimated), the zones and what is drawn where, budgets measured, how to see it (`?room=dev_corridor`, `?view=`, hooks), screenshots, limitations and open questions (the door spacing, which room goes behind which door, the inner room's purpose). A final chat response alone is not the return path.
