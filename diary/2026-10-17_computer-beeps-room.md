# Computer Beeps listening room — 2026-10-17

The owner wanted a new dev room to audition computer beeps and bloops before choosing a cabinet boot sound. Dev13 follows Dev12 in the room chain and leads onward to Rhombus. It has twelve numbered, individually lit stands around a 14 × 10 m room. Each stand has a speaker grille, a physical PLAY button, a cue name and a short description. `?view=1` through `?view=12` place the listener by each stand, and `devBeeps.cues()` and `devBeeps.play(n)` support development.

`src/audio/computer-cues.ts` names and defines the twelve short candidates: rough buzzes, two PC POST tones, processor ticks, ascending and descending pairs, rounded bloops, a dyad and a three-note chord. The shared part audio can now schedule several oscillator notes in one positional one-shot recipe, including simultaneous notes. These are auditions only; the cabinets retain their current ready cue until the owner chooses. No external recording was copied or added.

Typecheck, lint, format check, all 425 tests and build passed. The local Vite server returned HTTP 200 for `?room=dev13`.

## One listening console

The owner asked to replace the separate stands with a single panel in the middle and to have the selected sound repeat every five seconds. Dev13 now has one freestanding console with twelve small labelled illuminated pushbuttons and a single speaker. Pressing a button plays its cue immediately and lights that button; only that cue repeats every five seconds. Another button changes the selection, and pressing the lit button again stops playback. The selection and timing are pure logic in `src/game/computer-cue-selector.ts`, with a test for switching, repeat timing and stopping.

After this change, typecheck, lint, format check, all 426 tests and build passed.

## PC POST selected for operator terminals

The owner chose PC POST for terminals after boot. The Automation Control operator terminal in dev6 and its independently powered dev0 test version now use the PC POST cue from the listening room at their ready transition. Other screens keep their existing ready sounds. The tests check the exact PC POST recipe on terminal boot and its replay after a power cycle.
