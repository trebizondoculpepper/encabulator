# Level 0: the machine sandbox

Added `?room=level0` as an independent, non-narrative version of Level 2. It begins with the same shared Guildford warehouse, machine placement, starting view and stack of chairs. The warehouse and MCC models remain shared components, but the room has its own world instance, placement values and wiring factory, ready for the owner's next wiring instructions.

The incoming isolator, main disconnect, oil pump and hydrocoptic pump start off. The machine uses the components' ordinary power connections, without Level 2's scenario feed gates, tasks, narrated prompts, jingle, captions, automatic failures, chair-to-skip swap or ending. Mechanical sounds and boot displays remain. Doors and controls are usable with the shared input scheme; cards can be removed once the Automation cabinet isolator is opened and can be carried and dropped. The sandbox does not import the Level 2 narration or scenario controller.

Registered the standalone room route, title and colour alongside Level 2. Tests cover route resolution, direct pump operation without lesson gates or automatic faults, and isolation of state between room instances. The pending flat-grip redesign, twenty-second pause before Funeral Blues and local stack-light work are included in this session's commit.

Verified the room in the browser with no console errors. All five pre-commit checks pass: typecheck, lint, formatting, 551 tests in 75 files, and production build. Level 0 builds as a separate room chunk and imports no narration player or mission state machine.

Planned the next wiring pass with the owner and saved separate implementation and independent-review prompts in `doc/prompts/`. They cover meaningful inputs on every functional front-panel unit (including a Phase Reference control driving its live LCD trace), internal component dependencies, local and global feedback, unconditional powered Automation RESET, per-unit reset/start policy, and one random component failure at a time after several minutes of operation. Isolation must stop electrical discharge and let smoke disperse; healthy replacement and the applicable reset/start process restore service. Only planning documents were authored in this session.

Added a planned Dimensionality LCD mode, progressing through 1D, 2D, 3D, 4D and higher-dimensional projections as modeled startup readiness increases. Both prompts require the progression to remain visible after display boot, reflect partial startup and faults, and use live calculated graphics. Corrected the prompt directory to `doc/prompts/` following the owner’s clarification.

Added a standing repository rule requiring explicit durable return paths in task, implementation and review prompts. The Level 0 prompts now direct implementation feedback to `doc/reports/level0-wiring-implementation.md` and independent review feedback to `doc/reports/level0-wiring-review.md`, with dated updates, preserved comments and links between the two handoffs.

Added the owner’s requirement that all buttons and displays have readable physical labels to both Level 0 prompts. Implementation must cover existing and new parts, including accessible interiors; review must check coverage, accuracy, legibility and that labels do not obstruct interaction.

Updated the Level 0 planning prompts to retain the chair-to-skip swap: the first successful removal of any installed circuit board spawns the skip once, without narration or camera intervention. Review must check trigger exclusions, persistence and shared disposal interactions. This supersedes the earlier planning exclusion of that swap; it has not yet changed the sandbox implementation.
