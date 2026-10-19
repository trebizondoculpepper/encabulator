# 002: Fluorescent battens that come to life (dev18)

The theme of the game is machines coming to life, and in Level 0 that includes the building's lighting. Switched on, the warehouse's lights should stutter into life as old fluorescent battens do, with the noises of their control gear, rather than snapping on as LEDs do. The owner chose switch-start (glow starter and wire-wound ballast) control gear. Build and prove it in the building fittings gallery (dev18) first; prompt 003 fits it to Level 0. Models stay simple placeholders at true size; another agent will improve them (prompt 006).

Read first: `AGENTS.md` (dev18, Performance, the toolkit rules), `doc/plans/level0-lighting.md` (step 2), `doc/reports/level0-lighting.md`, prompt 001, and the code: `src/toolkit/components/architectural/logic/led-driver.ts`, `building-services.ts`, `supply-quality.ts`, `src/toolkit/components/architectural/parts/building-parts.ts` (`luminaire`), `architectural-parts.ts`, `src/toolkit/gallery/rooms/architectural-room.ts`, and dev12's machine tones (`src/toolkit/components/sound/audio/machine-tones.ts`).

## Research (brief)

A common UK twin 5 ft (1500 mm) T8 58 W switch-start batten of the 1990s, ideally an IP65 non-corrosive one as used in warehouses (a Thorn PopPack or a fluorescent Aquaforce), its size and look; how switch-start gear behaves (the starter's glow and opening, failed strikes, the strike, the run-up from a dim pinkish glow, times for healthy and old tubes); drop-out and restrike in a voltage dip (the research so far says an arc goes unstable below about 80 %); what failing tubes and starters do (end blackening, a tube that never catches and blinks with its starter clicking); the ballast's 100 Hz hum. Record it in `doc/research/fluorescent-battens.md`, marking what is confirmed and what is estimated.

## Behaviour

- **Control gear model** (new `src/toolkit/components/architectural/logic/fluorescent-gear.ts`, pure, tested beside it): one per tube, a seed giving each its own age and quirks. Switched on: the starter glows (0.3 to 1 s) then opens with a click; the tube tries to strike, and may fail (a flash and a tink) and retry; a healthy tube strikes within 0.5 to 3 s, an old one later; once struck it runs up to full in about a second. Lit, it holds through dips down to about 80 % of nominal and drops out below that, restriking through the same sequence when the supply returns. A dud may never catch, blinking with its starter clicking until switched off and on. It emits events (glow, click, flash, strike, out) and an output from 0 to 1. Deterministic for a seed at any frame rate. Tests: strike times within range and different between tubes, retries for old tubes, drop-out below 80 % and restrike, a dud blinking until reset.
- **The luminaire part**: the existing `luminaire` part takes `gear: 'switch-start' | 'led'` (LED stays as it is for other uses); a placeholder twin-tube batten view; the light it casts and its lens follow the gear's output, so a zone ripples on tube by tube; in a brownout tubes drop out and restrike all over the room.
- **Sound**, positional through the part audio, from each fitting: the starter's click, the strike's tink and a soft ping, a faint crackle while flickering, and the ballast's hum while lit as a seamless machine tone (synthesised as dev12's are), running up as the tube strikes. Keep a dozen fittings' hum quiet and positional. If recordings are used instead, credit them in `CREDITS.md` and keep working files in `resources/sound/`.
- **Rendering**: keep the room's real lights visible and dim them to zero rather than toggling `visible` (toggling recompiles shaders and stutters), and keep the number of real lights small (one per fitting at most).
- **dev18**: its battens switch-start; a development hook to age a tube or make a dud; the specimen luminaire shows the new batten.

## Verification

The pure-logic tests; the existing building services, warehouse fittings and Level 0 tests; dev18 in the browser: a zone switched on ripples on with flickers and clicks, a brownout makes tubes drop out and restrike, a dud blinks until switched off and on; frames for the owner (`devFittingsGallery.shot`); the five checks (`npm run typecheck`, `lint`, `format:check`, `test`, `build`). Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/level0-lighting.md` as a dated entry under prompt 002, preserving earlier entries, for the owner and the next agent: what was built, changed APIs, test and browser results, how to see it (`?room=dev18`, hooks), screenshots, limitations and open questions. Link the research file. A final chat response alone is not the return path.
