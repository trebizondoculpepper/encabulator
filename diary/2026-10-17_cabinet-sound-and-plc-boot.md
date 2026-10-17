# Cabinet sound and Automation Control self-test — 2026-10-17

The owner asked for persistent machine sounds to come from inside the MCC buckets, rise by 9 dB when their doors open, and begin only after a booting cabinet's control system is ready. The Automation Control cabinet is the main story case. Its old PanelView boot used the same long computer diagnostics as the CRTs, so it now shows a 3.5-second PLC-5 self-test with memory, I/O and processor-ready messages.

Each bucket loop is positioned at the middle of its cabinet depth. A door's state raises the corresponding loop gain by `10^(4/20)` while open, with gain smoothing and no loop restart. The Encabulator Control fan waits for its CRT boot; the Automation Control fan waits for the PLC self-test; and the VFD fan and drive train motor wait for the VFD control boot. Pump and blower tones follow the mains as before. The drive train tone now comes from inside the drive bay. `createScreenBoot` exposes a reactive `ready` state so the sound follows the same boot clock as the screen and resets on power loss.

The two CONTROL INTERFACE rack units inside Automation Control now each have one rectangular status lens. It flashes amber during self-test, glows steady green once the controller is ready, and flashes red on a backplane or withdrawn-unit fault. The lenses sit behind the cabinet viewing window. The open-door sound level remains as before; closing a door now lowers its machine noise by 9 dB.

Verification: the focused MCC test covers both lamps' off, startup, running and fault states. Listening in a browser remains the useful check for the perceived 9 dB change and the handoff from self-test to fan run-up.

## Screen-ready beeps

The owner also asked for microprocessor beeps at the instant each screen reaches steady state. Every booting MCC screen now gives a short, spatial beep from its display, with a distinct pitch in a rising chromatic sequence. The beep follows the screen's `ready` transition, so it sounds once per boot and again if the power is cycled. The Automation Control self-test sounds first; the CRTs and drive displays sound as their longer boots finish. A test verifies the timing, unique pitches, absence of repeats while steady, and replay after power cycling.

## Independent display testing in dev0

The owner asked to power each screen independently in dev0 and move the operator terminal and drive keypad to the Cabinet Fittings board. The cabinet board is wider and now holds those two beside the CRT. Each of its three screens has a green illuminated push-on/push-off POWER button, its own screen boot and its own ready beep. The operator terminal uses the short PLC self-test; the CRT and drive HIM use the longer display boot. The message display on the separate Displays board has its own POWER button and DATALINE boot. The digital RPM panel meter left on the Displays board now has a direct TEST RPM knob, since its former drive model moved with the keypad. The board's floor collision footprint grew with its width. A gallery test confirms that the terminal and keypad moved, and that each cabinet screen can be booted without starting the other two. Typecheck, lint, formatting, all 417 tests and build passed.

## CRT lower margin and speaker cue

The owner found the bottom of the PANENDERMIC SEMIBOLOID trend animation clipped and asked for a less polished boot beep, using the BBC Micro boot cue in the neighbouring VX3 project as a timbral reference. The trend plot now ends 38 pixels above the 240-pixel tube bottom, and the PV/SP readout sits 13 pixels above it. A canvas test checks the lower drawing bounds. The VX3 reference asset has strong harmonics and a coarse speaker quality; the screen-ready cue is now one 160 ms sawtooth note at a lower fundamental, with distinct pitches per screen and no melodic sequence or tail. The original recording was not copied into this project.
