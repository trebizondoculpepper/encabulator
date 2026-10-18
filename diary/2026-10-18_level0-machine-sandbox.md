# Level 0: the machine sandbox

Added `?room=level0` as an independent, non-narrative version of Level 2. It begins with the same shared Guildford warehouse, machine placement, starting view and stack of chairs. The warehouse and MCC models remain shared components, but the room has its own world instance, placement values and wiring factory, ready for the owner's next wiring instructions.

The incoming isolator, main disconnect, oil pump and hydrocoptic pump start off. The machine uses the components' ordinary power connections, without Level 2's scenario feed gates, tasks, narrated prompts, jingle, captions, automatic failures, chair-to-skip swap or ending. Mechanical sounds and boot displays remain. Doors and controls are usable with the shared input scheme; cards can be removed once the Automation cabinet isolator is opened and can be carried and dropped. The sandbox does not import the Level 2 narration or scenario controller.

Registered the standalone room route, title and colour alongside Level 2. Tests cover route resolution, direct pump operation without lesson gates or automatic faults, and isolation of state between room instances. The pending flat-grip redesign, twenty-second pause before Funeral Blues and local stack-light work are included in this session's commit.

Verified the room in the browser with no console errors. All five pre-commit checks pass: typecheck, lint, formatting, 551 tests in 75 files, and production build. Level 0 builds as a separate room chunk and imports no narration player or mission state machine.
