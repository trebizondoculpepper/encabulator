# BBC Micro: Neumann Link™ diagnostics and startup guidance

Implementation authorized by the owner on 18 October 2026. The final cabinet-board revision below supersedes the earlier external fourth-pilot proposal. This develops the [original terminal prompt](bbc-micro-diagnostic-terminal.md) now that the workstation and [cabinet backs](../reports/encabulator-cabinet-backs.md) exist. The intended experience is a useful period diagnostic computer that helps a player work out how to bring the Encabulator to a steady state by operating its real controls.

## Agreed direction

The BBC Micro receives diagnostic information through the annunciator. Its purpose is to provide clues: what is unpowered, what has failed, and what action the player should try next. It observes the machine and never operates controls, resets faults, replaces components or advances a narrative itself. Every diagnosis and hint must follow actual machine state, not elapsed time or a canned sequence that assumes the player followed instructions.

Keep BBC power independent of machine power. Both BBC and Cub retain their existing continuous power leads to the floor-bolted power box. Clicking the BBC case/keyboard operates the existing power component, with the same startup beep, black OFF screen and curved Mode 7 display. The shared chair and C/V standing-height behaviour remain. Do not add typing, extra keys, HTML diagnostic panels or a new control scheme.

The physical machine data cable has now been explicitly authorized and implemented: BBC rear RS423 connector, down behind the desk, under a rubber floor cable protector, and through the labelled low round DATA entry at the back of section 1. The protector is raised 1 mm above the floor to avoid flicker. Reuse this route and its actual socket/entry anchors; do not add another cable or a speculative front annunciator socket. The Cub-to-BBC video and both mains leads remain separate. The physical dressing is reused by the diagnostic session.

## Terminal and link states

| BBC                   | Annunciator       | Screen and activity                                                                                                                                                     |
| --------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Off                   | Either state      | Black screen; drive idle; no diagnostic sound                                                                                                                           |
| Booting               | Either state      | Existing BBC ROM startup and beep, then `>CHAIN "DIAG"`; no invented remote readings during startup                                                                     |
| On, program ready     | Off / unavailable | Clearly show `NOT CONNECTED`, identifying the annunciator as the unavailable link. Do not display stale readings as live or claim that the machine is healthy           |
| On, program ready     | Comes online      | A bounded handshake and one short disk-read sequence: drive activity/LED and a mechanical drive sound, followed by the diagnostic page and flashing Link Controller LED |
| On, connected         | Remains online    | Live fault/status information and the next useful startup action; no repeated loading sound for every meter update                                                      |
| On, connected/loading | Loses power/link  | Cancel any pending read/sound, show `NOT CONNECTED`; do not keep a success indication or spin the drive indefinitely                                                    |
| On, disconnected      | Link restored     | Read again once, then return to current diagnostics without replaying the BBC power-on beep                                                                             |

If the annunciator is already online when the BBC starts, finish the normal computer boot before the initial diagnostic read; avoid a double read/beep. Powering the BBC off cancels every pending boot/read activity, and another power-on starts cleanly. Hiding/suspending a room must not leave sounds playing or replay an old read on resume. Define a bounded, consistent read duration rather than random loading delays.

Use `CHAIN "DIAG"`, without a leading asterisk, for a BASIC diagnostic program: the [BBC Micro User Guide](https://www.bbcmicrobot.com/docs/BBC_User_Guide.pdf), CHAIN entry and loading section, distinguishes BASIC CHAIN from machine-code `*RUN`. Keep filenames within DFS conventions. No full emulator is required.

## What “annunciator online” means

Derive availability from the supply that actually drives the annunciator, including its station-battery/incoming-side arrangement. Inspect the current scene adapter: The prior Level0 panel observed `mcc.supply`; the revised cabinet retains that incoming-side supply, then passes it through its own isolator, fuse, terminal and diagnostic boards (`mcc.diagnosticEndpoint`), independently of the main machine disconnect. Do not gate the diagnostic link on the machine reaching RUN or on the main disconnect if the real annunciator is already powered; that would hide the very startup faults this terminal is meant to explain. Conversely, a TEST button illuminating lamps is not proof of a working diagnostic link.

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

## Internal Neumann Link™ boards — owner revision, 18 October 2026

Remove the proposed external fourth lamp. Centre the alarm-window grid over the original TEST, ACK and RESET controls, preserving their actions. Inside the annunciator cabinet fit a fixed diagnostic motherboard with two separate daughterboards: **Neumann Link Controller** and **Neumann Diagnostics**, together with the cabinet’s internal isolator. Use the existing internal breaker rather than a second duplicate isolation control. Label the boards and isolator clearly.

The Link Controller flashes green while a diagnostic session is established, and beeps once when a new session is established. Its small board LED is passive. This replaces the external steady pilot, retaining the same handshake rule: BBC powered, application ready, endpoint online and first valid diagnostic response received. Boot, handshake, read and disconnected states do not flash the LED. Neither a lamp test nor BBC power alone proves availability.

The annunciator’s station-battery/incoming supply remains independent of the main disconnect; its internal isolator, control fuse, terminal and both connected, healthy diagnostic boards now also have to pass power/data for the endpoint to work. Isolating the annunciator or disconnecting/failing either diagnostic board immediately drops the session. Restoring it requires a new handshake/read and one new controller beep. Turning off the BBC extinguishes the connection LED immediately. Other machine cabinets may remain isolated while diagnostics work.

Neumann Link™ is the company’s exciting proprietary monitoring technology introduced in the 1980s. Put that flavour in the program header and board legends without adding modern network UI. The motherboard remains firmly installed. Physical card servicing is represented by each card’s own connection state; do not silently change the existing Automation Control’s separate five-card assembly or its narrative identities.

## Architecture, sound and verification

Keep the reusable BBC boot/link/loading state machine in toolkit logic without DOM or Three.js. Accept a small read-only diagnostic/link interface; machine-specific diagnosis and startup priorities belong in game logic. Shared views draw the state, parts own the power/use/positional sounds, and rooms only bind the components. Avoid one copy of the fault rules in the PanelView and a conflicting second copy in the BBC. Use the actual component/fault identities already present.

Use or create a restrained mechanical 5¼-inch drive-read sound. It must be distinct from the system beep, located at the floppy drive and played only for a real read transition. Reuse an appropriately credited asset if available; otherwise original synthesis is acceptable. Credit every new sound in `CREDITS.md` and put technical preparation notes in the shared audio asset README. Keep drive sound and LED timing in step and ensure cancellation works.

Cover the controller LED staying dark during boot/handshake/read, lighting only after a successful session, stopping its flashes immediately on BBC power-off, both power-up orders, link loss during loading, reconnection, repeated healthy updates, computer power cycling, room suspension, missing/failed components, repaired-but-latched faults and progression to steady state. Check that displayed commands and text remain within the 40-column/25-row Mode 7 layout and readable from the chair. Verify the passive board LED cannot operate a control, and that one connection beep comes from the controller. Test that diagnostic advice changes only when the real state warrants it and never changes the machine itself. Run all five repository checks before any requested commit.

## Return path

Leave implementation/review notes in `doc/reports/bbc-micro-annunciator-diagnostics.md` for the owner and the next reviewing agent. Create the file if missing; preserve existing feedback and append dated entries. Include the confirmed handshake/availability rule, exact link-power source, state/transition timings, diagnostic coverage and dependency table, actual scene coverage, sound provenance, gallery changes, verification results, screenshots/viewing instructions, physical-route integration and unresolved limits. Link this prompt, the original terminal prompt and the cabinet-back report. A final chat response alone is not the return path.
