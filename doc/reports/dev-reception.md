# dev23, the Reception: completion notes

Return path for `doc/prompts/012-dev-reception.md`. Read by the owner and the lead agent. Newest entry last; keep earlier entries.

## 2026-10-19: first build

### What was built and where

- `src/toolkit/gallery/rooms/reception.ts`: `createReception(kit)`, the room itself, built in metres without a renderer (so it can be tested): a 12 × 10 m reception, 2.7 m suspended ceiling, north wall behind the desk, glazed entrance in the east wall, the spring door to the corridor where `devPortals('dev23', …)` puts it (west wall, near the south end) and the secured upstairs door further up the west wall. Exports `RECEPTION_BOUNDS`, `RECEPTION_CEILING`, `RECEPTION_VIEWS`, `DESK`, `FITTINGS`.
- `src/toolkit/gallery/rooms/reception-room.ts`: `startReceptionRoom(canvas)`, built like dev22: `createRenderer`, `createFirstPerson`, `createPortals('dev23', devPortals('dev23', bounds, m), 0, m)`, `devWalls` for collision, an overcast sky, `?view=` starts, `enter(previous)`, and the `window.devReception` hook (`view`, `views`, `place`, `doors`, `use`, `stats`, `shot(seconds, w, h)`).
- `src/toolkit/gallery/rooms/reception.test.ts`: draw budget from six views (held to 400), the sliding doors opening and closing as someone comes and goes, and every view standing clear of the furniture.
- `src/toolkit/components/architectural/logic/sliding-door.ts` (+ test): pure logic of an automatic sliding door: open at 0.6 m/s per leaf, hold open 2 s after the sensor field clears, close at 0.3 m/s, reopen if someone returns; `sensed(ahead, across)` is the sensor's field.
- `src/toolkit/components/architectural/views/reception-fittings.ts`: `createSlidingEntrance`, `createAirCurtain`, `createSecuredDoor`, `createWayfindingSign`.
- `src/toolkit/components/architectural/parts/reception-parts.ts`: `slidingEntrance` (run by the room's `sense`, with a drive whirr and a soft meeting thump) and `securedDoor` (the reader refuses with a red lamp and an error tone; a push on the leaf rattles it).
- `src/toolkit/components/site-dressing/views/reception-props.ts`: the curved desk, reception chairs, low table, brochure rack, visitor book, course register, badge tray, desk phone, monitor, keyboard and wall clock.

Reused catalogue parts: `callPoint` (by the entrance, 1.4 m), `radiator` (under the window), `thermostat` (west wall), `architecturalPart(kit, 'exit')` (the maintained exit sign, hung over the way out), the VX3 office chair for the receptionist, and the Meridale logo by `createBrandBadge` (the directional sign and the "First floor offices" plate use Meridale's purple and lilac).

### Which real product each placeholder copies

- Sliding doors: dormakaba ES 200 bi-parting operator on a natural-anodised aluminium shopfront, 1,600 mm clear opening, 850 mm side screens, 2,200 mm glazing, 180 mm header box; yellow dot manifestation at 850–1,000 and 1,400–1,600 mm (Approved Document K).
- Motion sensor: BEA Eagle, 120 × 65 × 53 mm, black.
- Air curtain: Thermoscreens C2000, cream, about 2,000 × 240 × 250 mm (dimensions approximate, not checked against a datasheet), slotted outlet underneath, intake on the face, green lamp.
- Secured door reader: Paxton Net2 KP75 proximity reader with keypad, taken as about 150 × 85 × 25 mm (unverified); door closer after Dorma TS83; leaf 926 × 2,040 mm beech fire door with FIRE DOOR KEEP SHUT sign.
- Ceiling fittings: generic 1200 × 600 recessed Category 2 three-tube louvre fittings of the period (no single product).
- Brochure rack: Deflecto clear acrylic A4 wall holder, four pockets.
- Desk phone: Avaya 9608, about 190 × 200 mm.
- Monitor: Dell 1707FP 17-inch 4:3 LCD (badged Kessler-Moody, small, on the bezel).
- Desk, chairs and table: no single product; bespoke 1990s joinery (1,080 mm counter, 720 mm work surface) and contract reception chairs and a 1,000 × 550 × 400 mm beech table at the usual sizes.

### CRT or LCD

LCD. The brief is a 1990s fit-out still in use today; a CRT on a working reception desk in 2026 would make it a period set, where a chunky mid-2000s 4:3 LCD says the fit-out has been kept going with whatever came next. Easy to swap if the owner prefers the CRT (the dev0 cabinet fittings have one).

### Draw calls

From the countDraws test (scene only, no portal door): entrance 101, desk 54, behind the desk 103, waiting area 31, the overview corner 145, looking out of the doors 60. In the browser (`renderer.info`, including the portal door and the sky): entrance 109, desk 51, outside 58. About 17,800 triangles from the entrance. Everything static is merged (`mergeStatic`, shared paints); the sliding leaves are merged within themselves and move whole.

### How to view it

`?room=dev23&view=entrance|desk|behind|waiting|upstairs|outside|room` (default `entrance`). In the console: `devReception.view('desk')`, `devReception.doors()` (0 shut, 1 open), `devReception.shot(2, 1280, 720)`.

### Checks

`npm run typecheck` clean; `npm run lint` exit 0 (no warnings in the new files); `vp fmt --check` clean for the new files (the only remaining issue is `doc/reports/dev-rooms-joined-by-doors.md`, not mine); `reception.test.ts`, `sliding-door.test.ts`, `layering.test.ts` and `portal-network.test.ts` pass.

In the browser: `?room=dev23` did not start the room at the time of this run, because `src/main.ts` had no `dev23` branch (it was there earlier in the session; the lead is editing that file). Started by hand in the page (`startReceptionRoom` on a fresh canvas) it builds and runs without console errors; frames rendered with plausible colours from the entrance, desk and doorway views, the doors read 1 open with the walker 1.25 m from them and 0 after walking away, and a use on the reader worked. Browser screenshots timed out (the browser window seemed not to be painting), so no screenshots were taken and nothing has been looked at by eye: the look is unchecked.

### Limitations and open questions

- For the lead: `src/main.ts` needs `else if (room === 'dev23') start = (await import('./toolkit/gallery/rooms/reception-room')).startReceptionRoom;`, and dev_corridor needs a door for dev23 in `LOOP_ROOMS` if it is not there yet. `AGENTS.md` needs a dev23 entry.
- The sliding doors open but lead nowhere: the wall's collision stays in place across the doorway.
- Not yet looked at visually; light levels, the logo's size and the outside view may need tuning once someone can see it.
- Placeholder dimensions marked approximate above (air curtain, Paxton reader) want checking against datasheets.
- No lowered wheelchair-accessible counter section yet (present-day Approved Document M would expect one even in an old fit-out); no hearing loop sign at the desk.
- The receptionist's chair is the VX3's worn 1980s task chair, somewhat older and shabbier than the tidy brief.
- No diary entry was written: left to the lead, who owns the session.

## 2026-10-19: Neumann Dynamik's office

The owner corrected the company: the reception is a Neumann Dynamik office, not Meridale's. `BRAND` in `src/toolkit/gallery/rooms/reception.ts` is now `neumann-dynamik`, so the logo behind the desk, its tagline, the brochures, the course register and the directional sign and the First floor offices plate take Neumann Dynamik's mark and colours (navy and steel grey). Its tagline, from `brands.ts`, is German ("Präzision in Bewegung"), as the brand's own.

