# Development Diary Entry - 2026-10-16

## Context

- **Date**: 2026-10-16
- **Branch**: main
- **Contributors**: Claude Code + owner

## Problem Statement

The training room's light switch, call point and the like were painted plates that did nothing, and there were no building fittings among the parts. The owner asked for a development room of standard room and architectural fittings, including extinguishers, sprinklers, fire control panels, thermostats and environmental controls, with a world model of its own so the devices visibly do things: a smoke detector, set off by a button, linked to a fire control system that triggers sprinklers.

## Our Approach

A world model of one room's building services on the world graph (`src/game/building-services.ts`), tested: power and breakers; two-way lighting with a dimmer, occupancy sensing and emergency lighting; a fire alarm with a call point, a detector, a keyed panel, sounders, door holders and a pre-action sprinkler system; climate (air conditioning, thermostat and radiator, vent and blinds) driving the room's temperature; an extractor with run-on; an access controlled door; an accessible toilet alarm; sockets and a spur. The fittings are views (`src/scene/building-fittings.ts`) and parts (`src/rendering/building-parts.ts`) built on the same plumbing as the machine's parts (`beginPart`), bound to the model by their props. New synthesised sounds: a tone recipe for beeps and chimes, and loops for the fire sounder, the toilet alarm buzzer, extract fans and the sprinkler spray.

## Outcomes

In the browser, TEST SMOKE put the panel into alarm on zone 2, the sounders sounded, the fire door swung shut, the access door unlocked, and after 8 seconds the sprinklers sprayed; pressing the light switch turned the room dark. Two fixes were needed: everything mounted on a wall had to stand a few millimetres off it (the boards and captions z-fought with the wall), and particle sizes ignore the room's scale, so the spray was invisible until given in scene units.

The owner asked whether free models could replace hand-built ones. A search found CC0 models only for generic items (Poly Haven chairs, a Korean extinguisher, a breaker box; Kenney's car kit); the UK-specific ones (Fulleon sounder, Apollo detector, UK sockets, a fire panel) are CC-BY on Sketchfab, need an account to download and credits in `CREDITS.md`, and several have far too many triangles.

## Revision: a real panel, and the VX3's alarm

The owner found the fire alarm panel unconvincing and asked for one modelled on a real panel. It now follows C-TEC's CFP two-zone conventional panel, from the photograph and dimensions in the maker's datasheet (380 × 235 × 90 mm), with a fictional maker's name: an off-white case, a charcoal facia drawn as one canvas with the instructions, numbered keys and colour-coded buttons, a red key in its keyswitch, and the fire, zone and general lamps set into it. The owner also asked for the VX3 Simulator's fire alarm sound: its synthesised Hausalarm (`src/audio/fire-alarm.ts`, with its test and credit) now plays from the sounder-beacons.

## Revision: the burning bin and a voice alarm

The owner pressed the call point and the sprinklers did not start (only the detector led to them), and asked for a realistic fire process, with calm spoken announcements, set off by a joke: a button on a pedestal that sets a waste-paper bin alight under the smoke detector. The fire model became a two-stage alarm with a voice alarm (BS 5839-1 and -8): the bin's smoke sets off the detector after a few seconds; the alert stage asks everyone to stay put for a 90-second investigation, which finds at random a fire or a false alarm; a false alarm is announced while the bin still burns, so the second activation evacuates; in evacuation the fire grows until the nearest sprinkler head's bulb bursts at 68 °C, and its spray puts the bin out. The messages, worded after BS 5839-8's examples, were rendered with Piper's CC BY 4.0 British VCTK voice (a male speaker from Surrey, checked at about 108 Hz) and given a public-address colour. The pre-action valve and TEST SMOKE button were removed. Smoke rises from the bin in a plume and spreads under the ceiling.

## Next Steps

Decide on the free models; replace the training room's painted fittings with these parts.
