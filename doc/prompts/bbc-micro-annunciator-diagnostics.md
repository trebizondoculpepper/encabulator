# BBC Micro: Neumann Link™ diagnostics and startup guidance

Planning prompt, 18 October 2026. Do not implement this feature merely because this prompt exists: the owner wants to discuss the behaviour first. This develops the [original terminal prompt](bbc-micro-diagnostic-terminal.md) now that the workstation and [cabinet backs](../reports/encabulator-cabinet-backs.md) exist. The intended experience is a useful period diagnostic computer that helps a player work out how to bring the Encabulator to a steady state by operating its real controls.

## Agreed direction

The BBC Micro receives diagnostic information through the annunciator. Its purpose is to provide clues: what is unpowered, what has failed, and what action the player should try next. It observes the machine and never operates controls, resets faults, replaces components or advances a narrative itself. Every diagnosis and hint must follow actual machine state, not elapsed time or a canned sequence that assumes the player followed instructions.

Keep BBC power independent of machine power. Both BBC and Cub retain their existing continuous power leads to the floor-bolted power box. Clicking the BBC case/keyboard operates the existing power component, with the same startup beep, black OFF screen and curved Mode 7 display. The shared chair and C/V standing-height behaviour remain. Do not add typing, extra keys, HTML diagnostic panels or a new control scheme.

The physical machine data cable has now been explicitly authorized and implemented: BBC rear RS423 connector, down behind the desk, under a rubber floor cable protector, and through the labelled low round DATA entry at the back of section 1. The protector is raised 1 mm above the floor to avoid flicker. Reuse this route and its actual socket/entry anchors; do not add another cable or a speculative front annunciator socket. The Cub-to-BBC video and both mains leads remain separate. The physical dressing does not itself implement the diagnostic session; this prompt still defines that future behaviour.

## Terminal and link states

| BBC                   | Annunciator       | Screen and activity                                                                                                                                                |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Off                   | Either state      | Black screen; drive idle; no diagnostic sound                                                                                                                      |
| Booting               | Either state      | Existing BBC ROM startup and beep, then `>CHAIN "DIAG"`; no invented remote readings during startup                                                                |
| On, program ready     | Off / unavailable | Clearly show `NOT CONNECTED`, identifying the annunciator as the unavailable link. Do not display stale readings as live or claim that the machine is healthy      |
| On, program ready     | Comes online      | A bounded handshake and one short disk-read sequence: drive activity/LED and a mechanical drive sound, followed by the diagnostic page and lit NEUMANN LINK™ pilot |
| On, connected         | Remains online    | Live fault/status information and the next useful startup action; no repeated loading sound for every meter update                                                 |
| On, connected/loading | Loses power/link  | Cancel any pending read/sound, show `NOT CONNECTED`; do not keep a success indication or spin the drive indefinitely                                               |
| On, disconnected      | Link restored     | Read again once, then return to current diagnostics without replaying the BBC power-on beep                                                                        |

If the annunciator is already online when the BBC starts, finish the normal computer boot before the initial diagnostic read; avoid a double read/beep. Powering the BBC off cancels every pending boot/read activity, and another power-on starts cleanly. Hiding/suspending a room must not leave sounds playing or replay an old read on resume. Define a bounded, consistent read duration rather than random loading delays.

Use `CHAIN "DIAG"`, without a leading asterisk, for a BASIC diagnostic program: the [BBC Micro User Guide](https://www.bbcmicrobot.com/docs/BBC_User_Guide.pdf), CHAIN entry and loading section, distinguishes BASIC CHAIN from machine-code `*RUN`. Keep filenames within DFS conventions. No full emulator is required.

## What “annunciator online” means

Derive availability from the supply that actually drives the annunciator, including its station-battery/incoming-side arrangement. Inspect the current scene adapter: Level0's annunciator currently observes `mcc.supply`, independently of the main machine disconnect. Do not gate the diagnostic link on the machine reaching RUN or on the main disconnect if the real annunciator is already powered; that would hide the very startup faults this terminal is meant to explain. Conversely, a TEST button illuminating lamps is not proof of a working diagnostic link.

Reuse the existing world graph and component state. The terminal must distinguish “link unavailable” from “link working, machine switched off.” Once the link is available, an off cabinet can be an expected startup condition rather than evidence that a component is broken. Present it as, for example, `<cabinet>: POWER FAULT` followed by a useful check, while reserving `<component>: FAULT DETECTED` for an actual reported failure. Do not invent fault codes, hidden sensors or knowledge of faults that the link cannot observe.

## Useful startup and repair guidance

The initial implementation should make Level0 genuinely usable as an exploratory machine toy. Read `src/game/level0-plant.ts`, `src/rendering/level0-machine.ts`, `src/rendering/level0-wiring.ts`, `src/scene/level0-faces.ts`, and the current wiring documentation. Inventory the existing electrical feeds, cabinet isolators, interlock key, control supplies, motor permissives, PLC/card status and process outputs before choosing the checks. The code may have changed since this prompt was written.

Give one actionable next step, with a short reason and the exact visible cabinet/control label. Keep a compact list of other relevant faults available on the same screen where space allows. Order recommendations by dependencies, not the order controls were created. Illustrative cases to verify against actual wiring:

- Link available, main disconnect off: identify MAIN DISCONNECT; if its POWER INTERLOCK SECURITY key prevents closure, explain that prerequisite before telling the player to throw the handle.
- A required cabinet's supply absent: identify its actual isolation/supply control. Do not tell the player to operate a downstream control that cannot yet respond.
- Automation card absent or failed: report the actual slot/component name and code where available. Guide isolation, repair/reseat and any required RESET in the right order; do not advise removing live cards.
- Oil pressure missing: distinguish a stopped/unpowered pump, a denied permissive and pressure still building. Do not call a healthy spinning pump broken during its ramp.
- Cooling, field supply, drive readiness or phase reference missing: explain the first missing dependency with labels matching the machine.
- A genuinely latched fault after its cause is repaired: say which cabinet's RESET is required. Do not claim a reset fixed a still-present cause.
- A startup or ramp in progress: explain what the machine is waiting for, rather than alternating contradictory instructions every frame.
- All required conditions met: show an explicit steady/nominal state derived from the existing healthy/operating outputs. Do not require every optional subsystem or every selector to be at its maximum.

These are examples of the desired reasoning, not a new wiring specification. Write a diagnostic coverage table during implementation: observed state, displayed diagnosis, recommended action, prerequisite and the condition that clears it. Test recommendations against deliberately incomplete startup sequences and an out-of-order player. The same root cause should not flood the display with a dozen unhelpful downstream failures. Stabilise selection of the leading hint while its cause remains, without hiding a new higher-priority fault.

The Level2 workstation shares equipment but its narrative and scripted failures must remain authoritative. Do not alter its events to satisfy the diagnostic computer. Define an explicit scene adapter and agreed hint coverage there; unavailable observations must remain unavailable. Dev19 should retain a clearly labelled standalone/demo state or a deterministic gallery harness, not import the game's plant into the reusable component.

## Annunciator “Neumann Link™” pilot

In-world, **Neumann Link™** is Neumann Dynamik’s exciting proprietary monitoring technology introduced in the 1980s: a period serial diagnostic link, presented with the company’s earnest confidence in its own invention. Keep that flavour in the diagnostic program’s header and an appropriately small panel legend, without suggesting a modern network or changing the underlying behaviour.

Add a clearly labelled, non-pressable pilot light called `NEUMANN LINK™`, using the same true-size family as adjacent devices. The owner describes it as a fourth light: inspect the actual panel before placing it, and keep TEST, ACK and RESET functional controls rather than treating their button lenses as passive lamps. Do not replace an alarm window or overlap labels/fasteners to fit the new pilot. Its label never takes a click.

The owner clarified the meaning after discussion: this is a **diagnostics available** indication, analogous to a completed serial handshake, rather than a copy of the BBC power switch. It lights only when the BBC is powered, the diagnostic application is ready, the annunciator endpoint is online and a working diagnostic session has been established. It is steady once the first valid diagnostic response is available on the BBC screen. Power alone, an unfinished boot or a successful lamp test is insufficient.

Represent session establishment as a small explicit logical handshake/read sequence; do not build a byte-level serial emulator. Use one derived `diagnosticsAvailable` state for the pilot and the terminal's live-status presentation. The pilot remains dark during boot, handshake, initial read and `NOT CONNECTED`. Once the session is established, routine live updates do not repeatedly extinguish it or replay drive loading. If the machine is simply stopped or some other cabinet is isolated while the annunciator remains online, the pilot stays lit: diagnosing those conditions is its purpose.

Switching the BBC off extinguishes the pilot immediately and invalidates the session. Losing annunciator power or the link also extinguishes it and makes the screen show `NOT CONNECTED`. Reconnection requires a fresh successful handshake/read before the light returns. Never retain a previous successful handshake across power loss or show cached information as a live session. Preserve the lamp's non-pressable behaviour and separate lamp-test presentation from the underlying availability state.

## Architecture, sound and verification

Keep the reusable BBC boot/link/loading state machine in toolkit logic without DOM or Three.js. Accept a small read-only diagnostic/link interface; machine-specific diagnosis and startup priorities belong in game logic. Shared views draw the state, parts own the power/use/positional sounds, and rooms only bind the components. Avoid one copy of the fault rules in the PanelView and a conflicting second copy in the BBC. Use the actual component/fault identities already present.

Use or create a restrained mechanical 5¼-inch drive-read sound. It must be distinct from the system beep, located at the floppy drive and played only for a real read transition. Reuse an appropriately credited asset if available; otherwise original synthesis is acceptable. Credit every new sound in `CREDITS.md` and put technical preparation notes in the shared audio asset README. Keep drive sound and LED timing in step and ensure cancellation works.

Cover the pilot staying dark during boot/handshake/read, lighting only after a successful session, extinguishing immediately on BBC power-off, both power-up orders, link loss during loading, reconnection, repeated healthy updates, computer power cycling, room suspension, missing/failed components, repaired-but-latched faults and progression to steady state. Check that displayed commands and text remain within the 40-column/25-row Mode 7 layout and readable from the chair. Verify the passive pilot cannot operate a control. Test that diagnostic advice changes only when the real state warrants it and never changes the machine itself. Run all five repository checks before any requested commit.

## Return path

Leave implementation/review notes in `doc/reports/bbc-micro-annunciator-diagnostics.md` for the owner and the next reviewing agent. Create the file if missing; preserve existing feedback and append dated entries. Include the confirmed handshake/availability rule, exact link-power source, state/transition timings, diagnostic coverage and dependency table, actual scene coverage, sound provenance, gallery changes, verification results, screenshots/viewing instructions, physical-route integration and unresolved limits. Link this prompt, the original terminal prompt and the cabinet-back report. A final chat response alone is not the return path.
