# Independently check Level 0 machine wiring

Review the completed Level 0 wiring as an independent reviewer. The goal is a coherent non-narrative machine toy in which players can explore controls, discover dependencies, diagnose a single random component failure, isolate it and repair it. Evaluate actual code and observed behaviour, rather than accepting the implementer's report or a green test suite as proof. This is a future review prompt; authoring it does not execute the review.

Read the repository and applicable toolkit instructions, `doc/prompts/level0-wire-machine.md`, `doc/design/world-model.md` and the delivered `doc/design/level0-wiring.md`. Inspect Level 0's room and wiring factory, the MCC assembly, component logic, views, parts, shared controls and relevant tests. The implementation prompt is the acceptance contract; independently verify its complete inventory against the actual machine.

## Check scope and coverage

Confirm `?room=level0` has its own machine state and preserves the copied warehouse layout. It must have no narrator, training jingle, mission progression, prescribed task list or scripted ending. Machine sounds remain. Check that wiring changes have not altered Level 2's scenario or broken shared development-room parts.

Walk every cabinet front and inspect every interior. Build an independent table of functional units, operator controls, model actions/values, local feedback, downstream dependencies and recovery policies. Compare this with the implementation inventory and report omissions. Each functional front-panel unit must have at least one meaningful physical input on that unit. Passive covers and blank plates are legitimate exceptions; report whether the exceptions are genuinely passive. An internal fuse needs electrical/model inputs, not an artificial button of its own.

Operate every existing and newly added control across meaningful states, selector detents and knob ranges. Verify powered, unpowered, interlocked and faulted behaviour where relevant. Check TEST, ACK, RESET and maintained controls individually. A click animation, self-lit button or arbitrary unrelated gauge movement does not establish that a process control is wired. Conversely, a passive display need not become pressable. Record intentional no-change cases and the explanation a player can discover.

## Check labels

Check every existing and newly added button and display, including accessible cabinet interiors, for a readable in-world label. Also inspect operating handles, knobs and selectors for their purpose, positions and ranges. Display labels must identify the actual quantity or function, with appropriate units, scale or mode. Confirm repeated TEST, ACK and RESET buttons are unambiguous in their panel context and that each label matches the implemented behaviour.

Inspect contrast, size, placement and readability from a normal operating position. Check for missing, overlapping, clipped or misleading labels, labels wider than their panels, and legends that hide displays or moving parts. Verify printed labels do not intercept use or block the associated control. HTML overlays and hover-only text do not satisfy the physical-label requirement. Record missing or unusable button/display labels as acceptance findings, with specific locations.

## Trace actual causality

For each process control, trace the action into the world model and back to visible or audible feedback. Check that other components can depend on the same value. Look for parallel presentation-only state, hard-coded timer effects, arbitrary wandering readings, stale or disconnected signal bindings and dependency edges that exist only in documentation. Run the world graph's analysis, but investigate its results: a graph heuristic may miss component-local logic or flag a legitimate direct derived path. Do not accept dummy state introduced merely to produce clean analysis.

Verify immediate local acknowledgement and plausible subsequent response times. Confirm that wider effects follow documented supply, permissive, process or signal relationships. A local knob must not randomly disturb unrelated instruments. Check that switch-off effects, gauge defaults, screen startup and sound run-up/down match actual power domains. Upstream-powered alarm/status circuits may remain live when the affected cabinet is isolated; a display without power must not keep presenting a live diagnostic without an explicit modeled auxiliary supply.

Specifically test Phase Reference. It must have a physical input that changes the live trace/readout through a model value. The existing LCD renderer draws a 320 × 240 canvas at approximately 12 Hz; its former vector phase was time-driven. Confirm the new control has a meaningful effect on the reference signal rather than merely changing a decorative animation. Check any consumers of that signal too. Also verify the existing BOOST-to-red-band behaviour and Automation isolator's green/red indication, including darkness when its indication supply is unavailable.

## Check the dimensional startup display

Select the Dimensionality LCD mode through its physical control. Observe the live progression from 1D line through 2D planar figure, 3D cube, 4D projected tesseract and higher-dimensional structure at full operation. Check that the stage is legible, the graphics remain readable and geometry/redraw cost is bounded. Confirm the sequence is visible after the LCD boot screen, rather than finishing unseen or merely replaying a fixed animation.

Hold the machine in a partial-startup condition, remove a required dependency and restore it. The displayed dimensionality must follow actual model readiness and must not reach full operation just because a timer expired. Check reset, interrupted startup, restart and a relevant component fault. The display should show the appropriate reduction or rebuilding of coherence while it has power and should be dark without its own supply. Verify that achieved dimensionality is a shared model value; continuously rotating projection alone is not proof of a functioning dependency. Check the implementation's stated stage prerequisites against what you observe.

## Inspect internal dependencies

Prove that internal device presence, connection, health and supply are distinct states. Remove or disconnect representative supply, processor and I/O components and trace the appropriate local and remote consequences. Check specific LCD diagnostics, annunciator indications, the red stack-light tier, unavailable outputs, lost or invalid readings and any relevant trips. Avoid treating every empty slot as the same generic failure or as a reason for every panel to fail identically.

Verify isolation is required for removal of installed serviceable parts. Loose objects remain usable. Fixed motherboards and soldered components retain their attachment rules; replacement of a failed fixed part should use the appropriate serviceable assembly. Confirm the model continues to simulate hidden interiors and that closing a door never repairs or suspends a fault. Check that failure state follows a removed faulty assembly rather than being left behind in a cabinet effect.

## Check board removal and skip appearance

Begin with the chair stack and no skip. Verify the first successful detachment of an installed circuit board replaces the chairs with one skip at the established Level 2 location. Test a healthy board as well as a faulty board. A refused live-cabinet pickup, touching a board, opening a door and removing a non-board part must not spawn the skip. Check collision changes, appearance/dressing, existing carrying, floor drops, bin tossing and clatter. There must be no narration or forced camera movement.

Verify the skip remains after further removals, reseating, repair, resets and leaving/re-entering the retained room instance, without duplication or the chairs returning. Discarding a faulty board must leave its installed function missing until a compatible healthy replacement is fitted; disposal alone cannot clear the root fault or complete a mission. Record any mismatch in the return-path report.

## Test the random-failure and repair loop

Use a deterministic seed or development hook to reproduce failures, and inspect at least one ordinary powered-time scheduling cycle. Confirm the default delay is measured in minutes and that room suspension and unavailable power do not create surprise failures or a backlog. Targets must be eligible, installed, powered and healthy, with a failure that their model supports. A random global alarm or smoke plume without a failed component is insufficient.

There must be at most one injected random root-cause failure at a time. Several downstream symptoms are allowed. Verify new random failures pause while the incident or other unresolved fault conditions remain, and that successful recovery starts a fresh delay. Do not mistake multiple symptoms for multiple random failures. Normal player interactions, including removal of more than one component, must remain possible.

For a smoke/sparks-capable fault, trace the full cycle: powered failure, local diagnosis, cabinet isolation, immediate cessation of new electrical discharge, gradual smoke clearance, removal, compatible healthy replacement/reseating, restoration of power, and the unit's specified reset/start behaviour. Before repair, test restoring power and reinserting the faulty assembly: the fault must persist, and effects resume if appropriate. Isolation, ACK, RESET and a door close must not silently repair hardware. Verify source placement and normal termination of positional audio and effects.

The repair loop must work through the shared player interaction scheme, with compatible replacement parts available when required. A debug command that simply sets health to healthy is not a complete player-facing recovery path. Check compatibility and connection state, not merely whether an object is geometrically near a slot. Unsupported or inaccessible repair cases must not be chosen by the random scheduler.

## Check reset semantics explicitly

Automation RESET must restart the cabinet's reset/boot process on every valid powered press. Test healthy steady state, boot already in progress, a present fault, and a fault whose physical cause has been corrected. Test unavailable power separately. Look for the former restriction that only a globally stalled machine can reset. Confirm missing or failed boards are diagnosed again after a reset attempt and that dependent equipment sees the interruption.

For each other unit, check the documented local policy against the physical controls. Reset-equipped units that require reset remain latched until their cause is corrected and the appropriate RESET is used. Automatic-start units resume once power and dependencies return. ACK only acknowledges. A reset must not clear another module's unresolved fault or make absent/failed components function. Do not impose an undocumented reset requirement on every healthy cabinet at ordinary power-on.

## Validate and report

Run the five repository checks and inspect the tests for meaningful assertions. Add review-only reproduction notes or clearly identified tests if needed; do not silently fix the implementation while reviewing it. Use the actual browser and universal controls to verify the requested feedback and at least one complete repair. Report any gap in browser verification rather than substituting a source-code claim.

Produce a review report with an acceptance verdict, a coverage table, findings ranked by impact, specific file locations, reproduction steps, expected versus observed behaviour, validation results and any explicit limitations. Give special attention to unwired controls, units without an input, presentation-only effects, unsupported repair targets, repeated random faults during an incident, incorrect isolation behaviour, reset that is ignored when healthy, and regressions in Level 2. Distinguish missing acceptance requirements from optional future improvements. Do not approve solely because the inventory claims full coverage or because tests pass. Follow the invoking user's instructions about saving the report and any subsequent fixes or commits.

## Return path

Read the implementer's handoff at `doc/reports/level0-wiring-implementation.md` if available, while independently checking its claims. Write the review report, comments, feedback and unresolved questions to `doc/reports/level0-wiring-review.md` for the owner and the implementing agent. Create the directory and file if missing. Include the verdict and evidence required above, the revision reviewed when available, any review blockers, and concrete follow-up work. If review cannot finish, leave the completed coverage and remaining checks here too.

Preserve existing feedback and append a dated entry on each review or re-review. Track which earlier findings are resolved, still open or newly discovered, and link the implementation report and relevant evidence. End the chat handoff with a link to the review report; a final chat message alone does not fulfil this return path.
