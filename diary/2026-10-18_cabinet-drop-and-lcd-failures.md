# Cabinet drops and LCD failures

Circuit boards released inside the Level 2 MCC cabinet now leave its footprint with a forward velocity and settle on the floor in front. The room supplies a cabinet-specific release correction to the shared object handling code; drops elsewhere retain their previous path. Tests cover both cases.

The door displays are treated as shallow LCDs. During KAPUT they fail differently: a buffer of changing hex-like gibberish replacing all readings, a frozen image with animated vertical bands, a stuck image with pixel faults, and a failing backlight. The banded panel holds its captured image past the main breaker trip, then fades. The scenario text now describes the visible sequence. View tests check that the bands move while the underlying vector image stops updating, and that gibberish replaces the normal trend screen.

Typecheck, focused tests, the full test suite, and build passed during this session. The workspace also contained a concurrent, uncommitted toolkit refactor; these changes were left uncommitted to avoid mixing work.

KAPUT discharge origins were moved to the upper corner of the drive LCD, the lower corner of its keypad, and the upper corner of the Automation Control terminal. Spark scale was reduced so the flashes read as local contact faults instead of lighting the middle of a cabinet panel. Typecheck, lint, format check, all 538 tests, and build passed after the placement change.

Automation Control's two rack status indicators now use the machine failure signal as a fault input. They flash red throughout any powered failure, including KAPUT, and go dark when the main breaker removes power. A regression test covers the red/off transition; typecheck, lint, format check, all 539 tests, and build passed.
