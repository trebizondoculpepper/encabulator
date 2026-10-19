# Report: Level 0's lighting comes to life

Plan: `doc/plans/level0-lighting.md`. Research: `doc/research/emergency-lighting-parts.md`, `doc/research/warehouse-lighting-control.md`.

## 2026-10-19: step 1 (zones, two banks, zone breakers, detectors)

The owner chose the research's recommendations (direct switching, no contactors; switch-start fluorescent gear for step 2) and asked first that every fitting exist as a component in the dev rooms.

Built:

- **The model** (`src/toolkit/components/architectural/logic/building-services.ts`): `ZONES` (1 to 3); per zone a breaker (`power.zoneBreakers`, `power.tripZone(n)`; `tripLighting()` and a severe disturbance trip them all), a two-way pair (`lighting.zoneSwitches[i].a` and `.b`, on when they differ), a presence detector (`lighting.seen(n)`, `zoneUnseen`, `zoneOccupied`, `detectorTimeout`, default 15 minutes), and outputs `zoneLight`, `zoneVolts` and `zoneEmergencyVolts` (each zone's emergency fittings fed from its circuit, through the test key). Tested.
- **Presence detection** (`src/toolkit/components/architectural/logic/presence-detector.ts`, tested): `detects(detector, x, z)`, a circle 1.33 times the detector's height across.
- **Catalogue components** (`architectural-fittings.ts`, `architecturalPart`): new kinds `gridswitch` (the zone switch bank; `index` 0 carries the test key, 1 the other end of each pair), `presence` (the detector, its walk-test LED blinking while it sees someone), `bulkhead` (the emergency bulkhead); `emergency` and `exit` now name their products; every lighting kind takes `zone` (and `beam` for emergency fittings), and the distribution board carries ZONE 1 to 3 breakers. The bulkhead is a shared kind (dev8 and dev18).
- **dev18**: lit by catalogue parts by zone; a bank beside each exit door; a detector over each zone (timeout set to a minute there); a fault button per zone on the test plate; specimens now 17 in three rows (the new kinds included).
- **dev8**: its south wall takes ten specimens, the bulkhead among them.
- **The warehouse** (dev17, Level 2, Level 0): its twelve battens in three zones of four, a detector over each row, a bank at each exit in place of the domestic switches (one domestic switch remains, for the first aid room), a bulkhead at each exit station; `room.lights` carry their zone and `room.detectors` their parts; `addWarehouseLighting` lights each light by its zone (`zones`). Level 0 tells its detectors where the player is each frame (`presence` from `createLevel0Scene`).

Checked: the five checks pass (773 tests). In the browser: zone 2's fault leaves zones 1 and 3 lit; after a minute without movement dev18's zones go out, and walking under zone 1 brings back zones 1 and 2 (both detectors see that spot); dev8 lists 14 specimens with the bulkhead.

Limitations and questions:

- A PIR sees movement, so a player standing still is not seen and the zone goes out after its time-out. That is how real ones behave (and a joke in itself); Level 0 may want a shorter or longer time-out.
- In dev17 and Level 2, whose fittings have no shared lighting model, each fitting keeps its own (as before), so their banks and detectors do nothing yet.
- The warehouse's point lights still switch `visible` with their zone, which recompiles shaders when a zone changes; step 2's flickering needs them kept visible and dimmed instead.
- Next: step 2 (switch-start fluorescent battens, their sounds), at the owner's checkpoint.

## 2026-10-19: prompt 002 (fluorescent battens come to life)

Built: `src/toolkit/components/architectural/logic/fluorescent-gear.ts` (`createFluorescentTube(seed, age)`, tested: the glow, click, strike or flash, run-up and lit sequence; retries and slower starts with age; duds from 0.92 never catch; out below 80 % and back through the starter; the same at any frame rate) and the luminaire part's `gear` (`switch-start` by default; `led` keeps the LED driver), two tubes per batten whose ages follow from the seed (`tubeAge`), the starter's click, a tink for each failed strike, a ping as a tube strikes and the ballast's hum while lit, all positional and quiet; `luminaire(...).age(tube, age)`. dev18: `devFittingsGallery.age(n, age, tube)`.

Checked in dev18: switching every zone on, the six battens rippled on over about three seconds, one flickering, an old one at half light (one tube still trying), and a batten given a dud tube stayed at half light with its dud blinking. Frames: the owner was sent a GIF.

Limitations: the gear's timings are first estimates; `doc/research/fluorescent-battens.md` (being researched) may refine them. The warehouse's room lights (`addWarehouseLighting`) still follow the zone, not the tubes: prompt 003. Codex rebuilt the other fittings' models (prompt 006, `doc/reports/lighting-fitting-models.md`); the batten's model is still the placeholder.

## 2026-10-19: prompt 003 (Level 0's darker day and warehouse lighting)

Built:

- **The warehouse's emergency lighting** as a plan (`WAREHOUSE_EMERGENCY`, `WAREHOUSE_EMPHASIS`, `WAREHOUSE_EXITS`, `WAREHOUSE_FIRE_POINTS` in `src/game/warehouse-room-plan.ts`) checked against BS 5266-1 by `src/game/warehouse-emergency.test.ts` (it passes): sixteen downlights on the roof steel at 7 m in a 4 × 4 grid after Thorn's spacing guide (high-ceiling lens outside, open-area lens in the middle four), a bulkhead over each personnel door (moved from the fire points; it gives the fire points their 5 lux with the bracket downlight already there), each fed from its zone.
- **The room's lights follow their fittings** (`addWarehouseLighting`): each light follows its batten's output (`room.lights[i].output`), so the room ripples on and flickers with the tubes; lights are dimmed, never hidden (no shader recompiles); with `emergency` a light whose zone's emergency fittings are on battery stands in for them at 12 % in a cool white (no extra lights); `bounce` ambient follows the lights; `environment` makes the image-based light follow the daylight and the lights, which is what made the room actually darken; `brightness`.
- **Level 0**: daylight 0.2 (`LEVEL0_DAYLIGHT`), battens 1.2 times as bright, bounce and environment following the lights, the building services model ticked each frame with the player's position (`presence(delta, x, z)`), detectors timing out after two minutes (`LEVEL0_DETECTOR_TIMEOUT`) so the zones follow the player. Development: `level0.building` (the services model), `level0.lights()`, `level0.shot(w, h)`.
- **dev17 and Level 2** share one lighting model for the warehouse, so their switch banks work (supply steady, detectors never time out), and update their lights each frame.

Checked: the five checks (780 tests); the Level 0 draw budget still met (about 1,390 draw calls from the start, against 1,400: tight); in the browser, Level 0 lit, tripped (the floor dark, the emergency standing in), and the battens stuttering back after the breakers were reset.

Limitations: the skylights still glow white on a dark day (their material does not follow the daylight); the budget is near its limit; the emergency fittings' own lit look is Codex's model.

## 2026-10-19: prompt 002 follow-up (research applied)

`doc/research/fluorescent-battens.md` arrived and the gear now follows it: starter glow and preheat 0.75 to 1.2 s (a bench measurement gave 0.55 s glow plus 0.4 s preheat), retries 0.55 to 1 s; a new tube catches about two strikes in three, an old one one in three (estimates); a struck tube jumps at once to 75 % and creeps up to full over 45 to 90 s (Philips gives two to three minutes to 90 %; shortened for the game); each tube's drop-out lies between 0.78 and 0.89 of nominal, higher with age; below 0.7 the starter cannot glow and the tube stays dark until the supply returns. The research found no source for a ping at the strike; the soft ping is kept as licence.

## 2026-10-19: prompt 004 (the machine pulls the lights about)

Built: `src/game/building-supply.ts` (`createBuildingSupply`, tested): a motor start dips the supply by 0.012 per amp of the jump in load (at most 0.35, recovering with a 0.15 s time constant); a steady sag of up to 3 % with load; over capacity, above 145 A (`OVERCAPACITY_AMPS`: measured, the machine draws about 133 A with everything on at half drive speed, 152 A at full speed and 156 A with the fan on BOOST, against its 100 A main disconnect) for two minutes, the building browns out over 30 s (`supply-quality.ts`'s brownout) and clears over 20 s once the load comes down. The building services model takes a `supply.feed` (`power.supplyFeed`, tested) in place of its test selector; Level 0 feeds it from the plant's load each frame. Development: `level0.supply()`.

Checked: FULL ON from the simulator dipped the building to 0.71 as the motors started, putting tubes out, which restruck; at full drive speed the over-capacity clock ran (a hidden browser tab runs the room slowly, so the brownout itself was checked by the tests). The five checks pass (785 tests).

Open: the player has no direct readout of the building supply beyond the MAIN INCOMING voltmeters (which show the machine's own sag); whether the brownout should also show there is for the owner.

## 2026-10-19: prompt 005 (catastrophes put the lights out; strangeness gets into them)

Built, in `src/game/building-supply.ts` (tested) and wired in `src/rendering/level0-scene.ts`:

- **Catastrophes**: the machine's breakdown (`plant.brokenDown` becoming true) and a fire taking hold (`plant.fireSize` over 0.3) surge the building's supply (a 0.3 s swell to 112 %, then 3 s of the severe disturbance) and trip the lighting 1.5 s in (every zone and the lighting circuit); the room drops to emergency lighting; the player resets the breakers at the distribution board (or RESET on the simulator), and the tubes stutter back to life.
- **Strangeness**: from a strain of 0.15 (as the other strange effects), brief dips in each quarter second with a chance growing with the strain, deep enough to put the oldest tubes out here and there, more and deeper as it grows; at breakdown they stop, and the catastrophe takes over.
- **The scenario simulator**: FAULTS gains LIGHTING FAULT (the lighting trips), SYMPTOMS gains BROWNOUT (45 s of brownout whatever the load); RESET also clears the supply and closes the lighting breakers.

Checked in the browser: FULL ON, then FIRE: once the fire took hold the zones tripped and every batten went out; RESET closed them; BROWNOUT sagged the supply to about 0.83 and most tubes dropped out and kept trying to restrike (they cannot strike below 0.85), a few staying lit: a dark, flickering room. The five checks pass (788 tests).

For the owner: a brownout on switch-start fluorescents is very dark, because tubes that drop out cannot restrike until the supply is back above 0.85. If it is too much, the brownout's depth (`supply-quality.ts`, about 0.8) or the strike threshold (`TUBE_STRIKE`) can be eased. The ballast hum does not yet rise and fall with the machine.
