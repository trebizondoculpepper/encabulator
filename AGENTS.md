# Encabulator: agent guide

This file provides guidance to coding agents (Claude Code, Codex and others) working in this repository. `CLAUDE.md` is a symlink to it.

A browser game about a mysterious machine whose operation is stupid, opaque and profoundly unsafe, after the Rockwell Retro Encabulator film. The setting is an industrial plant in the United States in the late 1990s, and the game is in English. It follows the VX3 Simulator (`../vx3_simulator`), from which it took its controls and widgets, its effects, its world graph library and some of its sounds. Stack: Vite, TypeScript, Three.js, `@preact/signals-core`, Vitest, ESLint, Prettier.

For now the game is a series of development rooms that test the concepts the machine will need; the machine itself, and the plant around it, are not built yet.

## Rules

- Work on `main`. Do not create branches or worktrees unless the owner asks.
- Before committing, run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five.
- Markdown is one paragraph per line, never hard-wrapped.
- Record significant sessions in `diary/`.
- Never commit `agent-mailbox.toml` or `agent-inbox.toml`.
- Ask the owner one question at a time.
- Record every sound credit in `CREDITS.md` (author, source URL, licence, edits); technical notes go in `src/audio/assets/README.md`.

## Commands

- `npm run dev`: Vite dev server on `http://127.0.0.1:5174/` (strict port; the VX3 Simulator has 5173).
- `npx vitest run src/game/world/devices.test.ts`: one test file; add `-t "<name>"` for one test.
- `npm run format`: apply Prettier.

## Rooms

`src/main.ts` opens a room from `?room=` and keeps rooms alive while another is shown. The rooms are not one connected world: each is separate, and a portal (a patch of wall in the colour of the room it leads to, named above) sends whoever walks into it straight to that room, standing in front of its portal back (`src/game/dev-room-links.ts`, `src/scene/portals.ts`). Each room's portal to the room before it is on its west wall, to the room after it on its east wall:

- **dev0, Controls and Displays** (`/?room=dev0`, the default; `src/rendering/controls-room.ts`). The kinds of controls, displays and working parts the machine will be built from, taken from the motor control centre in the Retro Encabulator film (see `doc/research/retro-encabulator.md`). On the north wall, the CONTROLS board (`createControlsBoard` in `src/rendering/test-boards.ts`) holds one of each 30 mm pilot device, and the DISPLAYS board (`createDisplaysBoard`) holds one of each indicator and display with test controls under it. Along the south wall, a pedestal for each working part of a motor control unit (`src/rendering/device-pedestals.ts`): the unit with its door, operating handle and breaker; a contactor; a thermal overload relay; a control fuse; a drive's power board with its bus capacitors; and an induction motor. Each pedestal has a sloping test panel that puts its part through what it does, failures included. `?view=controls`, `?view=displays` and `?view=pedestals` start in front of each. In development, `devControls.parts()` lists every clickable part, `devControls.work(name)` works one, `devControls.view(x, y, z, tx, ty, tz)` places the eye and `devControls.log()` reads the log.
- **dev1, Effects** (`/?room=dev1`, `src/rendering/effects-room.ts`): the VX3 Simulator's end-state effects room (colour channels, π drift, warp, sparks, smoke, embers), driven by `src/game/phase-effects.ts` and recorded with `src/game/effect-settings.ts`.
- **dev3, Racks** (`/?room=dev3`, `src/rendering/racks-room.ts`): the industrial design of 19-inch racks, built to catalogue dimensions (`doc/research/rack-dimensions.md`): a bayed suite of 42U server cabinets, an industrial enclosure on its plinth, a 24U cabinet on castors, an open two-post relay rack, a 12U cabinet and an open frame, each branded and filled with units of every kind, and loose units on display plinths with nameplates. It is only appearance; nothing works. `src/scene/rack-equipment.ts` builds the cabinets (`createRackCabinet`, `createCabinetSuite`, `createRelayRack`) and the units (`createRackUnit`: blank, vented, handles, door, drawer, fans, drives, patch, shelf of half-width units, controls, display). `?view=racks` and `?view=plinths` start in front of each.
- **dev2, Hallucinations** (`/?room=dev2`, `src/rendering/hallucination-room.ts`): peripheral apparitions (`src/game/hallucination.ts`), perceptual ghosting (`src/game/ghosting.ts`, `src/rendering/ghost-overlay.ts`) and geometric patterns (`src/game/patterns.ts`, `src/rendering/pattern-overlay.ts`).

## Architecture

- `src/game/` is pure logic with no DOM or Three.js, with its tests beside it (`*.test.ts`).
- **Components** (`src/game/world/components.ts`) are every part's behaviour, apart from any model of the machine: inputs (Power, Latch), one source of truth for state (a bound world value or its own), guarded operator actions, silent sets from the model, and named transition and state sounds. Operator controls: LED pushbutton, momentary, switch, selector, key-locked selector, operating handle, mushroom stop, push-to-test pilot light. **Self-acting** parts move by what flows through them and sound as they act, whatever moved them: contactor (pull-in, drop-out, welded contacts), thermal overload relay (trip class, RESET once cool, TEST), fuse (I²t, replace), electrolytic capacitor (bulge, vent, smoke, replace), and the hour meter. Use a component for everything a player can work or a failure can strike; failures of board-level parts (a blown capacitor) are components too.
- **Views** (`src/scene/`) only draw. `industrial-controls.ts`: 30 mm push buttons, mushroom head, lever and key selectors, potentiometer, pilot lamp, legend plates and nameplates. `industrial-displays.ts`: stack light, hour meter, message display, operator terminal, drive keypad. `industrial-devices.ts`: the motor control unit, contactor, overload relay, fuse holder, capacitor board and motor. The 1980s parts from the VX3 Simulator (`eighties-controls.ts`, `panel-switchgear.ts`, `panel-instruments.ts`) are kept and reused.
- `src/rendering/part-sound-hub.ts` registers each component with its view so the room plays its sounds where it is; `src/audio/control-sounds.ts` synthesises or plays each kind of click, clunk, trip, pop and bang, and `src/audio/part-loops.ts` holds state sounds (60 Hz mains hum, relay hold, motor hum).
- **The world graph** (`src/game/world/graph.ts`) is a directed graph of cached functions on signals: inputs, fixed parameters, states, derived values and outputs, with declared actions and processes, and `analyse()` to list dead controls and unseen values. The machine will be built on it.
- Every knob and rotary selector turns the same way: a click on its left half turns it anticlockwise (down), its right half clockwise (up), one detent per click (`knobDirection` in `src/scene/rotary-knob.ts`).
- `src/rendering/first-person.ts` walks, looks and zooms; `src/rendering/ps1-material.ts` gives meshes their PS1 vertex snapping (P toggles the PS1 resolution).
- Mains is American: 60 Hz, 480 V three-phase power, 120 V control.
- Everything is in English: labels, legends, log lines and notes. Some text carried over from the VX3 Simulator may still be German; translate it when found.
