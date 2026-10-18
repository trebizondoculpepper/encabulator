# Plan: Level 0 machine wiring

The plan for `doc/prompts/level0-wire-machine.md`. Progress and results are reported in `doc/reports/level0-wiring-implementation.md`; the wiring itself is described in `doc/design/level0-wiring.md`.

## Approach

- The world graph holds a Level 0 process model (`src/game/level0-plant.ts`): pressures, temperatures, speeds, permissives, the PLC's boot and diagnostics, fault identities and the achieved dimensionality, with the electrical components' states bridged into it as graph inputs.
- The shared line-up gains hooks (door dressing, interlocks, tone rates, stack-light source, board mounts) so that Level 0 can wire its own panels without changing Level 2 or dev6.
- Replaceable boards: the PLC backplane's slots accept a compatible card again, and the drive's DC bus capacitor board has a mount; a spares shelf supplies healthy replacements.
- One injected random failure at a time (`src/game/level0-incidents.ts`), on simulation time, with a fresh interval after recovery.
- The first removal of an installed board swaps the chairs for the skip, once.

## Milestones

1. Toolkit support: seated card slots and spares, latches, a restartable boot, annunciator sequence M, bound LCD pictures.
2. Pure game logic, tested: the process model on the world graph, the Dimensionality stages and geometry, and the failure scheduler.
3. Line-up hooks in `src/scene/retro-encabulator-mcc.ts` for the sandbox's own door dressing, interlocks, tones and stack light, leaving Level 2 and dev6 as they are.
4. Level 0's panels, labels, displays, spares shelf, skip swap and random failures.
5. The wiring inventory, browser verification, the diary and the final report.
