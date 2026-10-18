# Level 0 wiring: implementation report

Completion notes for the owner and the independent reviewer of `doc/prompts/level0-wire-machine.md`. The wiring inventory is `doc/design/level0-wiring.md`. No review (`doc/reports/level0-wiring-review.md`) existed when this work began.

## 2026-10-18, first run (in progress)

Work is being committed in milestones, each passing the five checks, so that a stopped run leaves a usable state. This entry is updated at each milestone.

### Plan

The plan is in `doc/plans/level0-wiring.md`.

### Milestones

- Milestone 0: planning prompts, diary and this report committed.
- Milestone 1, toolkit support: the PLC backplane's slots are wired to whichever card is seated in them (`slots`, `spare`, `insert` on the backplane device, tested in `src/toolkit/components/industrial-control/parts/machine-components.test.ts`); a released object the room diverts is forgotten by the shared object handling, so it can be installed somewhere new; potentiometers can be bound to world values; a key switch and a breaker's handle can be latched (for the Kirk key); a screen's boot can be restarted and a controller's boot lines are exported; the annunciator has ISA sequence M (manual RESET, tested); the LCD monitor takes bound signals for its trend and vector traces, and a picture drawn by the room. Level 2, dev0 and dev6 behave as before (all existing tests pass).
- Milestone 2, pure logic, tested: `src/game/level0-plant.ts`, the process model on the world graph (15 tests in `level0-plant.test.ts`, including the graph analysis: no unseen controls, constant outputs, unwritten or invisible states); `src/game/dimensionality.ts`, the stages, their conditions and the projected n-cubes (5 tests); `src/game/level0-incidents.ts`, the one-at-a-time failure scheduler with an injected random source (6 tests).
