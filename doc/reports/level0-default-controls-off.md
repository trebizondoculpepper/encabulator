# Level 0 starts with its machine controls off: report

Completion notes for `doc/prompts/level0-default-controls-off.md`, for the owner and the next reviewing agent. The plan is `doc/plans/level0-default-controls-off.md`. Related: the Level 0 wiring report `doc/reports/level0-wiring-implementation.md` and inventory `doc/design/level0-wiring.md`. The phase-selector prompt (`doc/prompts/phase-selector-voltage-feedback.md`) has no report yet; see the coordination note below.

## 2026-10-18, first run

### What changed

The initial state is set once, when a Level 0 machine is made (`src/rendering/level0-machine.ts`) and in the model's input defaults (`src/game/level0-plant.ts`); nothing forces controls back each frame, so a retained room keeps the player's settings (rooms are kept alive by `src/main.ts`). Shared components keep their own defaults, so Level 2, dev6 and the galleries are unchanged (their tests pass unchanged).

### Switch and selector inventory

| Control                                                                                                                      | Was                                   | Now                          | OFF meaning                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incoming supply isolator                                                                                                     | OFF                                   | OFF                          | No supply                                                                                                                                          |
| MAIN DISCONNECT handle                                                                                                       | OFF                                   | OFF                          | Line-up bus dead                                                                                                                                   |
| Kirk key (MAIN DISCONNECT)                                                                                                   | IN                                    | OUT                          | The disconnect cannot be closed until the key is turned in (exception for review, below)                                                           |
| Every unit's breaker: flange handles (M-101, M-102, M-103, DRIVE ISOLATOR), rockers (section 3), isolators inside (the rest) | ON, except lube and hydrocoptic pumps | OFF                          | Unit isolated                                                                                                                                      |
| MAIN INCOMING's breaker, behind its screwed cover                                                                            | ON                                    | ON                           | Not an operator control: protection, never operated; open, its meters could never read                                                             |
| MAIN DRIVE MOTOR, COOLING FAN, AUXILIARY MOTOR run command                                                                   | running when powered                  | stopped                      | Each waits for its START                                                                                                                           |
| FEED MOTOR HAND OFF AUTO                                                                                                     | AUTO                                  | OFF                          | Stopped                                                                                                                                            |
| HYDRAULIC PUMP key                                                                                                           | LOCAL / REMOTE, at REMOTE             | LOCAL / OFF / REMOTE, at OFF | New position: the pump does not run                                                                                                                |
| MAIN INCOMING AMMETER PHASE                                                                                                  | L1 / L2 / L3, at L2                   | OFF / L1 / L2 / L3, at OFF   | New position: the ammeter is disconnected and the power monitor's amps read 0; a four-position cam selector, as real ammeter selector switches are |
| MODIAL INTERACTION CHART DRIVE                                                                                               | RUN                                   | STOP                         | The chart does not advance                                                                                                                         |
| PANENDERMIC FAN LOW OFF HIGH, BOOST                                                                                          | OFF, released                         | unchanged                    | —                                                                                                                                                  |
| DINGLE ARM                                                                                                                   | OFF                                   | unchanged                    | —                                                                                                                                                  |
| VFD-601 SPEED, AUXILIARY DRIVE SPEED                                                                                         | 6, 5                                  | 0                            | Zero speed reference                                                                                                                               |
| VFD-601 run command                                                                                                          | stopped                               | unchanged                    | —                                                                                                                                                  |
| Emergency stops, overloads, fuses, terminals, cards                                                                          | healthy, released                     | unchanged                    | OFF is not tripped, failed or stopped                                                                                                              |
| Momentary buttons                                                                                                            | released                              | unchanged                    | —                                                                                                                                                  |

Exceptions for the owner's review, left without an OFF: the ENCABULATOR CONTROL DISPLAY selector (it chooses the picture, TREND or DIMENSIONALITY; it starts at TREND); PHASE TRIM (an adjustment, left centred at 0°); the drive keypad's LOCAL/REMOTE (a command source, left at LOCAL; the drive itself starts stopped). The Kirk key starting OUT is a judgement: it makes turning it in part of powering up, and its caption says so; if the owner prefers it in, it is one default in `level0-plant.ts`.

Coordination with the phase-selector prompt: Level 0's MAIN INCOMING selector is wired as an ammeter selector (choosing the phase whose current the power monitor shows), and the three voltmeters are permanent, phase to phase. The phase-selector task should keep OFF as the disconnected ammeter, or revisit it if it rewires the selector to voltage.

### Startup walkthrough (tested)

A fresh room is silent and unpowered: the supply off, the PLC off, no load, every unit stopped, nothing faulted. Turning the isolator on supplies only MAIN INCOMING (its voltmeters and the station battery); the main disconnect's handle refuses while the Kirk key is out, and closes once it is turned in, making the bus live; every unit still waits: Automation Control boots only once its isolator inside is closed, then runs; the lube oil pump runs when its rocker closes and builds pressure; MAIN DRIVE MOTOR, with power and oil, waits for START, then runs; the hydraulic pump does nothing with its key at OFF and runs at LOCAL; the ammeter reads nothing until a phase is selected. Boot sequences, interlocks, reset behaviour and the lamp test are as before.

### Validation

- `src/rendering/level0-machine.test.ts`: a fresh room's every breaker, selector, knob and stop; the manual power-up above; the existing Level 0 tests now power the machine up by hand (13 tests). `src/scene/retro-encabulator-mcc.test.ts`: the Level 0 pump test turns the Kirk key in first; Level 2 and dev6 tests unchanged.
- Browser (headless Chrome against the dev server): a fresh room with only the isolator on showed MAIN INCOMING's voltmeters live, everything else dark with its handles and rockers off, the ammeter selector at OFF with its OFF L1 L2 L3 legend.
- Typecheck, lint, format check, all tests and build pass (see the commit).

### Limitations and open questions

- The exceptions and the Kirk key above await the owner's review.
- A retained room keeps its settings because nothing resets them; there is no separate save of the machine's state.
