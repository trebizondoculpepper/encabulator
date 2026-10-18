# Level2 playability after shared machine changes

Checked that Level2 still uses its own narrative MCC options, rather than Level0’s process model, random-failure scheduler or new full-operation readiness gate. The room loads in Chrome with its module title and powered-off machine. The existing startup, normal-operation, final-action, cue-recording, room-plan and shared MCC suites passed (47 tests before adding regression coverage).

Found an existing ending conflict: a second completion branch advanced phase 12 at the first quiet frame after the farewell, bypassing the 20-second pause and preventing the funeral recital. Replaced the competing branches with one tested closing controller: farewell, twenty seconds of uninterrupted silence, recital, then completion once the recital ends.

Added a real-machine regression for the isolator and main disconnect, all ten narrative control registrations, the five removable automation cards, Automation Control’s unchanged door identity, cabinet isolation and removal, RESET recovery with those cards removed, and the final main-breaker trip. This complements the pure narrative-state tests; the full voice performance was not played through manually in the browser.

Final validation: all five required checks passed, including all 703 tests across 93 files.
