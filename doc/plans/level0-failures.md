# Plan: Level 0 failures, and the strangeness that comes before them

Agreed with the owner on 18 October 2026: modelled failures, each approached by a measurable strain, and the effects of dev1 (colour channels, π drift, warp) and dev2 (ghosting, geometric patterns, apparitions) building with that strain; at breakdown every effect stops at once and normality ensues. A new row of fault switches on the Hyperplasc Scenario Simulator sets each failure going, starting with lube starvation. Progress and results go in `doc/reports/level0-failures.md`.

## First failure: lube starvation

- The lube oil system gains a reservoir (`lube.level`) and two faults the simulator can set: a leak, which drains it over about a minute, and a stuck low-pressure switch, which keeps reporting healthy pressure whatever the real pressure, so the interlocks no longer protect the motors. Real pressure sags as the reservoir empties.
- The main drive motor (M-101) and the main drive's motor build bearing wear while they run without full lubrication, faster the lower the pressure. Wear is permanent until repaired.
- Wear shows: a grinding note and rising current (amber from 30 %), a hot bearing (red from 70 %), and at 100 % the bearing seizes: a bang, sparks and smoke at the motor's bucket, its overload trips and the main breaker trips (flashing red). That is the breakdown.
- Repair, for now: the simulator's RESET refills the oil, frees the switch and replaces the worn bearings. A player-facing repair (topping up, replacing the switch and motor) can follow.

## Strain and strangeness

- The model's `strain` (0 to 1) is the worst of each failure's own approach to breakdown: for lube starvation, the worst bearing wear. `brokenDown` is set when a failure completes.
- `src/game/level0-strangeness.ts` (pure, tested) turns strain into effect levels: faint ghosting and colour fringes from 0.15, geometric patterns from 0.35, apparitions from 0.5, warp and π drift from 0.65, all strongest near 1. Broken down, everything is zero at once. Reduced motion keeps the warp off, as dev1 does.
- `src/rendering/level0-strangeness.ts` drives the shared material uniforms (channels, warp, π) and dev2's ghost and pattern overlays and apparitions, around the room's render; it puts the shared uniforms back when the room is left.

## The simulator

- A second row on the TESTING SCENARIOS panel, FAULTS, of studio switches: LUBE STARVATION now; the others (cooking the drive, phase failure, dimensional shear, over-boost, dead-heading, a hot control section) as they are built.

## Verification

Model tests for the reservoir, the stuck switch, wear rates, the grinding, hot and seized stages, strain and breakdown, and RESET; strangeness tests for each threshold and the instant stop at breakdown; machine tests for the seizure's trips; a browser look at the effects building and stopping; the five checks.
