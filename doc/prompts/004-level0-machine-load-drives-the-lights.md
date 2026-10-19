# 004: Level 0's machine pulls the lights about

The machine and the building share one supply. Starting a big motor should blink the lights; running the machine over capacity for a long time should brown the building out until the load comes down. Read first: `AGENTS.md` (Level 0), `doc/plans/level0-lighting.md` (step 3), `doc/reports/level0-lighting.md`, prompts 001 to 003, and the code: `src/game/level0-plant.ts` (line current, `supplyVolts`, `monitor`, the soft-started motors), `src/toolkit/components/architectural/logic/supply-quality.ts` and `building-services.ts`.

## Behaviour

- **The supply comes from the plant** in Level 0, not from a test selector: the building services model takes its supply voltage from the room (a bound input, say) and Level 0 bridges the plant's state to it.
- **Motor starts**: each start of a big motor (those with START buttons and the drive) dips the supply for a fraction of a second, by its inrush, deep enough to drop out some fluorescent tubes, which restrike.
- **Overcapacity**: the plant's load current above a share of the main disconnect's 100 A rating (the panendermic fan on BOOST, the drive near full speed, worn parts drawing more) sustained for a few minutes sags the supply and makes it wander, as `supply-quality.ts`'s brownout does: tubes flicker, drop out and restrike, and some emergency fittings change over in the deepest dips, until the load comes down. Give the player a readable sign of the cause (the MAIN INCOMING voltmeters and the power monitor already show the sag).
- Pure logic in `src/game/` (or the plant) with tests: a motor start dips; sustained overcapacity browns out; recovery when the load falls.

## Verification

The tests above and the existing Level 0 tests; Level 0 in the browser: start motors and see tubes blink; run over capacity and see the brownout build and clear; frames for the owner; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/level0-lighting.md` as a dated entry under prompt 004, preserving earlier entries: the thresholds chosen and why, changed APIs, test and browser results, limitations and open questions. A final chat response alone is not the return path.
