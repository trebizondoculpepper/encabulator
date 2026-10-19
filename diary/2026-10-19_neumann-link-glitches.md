# Neumann Link false positives

Level 0's status annunciator now occasionally shows a transient amber window where the scanned status and actual module are green. The display-only Neumann Link 1.0 glitch starts after roughly 60–90 seconds of power and recurs after roughly 45–90 seconds, lasts 1.5–3.5 seconds, and needs no ACK. It clears immediately if the real window faults or the annunciator loses power. The scanner, alarms, plant and diagnostic state remain unchanged. Pure tests cover the false colour, its duration, and precedence of real faults and power loss.

The owner also asked where the unfinished repair gameplay is specified. `doc/prompts/level0-wire-machine.md` already covers periodic single failures, isolation, removal, compatible replacement or reseating and follow-on reset or restart; `doc/prompts/level0-check-wiring.md` gives the review procedure. `doc/reports/level0-failures.md` and `doc/reports/level0-wiring-implementation.md` record the deferred player-facing repair and spares bench.

Typecheck, lint and format check passed. The focused false-positive tests passed. A concurrent BBC Micro edit caused its tests to fail during a broader run, so that run was interrupted; it did not touch the link-glitch implementation.
