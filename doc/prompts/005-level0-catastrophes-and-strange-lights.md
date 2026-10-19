# 005: Catastrophes put the lights out; strangeness gets into them

The lights should share in the machine's worst moments and in the strangeness that comes before them. Read first: `AGENTS.md` (Level 0, dev6's failures), `doc/plans/level0-lighting.md` (step 3), `doc/plans/level0-failures.md`, `doc/reports/level0-lighting.md`, prompts 001 to 004, and the code: `src/game/machine-failure.ts`, `src/game/level0-strangeness.ts`, `src/rendering/level0-strangeness.ts`, `src/rendering/level0-scenarios.ts`, the warehouse fire (`createWarehouseFire`).

## Behaviour

- **Catastrophes**: KAPUT's bangs and a machine fire surge the lights (a brief swell, then a severe disturbance) and trip lighting zones; the room drops to emergency lighting; the player resets the zone breakers at the distribution board, and the tubes stutter back to life zone by zone.
- **Strangeness**: as the machine's strain rises, the lights join the strangeness: a tube here and there flickers, then more, the ballast hum rising and falling with the machine; at breakdown it stops at once, as the other effects do.
- **The scenario simulator**: a SYMPTOMS switch for a brownout and a FAULTS switch for a lighting trip (a real cause whose effects follow from the model), as the other faults and symptoms are.
- Tests in the existing strangeness, failure and scenario tests.

## Verification

The tests; Level 0 in the browser: a KAPUT trips the lights and they come back after the reset; rising strain brings flickering; the simulator's new switches; frames for the owner; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/level0-lighting.md` as a dated entry under prompt 005, preserving earlier entries: what each failure does to the lights, the strangeness thresholds, the new switches, results, limitations and open questions. A final chat response alone is not the return path.
