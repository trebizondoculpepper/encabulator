# Sound resource library

This is the working library for recordings and music before they are selected and prepared for the game. Raw WAVs here are ignored by Git because the recordings are large; keep a separate backup. The game's small, ready-to-play effects remain in `src/audio/assets/` and are imported by the code there.

- `effects/`: source recordings and candidate sound effects.
- `narrations/`: voice recordings and separated takes. Keep each recording in its own named folder with a `clips.csv` time manifest.
- `bgm/`: source music and candidate background tracks.

When a clip is chosen for the game, make a trimmed, levelled delivery copy in `src/audio/assets/`, import that copy from `src/audio/`, and record the author, source URL, licence and edits in `CREDITS.md`. Technical processing notes for delivery assets belong in `src/audio/assets/README.md`.
