# Rhombus room narration

`clip_01.wav` through `clip_31.wav` follow the spoken clip numbers and the master script in `doc/script/plinth-story.md`, regardless of recording order. They were cut from the untouched source copied to `tmp/audio/TX02_MIC007_20261018_021939_edit.wav`. The spoken slates are excluded, and the last complete retake was used for clips 1, 7, 12 and 25. The clips are mono 48 kHz floating-point WAV with short edge fades; they have not yet been levelled or compressed for game playback.

`clips.csv` gives each clip's source times and script filename. The lines for 26 and 31 match the master script, but no spoken slate was audible in the original at those points; their numbers are assigned by content. Review the cuts before promoting selected takes into `src/audio/assets/`.
