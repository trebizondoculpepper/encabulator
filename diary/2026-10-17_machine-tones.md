# Development Diary Entry - 2026-10-17

## Context

- **Date**: 2026-10-17 15:50 UTC
- **Branch**: main
- **Commit**: uncommitted, on ac32370
- **Contributors**: Claude Code + User

## Problem Statement

The owner wants machine tone noises for the encabulator's components, mostly suggesting cooling systems, and does not like the sound the machine makes when switched on (`machineHum`, three sine waves at 60, 120 and 181 Hz), which sounds like a synthesised tone, not machine hum. Not one sound for each part: a few variations of hum and fan noise, played at different speeds where appropriate, auditioned in a gallery first and then assigned. Not every cabinet needs a noise, but each noise should come from somewhere.

## Our Approach

Synthesise a small library of seamless loops, rendered once per audio context into buffers, and play them through the positional part audio as held loops whose playback rate can change as they play. A new development room, dev12, gives each loop a stand with RUN and SPEED, so the owner can listen to them at any speed.

## Implementation

`src/audio/machine-tones.ts` renders eleven four-second loops from a seed: transformer, motor, cabinet fan, drive fan, fan tray, blower, worn fan, coolant pump, coolant flow, compressor and turbine. Each is built from partials whose frequencies are rounded to whole cycles in the loop, filtered noise that is crossfaded from its tail into its head (equal power), slow wanders made from looping sinusoids, and short events (bearing ticks, gurgles, compressor strokes) placed wrapping round the loop's end, so nothing clicks at the join. Each is scaled to the same RMS, limited to a peak of 0.95. `machineTone(id, rate, level)` is a `LoopRecipe` that follows a `rate` signal with `setTargetAtTime`. `src/audio/machine-tones.test.ts` checks length, peak, the join and determinism for every tone. `src/rendering/tones-room.ts` is dev12, linked into the chain between dev11 and the Rhombus mini-game.

## Outcomes

The loops render in 60 to 145 ms each at 48 kHz, once, the first time each is played. Rendering at 8 kHz in the tests keeps them quick. The owner is to listen and choose; the chosen tones then replace `machineHum` on the encabulator's drive train, following its spin-up speed, and are given to the cabinets that would have cooling, each held from its fan or motor.

## Next Steps

Assign tones to parts once the owner has listened; replace `machineHum` in `src/scene/retro-encabulator-mcc.ts`.

## Addendum: running up and down, and the stands round the walls

The owner asked for each tone to run up to steady when switched on and run down when switched off. Each tone now has a `spin` (seconds up, seconds down, and the share of full speed it starts from), and `createSpin` gives its speed over time: up as `1 - (1 - x)²`, down from wherever it had got to as `k₀(1 - x)²`, over a time in proportion. `machineTone` sets the loop's playback rate and loudness from it about forty times a second, smoothed. The part audio used to fade any held loop in a twelfth of a second and stop it half a second later, which would have cut the run-down off; a loop's source may now give a `release`, and the hold lets it run down for that long before stopping it. The fan on each stand follows the same curve. The owner then asked for the stands round the edge of the room, facing in, so the room is now 14 × 10 m with four stands on the north wall, three on the south and two on each side wall, clear of the portals. The owner judged the tones excellent and all that is needed.

## Addendum: the encabulator's sounds

The owner judged the tones all that is needed and asked for them on the encabulator's cabinets, quieter than in the listening room. A bucket in `BAYS` (`src/scene/retro-encabulator-mcc.ts`) may now carry a `tone` (id, rate, level), held from inside the bucket while the main breaker is closed, so it runs up as the breaker closes and down as it opens. Six buckets sound: the main incoming section (transformer), the encabulator control CRT (cabinet fan, a little slow), the PLC chassis (cabinet fan, a little fast), the drive VFD-601 (drive fan), the hydrocoptic pump (pump) and the panendermic fan (blower); the starters, terminations, isolators and the rest are silent. The drive train's three-sine `machineHum` is replaced by the motor tone and deleted. Levels are 0.04 to 0.07, against 0.3 in dev12.

## Addendum: no more sine tones, and screens at their own pace

The owner still heard a sine-wave tone when the encabulator was switched on. `machineHum` was already gone, but the transformer tone on the main incoming section was little more than clean harmonics, and the parts' held loops (`MAINS_HUM`, `RELAY_HOLD` on every starter's contactor, `MOTOR_HUM`) were still plain oscillators. The transformer tone is now a coarse, low buzz: its harmonics soft-clipped, fluttering, over a low rumble and a gritty band of noise round 120 Hz; on the encabulator it plays at ×0.85 and 0.03. The three part loops are now machine tones (`machineTone` takes an optional `spin`, so a switched transformer or contactor only fades). The owner also asked that the CRT and LCD self-tests not reach steady together: `bootPace` gives each screen its own boot time from the golden-ratio sequence of the order screens are made (no two within half a second), and uneven gaps between its messages from its name.

## Addendum: the incoming supply isolator

The owner pointed out that MAIN INCOMING is the feed in from the three-phase supply, so it comes before the main disconnect and should not be switched by it, and asked for a steel cabinet to the left of the line-up holding a three-phase isolator. `src/scene/incoming-isolator.ts` builds it after a Square D HU365 heavy-duty safety switch (400 A, 600 V, three-pole, ANSI 61 grey) on galvanised unistrut posts, with rigid conduit down from overhead, a conduit nipple into section 1, a nameplate, the rating, DANGER and lock-out labels and a heavy-throw handle; it starts off, as the owner asked. In the model, the isolator's handle is `supply`; MAIN INCOMING's breaker is fed from it and the main disconnect too, and everything else from `mains` (both on). MAIN INCOMING's ammeters became line voltmeters reading the nominal 480 V whenever the isolator is on; with the main disconnect open the section is live but carries no current. The owner then asked that MAIN INCOMING and MAIN DISCONNECT not open: a bucket may now be `fixed`, a flat cover screwed at its corners, with no latches, rear cover or hinge, its works still built for the model but never shown. Finally, MAIN INCOMING lost its hum: it is only a large switch's lugs and meters. Tests check the order of supply: nothing live at first, the isolator alone lighting MAIN INCOMING, the main disconnect alone doing nothing.

## Addendum: a yellow rotary isolator, and everything re-rated

The owner pointed to a photograph of a yellow enclosed rotary isolator with a red handle and asked for it in place of the grey safety switch, with everything re-rated. Such switches stop at about 125 A, so the isolator now copies Eaton's P3-100/I5/SVB (100 A, three poles, an insulated surface-mounting box 200 × 280 × 169 mm, red rotary handle), under a maker's name of our own, VOLTARA, on a smaller galvanised stand with conduit into a gland in its top and out of its side into MAIN INCOMING. `createRotaryIsolatorHandle` in `cabinet-fittings.ts` is its handle (a red pistol grip on a yellow locking ring with a padlock tab, 0 to the left, I up), used through `disconnectHandle`'s new `rotary` style. MAIN DISCONNECT is re-rated from 800 A to 100 A; its monitor already read about 47 A. Another agent working in the same checkout had meanwhile given the isolator a softer click (`sound: 'soft-click'`), replacing the quick-make clack I had added; that choice is kept. Sources: Eaton's P3-100/I5/SVB listings (electrika.com, onninen.fi) for its dimensions.
