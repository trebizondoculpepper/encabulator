# Level 0 wiring: implementation report

Completion notes for the owner and the independent reviewer of `doc/prompts/level0-wire-machine.md`. The wiring inventory is `doc/design/level0-wiring.md`. No review (`doc/reports/level0-wiring-review.md`) existed when this work began.

## 2026-10-18, first run (in progress)

Work is being committed in milestones, each passing the five checks, so that a stopped run leaves a usable state. This entry is updated at each milestone.

### Plan

- The world graph holds a Level 0 process model (`src/game/level0-plant.ts`): pressures, temperatures, speeds, permissives, the PLC's boot and diagnostics, fault identities and the achieved dimensionality, with the electrical components' states bridged into it as graph inputs.
- The shared line-up gains hooks (door dressing, interlocks, tone rates, stack-light source, board mounts) so that Level 0 can wire its own panels without changing Level 2 or dev6.
- Replaceable boards: the PLC backplane's slots accept a compatible card again, and the drive's DC bus capacitor board has a mount; a spares shelf supplies healthy replacements.
- One injected random failure at a time (`src/game/level0-incidents.ts`), on simulation time, with a fresh interval after recovery.
- The first removal of an installed board swaps the chairs for the skip, once.

### Milestones

- Milestone 0: planning prompts, diary and this report committed.
