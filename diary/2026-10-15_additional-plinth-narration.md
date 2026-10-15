# Additional plinth narration

Copied `TX02_MIC009_20261018_035303_orig.wav` from `/Volumes/NO NAME 1/` into ignored local `tmp/audio/` without changing the volume. SHA-256 matched between source and copy. The recording is mono 48 kHz PCM float and 160.14 seconds long.

Word-timestamp transcription and silence boundaries were reconciled with the project's looking-lines teleprompter: 14 scripted lines (five sphere, four helix, five rhombus) and two improvised sphere lines. Cut them individually into `resources/sound/narrations/rhombus_room/additional/`; `clips.csv` records source times, names and transcripts. Browser MP3s are clips 34–49, processed at 44.1 kHz mono, 96 kb/s, 80 Hz high-pass and approximately -16 LUFS. The new lines rotate into each shape's lingering narration in dev5.

The five project checks passed: typecheck, lint, format check, 199 tests and build. Spot checks of rendered clips matched their intended lines. The working WAV cuts and copied source remain local assets; the browser MP3s are tracked for deployment.

After listening, the owner heard the end of “helix” clipped in looking line 39. The old cut ended at 74.84 seconds while the word lasts to about 74.98; extended the source cut to 75.45 seconds and moved the fade after the word, then regenerated the browser MP3 and corrected the manifest.

The owner then heard “lives” clipped in helix line 40. The old cut ended at 84.04 seconds while the word lasts to about 84.16. An initial correction added room tone across every new clip and was pushed; the owner rejected that approach. The corrective cut restores all original tight starts and all unaffected endings. Only clips 35, 36, 38, 40, 41, 42, 45, 46, 48 and 49 have their ends extended enough to put the fade after the final word. The unchanged MP3s were verified byte-for-byte against the earlier commit.
