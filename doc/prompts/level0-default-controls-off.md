# Start Level 0 with machine switches and selectors off

Change Level 0's initial machine state so that all machine switches and selectors begin in their OFF positions. The player should have the pleasure of powering up the Encabulator, enabling its individual systems and discovering how they interact. This is a future implementation prompt; authoring this document does not execute the work.

## Intended behaviour

On a fresh Level 0 room instance, the incoming isolator, main disconnect, cabinet and module power switches, maintained enable switches and rotary selectors with OFF positions must all start OFF. No subsystem should silently start because a hidden internal control retained an ON default. Keep the initial physical positions, component states and world-model inputs consistent so that the first interaction operates the control in the direction its visible position suggests.

Turning on incoming power should supply only what is genuinely connected upstream of the main disconnect. Turning on the main disconnect supplies the appropriate downstream circuits, but individual modules that require their own enable, START or selector setting must wait for those controls. Preserve existing boot sequences, local feedback, dependencies, interlocks and reset requirements. Do not introduce a mandatory scripted startup sequence or narration: this remains an exploratory machine sandbox.

For selectors that currently have no meaningful OFF position, inspect their real function before changing them. A measurement selector such as PHASE is different from a power or operating-mode selector. Add an explicit, labeled OFF position where it has a plausible function, such as disconnecting a meter input or disabling a selected operating mode. Define that position's behaviour and update detents, labels, bindings and tests together. Never silently interpret an existing phase or mode as OFF. Document any selector for which OFF would be misleading or incompatible with its function, and leave that exception for owner review rather than inventing an unrelated function.

Momentary buttons remain released. Keep emergency stops, trips, protective devices and safety interlocks in their appropriate healthy resting states; OFF must not be confused with tripped, failed or emergency-stopped. Internal self-acting components should reflect the unpowered machine rather than acquire artificial operator settings. Preserve healthy installed components and their attachment rules.

## Scope and architecture

Read `AGENTS.md`, applicable toolkit instructions, `doc/prompts/level0-wire-machine.md`, the current Level 0 wiring design and implementation reports, and the actual code before editing. Start with `src/rendering/level0-machine.ts`, `src/game/level0-plant.ts` and their current integration. Coordinate with `doc/prompts/phase-selector-voltage-feedback.md` where selector positions or incoming-side measurements overlap.

Apply these defaults to Level 0's machine configuration. Preserve Level 2's narrative starting state and development-gallery demonstrations; do not change shared component defaults globally just to achieve this room's startup state. Building services, warehouse lighting, fire protection and emergency equipment are outside the machine-startup change.

Initialize the authoritative component/model state correctly rather than forcing controls back to OFF each frame. Ordinary navigation away from and back to a retained room instance must preserve the player's settings. Fresh instance creation starts OFF; normal module resets retain their established behaviour and must not unexpectedly reset the whole machine.

## Verification

Inventory every machine switch and selector, its initial position, OFF semantics and any proposed exception. Check a fresh room visually and through its model: maintained power and enable controls are OFF, buttons are released, the machine is silent and unpowered, and controls agree with their bindings. Verify a manual power-up from the isolator through main power to several individual modules, including meaningful feedback and existing boot/reset behaviour. Confirm that retained room navigation preserves settings and that Level 2 and gallery defaults remain intact. Add focused tests for initialization and startup dependencies, and run the repository's required checks before committing if requested.

## Return path

Leave completion notes in `doc/reports/level0-default-controls-off.md` for the owner and the next reviewing agent. Create the destination if missing; preserve existing feedback and append a dated entry on subsequent runs. Include the switch/selector inventory, changes to OFF positions or labels, startup walkthrough, validation results, limitations, exceptions needing review and unresolved questions or blockers. Link related Level 0 wiring and phase-selector reports where applicable. A final chat response alone does not satisfy this return path.
