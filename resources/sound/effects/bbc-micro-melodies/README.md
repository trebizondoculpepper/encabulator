# BBC Micro selected cues

The selected set is **four resynthesized cues with light mono case resonance**: `fanfare-resynth`, `beware-resynth`, `discordant-resynth` and `down-and-up-resynth`. Each is retained only as a 48 kHz / 160 kb/s mono MP3. Temporary WAVs are deleted after encoding. Cleaned recordings, dry audition variants and the comparison reel were removed at the owner’s request. The generator now produces only the selected set.

Reference: [BBC Micro — Sound Chip](https://www.youtube.com/watch?v=KgPFSxlXM6o), uploaded by Fizgog, 3 February 2023. The uploader describes direct SN76489 playback and identifies the effects as Pitfall sounds. The original `source.webm` and metadata remain a local provenance archive, outside production assets. Rendered intermediates have been removed.

| Cue                | Source phrase | Selected file             |
| ------------------ | ------------- | ------------------------- |
| Fanfare            | 3.80–4.82 s   | `fanfare-resynth.mp3`     |
| Beware             | 4.82–7.65 s   | `beware-resynth.mp3`      |
| Weird / discordant | 7.65–9.85 s   | `discordant-resynth.mp3`  |
| Down and up        | 9.85–11.03 s  | `down-and-up-resynth.mp3` |

[Spectrum inspection](fanfare-spectrum.png) establishes the fanfare’s onset at 3.80 s: approximately 445, 592 and 759 Hz, followed by 880 Hz. Its earlier noisy lead-in is excluded. `scores.json` contains the editable approximate transcriptions. No recording samples are used in the selected cues. The synthesized square waves use integer SN76489 dividers for a 4 MHz clock, band-limited odd harmonics, short attacks/releases and restrained speaker filtering. They are approximations, not recovered BBC register data or a full chip emulator.

The mono case response combines damped modes near 225, 385, 650 and 1120 Hz with short 2.7–52 ms reflections and a 160 ms maximum response length. Its **wet contribution is 80% of the earlier cleaned-reference case effect**, as requested for a slightly lighter sound. The dry signal remains at unity before final levelling. This is an original enclosure approximation, not a measured BBC Micro impulse response. All outputs remain single-channel mono.

Rebuild without downloading the source: `uv run --no-project --with numpy --with scipy python prepare.py`. FFmpeg with `libmp3lame` supplies the MP3 outputs. `manifest.json` records the selected variant, durations and case settings. The local listening page is `/resources/sound/effects/bbc-micro-melodies/audition.html`; it contains only the selected versions.

The fanfare is also prepared as `src/toolkit/components/sound/audio/assets/bbc-fanfare.mp3` for Level0. The machine exposes the **exact green-tier result** used to draw its tri-state/stack light, and the BBC observes that same signal. On transition to green, it plays once from the computer if its power switch is on. No fanfare is queued while the BBC is off, and switching the BBC on after green does not retrospectively celebrate. One second continuously out of green re-arms it, preventing brief readiness flickers from spamming the cue. BBC power-off, lost green indication, room suspension and disposal stop playback; resuming or replacing comparison geometry never replays an old fanfare. The boot beep and internal Link Controller’s connection beep remain separate. Level2’s narrative adapter does not supply this cue.

Provenance: recording/upload credited to Fizgog; underlying effects identified by that uploader as Pitfall. No reuse licence is stated in the metadata. Synthesis and the case response are original project code; the referenced melodies retain their source provenance. See `CREDITS.md`. Hardware reference: [Texas Instruments SN76489AN data sheet](https://map.grauw.nl/resources/sound/texas_instruments_sn76489an.pdf). Original WebM SHA-256: `4cd4f932c26c302b147f05ef3809fc3f1b967bc7c1de3987028a713e49ec05fe`.
