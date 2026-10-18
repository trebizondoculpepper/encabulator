# Plan: Level 0 starts with its machine switches and selectors off

The plan for `doc/prompts/level0-default-controls-off.md`. Completion notes go in `doc/reports/level0-default-controls-off.md`; the wiring it changes is described in `doc/design/level0-wiring.md`.

## Approach

- Set the authoritative initial state once, when a Level 0 machine is made (`src/rendering/level0-machine.ts`, `src/game/level0-plant.ts`), never by forcing it each frame, so a retained room keeps the player's settings. Level 2 and the galleries are untouched: the shared components keep their own defaults.
- Every operator-worked breaker starts OFF, whatever works it (a handle, a rocker or the isolator inside). MAIN INCOMING's breaker is sealed behind its fixed cover and never operated, so it stays closed: it is protection, not a control, and its meters must read the incoming supply.
- Starters with START and STOP (MAIN DRIVE MOTOR, COOLING FAN, AUXILIARY MOTOR) start stopped, so they wait for START once powered; units whose only control is their breaker or rocker run when it closes.
- Selectors: FEED MOTOR HAND OFF AUTO starts at OFF; the HYDRAULIC PUMP key gains a middle OFF (LOCAL OFF REMOTE) and starts there; the MAIN INCOMING AMMETER PHASE selector gains OFF (ammeter disconnected: OFF L1 L2 L3, as real ammeter selector switches have) and starts there; CHART DRIVE starts at STOP; DINGLE ARM, the panendermic fan's LOW OFF HIGH and BOOST are already off. The speed knobs start at zero.
- The Kirk key starts out (turned off): the main disconnect will not close until it is turned in, as its caption says. Flagged for the owner's review.
- Left without OFF, for the owner's review: the ENCABULATOR CONTROL DISPLAY selector (which picture to show), PHASE TRIM (an adjustment, left centred), and the drive keypad's LOCAL/REMOTE (a command source; the drive itself starts stopped).
- Emergency stops released, protective devices healthy, terminals made, cards installed.

## Verification

Tests of a fresh room's initial state, the manual power-up from the isolator to several modules, and the new OFF positions; existing Level 0 tests updated to power the machine up by hand; Level 2 and gallery tests unchanged; a browser check of a fresh room; the five checks.
