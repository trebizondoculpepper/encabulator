# BBC Micro Model B diagnostic terminal

Bring back the existing VX3 Simulator BBC Micro setup as the Encabulator's diagnostic terminal: BBC Micro Model B, Microvitec Cub monitor, floppy disk drive and desk. The standalone workstation has been implemented; the live diagnostic link is planned separately in [the annunciator diagnostics prompt](bbc-micro-annunciator-diagnostics.md). That follow-up remains planning-only until the owner agrees the behaviour.

## In-world role and placement

A BBC Micro Model B is used as a diagnostic terminal for the Encabulator. Place the existing setup on a desk nearby to the left of the machine as viewed from its front, at an angle so it feels like a workstation positioned for an engineer. Preserve access around the machine and to the cabinet backs; choose the precise position and angle against the current warehouse layout rather than moving the Encabulator.

The original design proposed a ribbon cable from underneath the BBC Micro to the rear of one of the cabinets. The owner subsequently deferred the machine data cable until cabinet backs were modelled; follow the newer [diagnostic-link prompt](bbc-micro-annunciator-diagnostics.md) and its pending physical-interface decision rather than adding this cable automatically. If subsequently authorized, route it as follows: Give it a deliberate supported route and a plausible interface/strain-relief connection at each end. Inspect the original computer's interfaces before choosing its function; do not imply that a bare ribbon plugs directly into a mains terminal. Coordinate the destination with `doc/plans/encabulator-cabinet-backs.md` and record which cabinet and interface it uses. Do not leave a cable crossing a walking route unsupported.

## Reuse the existing design

The owner has already designed the BBC Micro, Microvitec Cub monitor and disk drive in `../vx3_simulator`. Reuse those models and the existing desk/workstation design, respecting their established proportions, materials, details and branding. This is integration work, not a redesign. Inspect the current source and dependency chain before choosing what to share or port. Known starting points include `../vx3_simulator/src/scene/bbc-micro.ts`, `../vx3_simulator/src/scene/bbc-disk-drive.ts`, `../vx3_simulator/diary/2026-10-12_bbc-computer-and-startup-clues.md` and the existing BBC screenshots under that project's `doc/design/screenshots/`. Locate the existing Cub monitor and desk builders from those sources rather than substituting new models.

Reusable equipment belongs in the appropriate toolkit component category and gallery; its workstation arrangement and Encabulator bindings belong in the game. Follow the repository's component architecture and universal interaction scheme. Do not bring over room-specific VX3 controls or keyboard bindings.

The standalone workstation has since been ported into `src/toolkit/components/industrial-control/parts/bbc-workstation.ts` and exhibited in Dev19, Retro Computing. Reuse this component and its views rather than copying the VX3 geometry a second time. Its screen is currently a standalone demonstration; the live Encabulator connection remains future work. Check later model-replacement research before choosing assets. Credit every model actually used in `CREDITS.md`, including author/source, licence or permission, and modifications.

## Power-up sequence

The terminal begins OFF, with its screen dark and disk drive idle. The player can power it on using a labeled in-world control. On power-up, play the BBC Micro Model B's distinctive system startup beep before loading the diagnostic program. Reuse the existing prepared sound at `../vx3_simulator/src/audio/assets/bbc-model-b-boot.wav` if appropriate, checking its provenance and documenting credits in this repository. Preserve an intentional sequence: power ON, startup beep, program loading, diagnostic display. Turning power OFF cancels startup/loading and darkens the screen; another power-up starts the sequence again.

Use the existing disk drive as part of the program-loading presentation where supported by the original design. Keep any drive activity, delay and sound consistent with the loading state. Do not invent a complex typing interface or a new disk-handling mechanic as part of this task.

## Diagnostic display

The Cub screen displays status information that helps a player diagnose actual machine problems. Use the existing BBC display style, but bind the contents to current Encabulator state rather than replaying unrelated VX3 clue pages. Useful information could include supply availability, isolated cabinets, subsystem readiness and fault codes identifying missing or failed components. Final pages and wording should follow the actual machine wiring and diagnostic identities when this prompt is executed.

Keep computer power separate from the machine's main operating state so a stopped or isolated machine can still be diagnosed where the chosen terminal supply permits. Explicitly define the terminal's supply, connection availability and behaviour when the diagnostic link is unavailable. A disconnected or unpowered machine should not make the terminal claim that everything is healthy. The terminal observes the machine; do not silently give it reset or remote-control abilities beyond this diagnostic brief.

## Verification

Check reuse of all four established assets, placement and walk clearance, ribbon-cable endpoints, initial OFF state, startup beep ordering, loading interruption and restart, and useful live diagnostic changes during startup, isolation and a representative missing/failed component. Verify that the physical screen is readable at the desk and that controls work through the shared input scheme. Cover meaningful startup and diagnostic state relationships with tests. Record sound provenance and run repository-required checks before any requested commit.

## Return path

Leave completion notes in `doc/reports/bbc-micro-diagnostic-terminal.md` for the owner and next reviewing agent. Create the destination if missing, preserve existing feedback and append a dated entry on subsequent runs. Record reused source assets, cabinet/interface and supply choices, placement, startup timing, diagnostic meanings, sound credits, gallery additions, validation results, limitations and unresolved questions or blockers. Link the cabinet-back and Level 0 wiring reports where relevant. A final chat response alone is not the return path.
