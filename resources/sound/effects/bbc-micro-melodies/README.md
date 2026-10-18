# BBC Micro melody auditions

Reference: [BBC Micro — Sound Chip](https://www.youtube.com/watch?v=KgPFSxlXM6o), uploaded by Fizgog, 3 February 2023. The description says this is a test writing directly to the SN76489 and includes five Pitfall sound effects. The downloaded audio is 13.526 seconds, 48 kHz stereo Opus. `source.webm`, its metadata and a mono working WAV remain local; the signed playback URLs in the metadata are not versioned.

There are two candidates per requested cue: `*-cleaned` retains the recording with adaptive spectral subtraction, a 90–5200 Hz bandpass, smoothed levelling and short boundary fades; `*-resynth` is an approximate, editable reconstruction from newly generated square-wave oscillators, using integer SN76489 tone divisors for a 4 MHz clock, band-limited odd harmonics and a restrained speaker roll-off. Pitch glides interpolate tone period, preserving the characteristic curved drop. No recording samples appear in the resynthesized versions. This is not a complete chip emulator or a recovery of the original BBC program/register writes.

The fanfare starts much more quietly than its ending, with substantial interfering sound. Its reconstructed opening is uncertain and omits low-confidence material; use the cleaned reference to judge it. The other reconstructions are also auditions, not claimed note-perfect transcriptions. The deliberately rough modulation in BEWARE is retained as part of the effect.

Your timestamps were treated as approximate. Cuts finish in the gaps so the last notes are not clipped:

| Cue                | Source interval | Candidates                                   |
| ------------------ | --------------- | -------------------------------------------- |
| Fanfare            | 0.00–4.82 s     | `fanfare-cleaned`, `fanfare-resynth`         |
| Beware             | 4.82–7.65 s     | `beware-cleaned`, `beware-resynth`           |
| Weird / discordant | 7.65–9.85 s     | `discordant-cleaned`, `discordant-resynth`   |
| Down and up        | 9.85–11.03 s    | `down-and-up-cleaned`, `down-and-up-resynth` |

MP3 previews and lossless 48 kHz / 16-bit mono WAVs are supplied. `comparison-original-cleaned-resynth.wav` plays each cue three ways: level-matched original, cleaned, then reconstructed, with gaps. `scores.json` holds editable reconstructed tone events; `manifest.json` records cuts and durations. `audition.html` provides comparison players through the local Vite server. None of these working candidates is imported into the production game.

Reproduce with `yt-dlp --no-playlist -f bestaudio --write-info-json -o 'source.%(ext)s' 'https://www.youtube.com/watch?v=KgPFSxlXM6o'` in this directory, then run `uv run --no-project --with numpy --with scipy python prepare.py`. FFmpeg needs its `libmp3lame` encoder. The script uses the repository’s existing Python tooling without adding game dependencies. Tone-divider reference: [Texas Instruments SN76489AN data sheet](https://map.grauw.nl/resources/sound/texas_instruments_sn76489an.pdf); BBC hardware context: [A Hardware Guide for the BBC Microcomputer, sound circuit](https://acorn.huininga.nl/pub/mirrors/ftp.nvg.org/pub/bbc/doc/A%20Hardware%20Guide%20for%20the%20BBC%20Microcomputer/bbc_hw_03.htm).

Provenance: recording/upload credited to Fizgog; underlying effects identified by the uploader as Pitfall. No reuse licence is stated in the retrieved metadata and no separate composition permission was identified. These are audition candidates, not a claim that recording or melody rights have been cleared. The processing and oscillator implementation are original project work; resynthesis changes the recording, not the provenance of the tune. See `CREDITS.md`.

Proposed game use after selection: BBC powered and connected; play the fanfare once on entering the actual STEADY / NOMINAL diagnostic condition, from the computer’s speaker. Use the same authoritative readiness result as the screen; require a short stable dwell and re-arm only after readiness is genuinely lost, so changing meter values or minor jitter never loops the cue. Cancel on BBC power-off, lost link or room suspension. Do not use `operating` alone: that output can be true while the plant still has faults or incomplete drive/phase startup. The cue is separate from the computer boot beep and the internal Link Controller’s connection beep.

Verification: all nine rendered WAVs are finite 48 kHz mono signals with no clipping; 4× oversampled peaks are at or below −2 dBTP. Individual candidate RMS levels are approximately −20 dBFS, with the cleaned fanfare at −22.2 dBFS because of its larger transients. The local audition page and MP3 request return HTTP 200, and FFprobe confirms the MP3 duration. Python compilation, repository formatting and `git diff --check` pass. Original WebM SHA-256: `4cd4f932c26c302b147f05ef3809fc3f1b967bc7c1de3987028a713e49ec05fe`.
