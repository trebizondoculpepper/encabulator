# Phase selector and supply-voltage feedback

Implement plausible supply-voltage feedback for the Encabulator's incoming phase selector and meters, starting with Level 0. This is a future implementation prompt; writing it does not authorize executing the implementation now.

## Intended behaviour

With incoming power available but the machine switched off and drawing no current, all phase readings show the same steady nominal voltage. Use the machine's existing nominal supply and meter units. With incoming power unavailable, the meters read zero.

When the machine is operating and drawing current, the selected phase reading shows a slightly reduced, gently fluctuating voltage. Derive the voltage sag and fluctuation amplitude from actual modeled load/current so that heavier loads have a stronger effect. Keep the change subtle and readable, with smooth needle movement rather than abrupt random jumps. Removing the load restores the steady nominal reading; opening the main disconnect must not zero incoming-side meters while the upstream isolator still supplies them.

The phase selector chooses the phase being measured; it must not cause a load or move that load between phases. Maintain a consistent underlying voltage for each phase, with any imbalance justified by the modeled loads. If all three phases have dedicated meters, show their corresponding values consistently rather than making a voltage sag jump between meters solely because the selector turned. Check whether existing instruments measure phase-to-phase or phase-to-neutral voltage, and retain correct labels, nominal values and selector legends for that arrangement.

## Implementation boundaries

Read `AGENTS.md`, applicable toolkit instructions, `doc/design/level0-wiring.md` if present, and the current machine wiring before editing. Inspect `src/rendering/level0-machine.ts`, `src/game/level0-plant.ts` and `src/scene/retro-encabulator-mcc.ts`; these may have evolved since this prompt was written. Distinguish the incoming electrical phase selector from the Phase Reference signal-trim control.

Keep electrical readings in pure world-model logic; views only render and ease those readings. Use the existing shared selector and meter components and the universal interaction scheme. Preserve incoming-isolator/main-disconnect sequencing, display startup behaviour and Level 2's narrative logic. Avoid unrelated panel or cabinet redesigns.

## Verification

Verify loss of incoming supply, incoming supply with main power off, light and heavy operating loads, load removal and every selector position. Check that all unloaded readings agree, loaded readings remain below nominal with bounded fluctuations, and selecting another phase changes only what is measured. Cover these state relationships with meaningful logic tests and check the physical meters in the browser. Run the repository's required checks before committing if a commit is requested.

## Return path

Leave completion notes in `doc/reports/phase-selector-voltage-feedback.md` for the owner and the next reviewing agent. Create the destination if missing; preserve existing feedback and append a dated entry on subsequent runs. Record the chosen electrical interpretation, affected controls and displays, implementation details, validation results, limitations and unresolved questions or blockers. Link relevant Level 0 wiring implementation/review reports where applicable. A final chat response alone does not satisfy this return path.
