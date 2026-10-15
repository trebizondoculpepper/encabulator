# Narration: from script to game audio

How the narrator's lines get from the owner's improvisation into the game. Written so the work can be resumed in a later session. The plinth room (dev5) is the first scene done this way.

## The files

- `plinth-story.md` is the **master script**: every clip with its number, file name, the moment it plays and its line, plus the narrator's feeling for each shape and the triggers the room must detect. It is the source of truth; edit lines here.
- `plinth-teleprompter.md` is the **teleprompter script**, made from the master by `python3 doc/script/make-teleprompter.py`: the lines alone, grouped by shape so the owner stays in one mood at a time (sphere, rhombus, helix, then the moves between shapes, the dark and the exit), each headed by its spoken slate. It is regenerated after any change to the master (a new clip must also be placed in the script's `GROUPS`), never edited by hand: its wording must match the master's. The clip numbers are the master's, so the order of performance does not matter.

## 1. Writing the script

The owner improvises lines aloud; Claude breaks them into clips by content, gives each a moment (first visit, coming back, staying, walking away, from one shape to another, in the dark, the exit) and adds them to the master. Moments Claude guessed are marked _(guess)_; light tidies for performance are marked _(tidied: …)_ with what was said. Gaps are prompted one at a time. Walking-away moments get several short versions so return visits do not repeat.

## 2. Recording

The owner reads `plinth-teleprompter.md` into a good microphone in **one long recording**, improvising freely. For each clip:

1. Say the slate aloud: "Clip twelve."
2. Pause about two seconds.
3. Perform the line.
4. Pause about two seconds.

To retake, say "Clip twelve, again" and perform it again; the **last take of a clip counts**. Record as WAV or FLAC, mono or stereo, 44.1 or 48 kHz.

## 3. Splitting (Claude)

Given the one long file:

1. Keep the original untouched in the owner's chosen location (not in the repo; it is large).
2. Transcribe it with word timestamps: `mlx-whisper` (installed, Apple Silicon) or `whisper` (`~/.local/bin/whisper`), e.g. `mlx_whisper recording.wav --word-timestamps True --output-format json`.
3. Find every slate ("clip <number>", "clip <number>, again") in the transcript. A clip runs from the end of its slate to the start of the next slate; where a clip has several takes, use the last.
4. Tighten each cut to the silences either side with `ffmpeg` (`silencedetect`), so no slate words and no dead air remain; keep about 150 ms of room tone at each end, with short fades.
5. Normalise each clip's loudness consistently (`ffmpeg -af loudnorm`, about -16 LUFS for dialogue) and remove the low rumble (`highpass=f=80`).
6. Export browser-ready copies to `src/audio/assets/narration/plinths/`. The current deliveries are numbered `clip_01.mp3` through `clip_31.mp3`, mono 44.1 kHz at 96 kb/s for browser compatibility. `resources/sound/narrations/rhombus_room/clips.csv` maps the numbers to the master's filenames and source times.
7. Compare each clip's transcript with its line in the master; report clips missing from the recording, and improvisations that changed a line's meaning or moment, rather than silently reassigning them.
8. Record the narration in `CREDITS.md` (performer, date recorded, licence as the owner says).

## 4. Wiring it in

The room dispatches `plinth-arrival` (with the plinth, the previous one, every one before and the visit count). `src/game/plinth-narration.ts` selects lines for arrival, leaving a plinth, lingering, being in the dark and approaching the far east exit. `src/audio/plinth-narration.ts` plays them after a user gesture, rotates variants, pauses when the room is hidden, and lets a more immediate moment interrupt a lesser one. The east exit leads to the Hall; the original west portals remain.
