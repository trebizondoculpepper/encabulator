"""Render the selected resynthesized cues with light mono case resonance. Run with uv run --no-project --with numpy --with scipy python prepare.py.

The resynthesis is an approximate transcription, not original BBC register data.
The fanfare starts at the measured melody onset, excluding its noisy lead-in.
"""
from pathlib import Path
import json
import subprocess
from tempfile import TemporaryDirectory
import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
SR = 48000
# Finish at the audible gaps rather than chopping the final notes at rough timestamps.
CUTS = [('fanfare', 3.80, 4.82), ('beware', 4.82, 7.65), ('discordant', 7.65, 9.85), ('down-and-up', 9.85, 11.03)]


def write(path, x):
    x = np.nan_to_num(x)
    # Limit sample peaks below -2 dBFS; short fades protect edit boundaries.
    x *= min(1, 0.79 / max(np.max(np.abs(x)), 1e-12))
    n = min(240, len(x) // 2)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    wavfile.write(path, SR, np.round(x * 32767).astype(np.int16))


def level(x, target=0.10):
    rms = np.sqrt(np.mean(x * x))
    return x * min(1000, target / max(rms, 1e-9))


def case_reverb(x):
    """A mono enclosure approximation, not a measured BBC impulse response."""
    t = np.arange(round(.16 * SR)) / SR
    body = np.zeros(len(t))
    # Damped panel/cavity modes: a small hollow plastic body around the speaker.
    for hz, decay, weight in [(225, .030, 1), (385, .023, .7), (650, .017, .4), (1120, .011, .18)]:
        body += weight * np.sin(2 * np.pi * hz * t) * np.exp(-t / decay)
    body *= .14 / np.sqrt(np.sum(body * body))
    impulse = body
    # Short internal reflections; no stereo widening or long room tail.
    for delay, amount in [(.0027, .09), (.0041, -.06), (.0063, .05), (.0092, .04), (.014, -.03), (.022, .022), (.034, .015), (.052, .008)]:
        impulse[round(delay * SR)] += amount
    impulse *= .80  # A little fuller, while below the earlier cleaned-reference effect.
    impulse[0] += 1
    return level(signal.fftconvolve(x, impulse))


def square(frequencies):
    # SN76489 tone divisors at the BBC's 4 MHz clock. No equal-tempered retuning.
    frequencies = np.asarray(frequencies)
    divisors = np.clip(np.round(4_000_000 / (32 * frequencies)), 1, 1023)
    hz = 4_000_000 / (32 * divisors)
    phase = np.cumsum(hz) / SR
    out = np.zeros(len(hz))
    # Band-limited odd harmonics avoid the aliasing of a naive digital square wave.
    for harmonic in range(1, 81, 2):
        valid = harmonic * hz < 9500
        out += np.sin(2 * np.pi * phase * harmonic) * valid / harmonic
    return out * (4 / np.pi)


def synth_notes(events, duration):
    out = np.zeros(round((duration + 0.05) * SR))
    for start, seconds, start_hz, end_hz, amplitude in events:
        length = round(seconds * SR)
        frequencies = 1 / np.linspace(1 / start_hz, 1 / end_hz, length)
        wave = square(frequencies)
        # 1 ms attack and 5 ms release retain the dry chip articulation without edit clicks.
        attack, release = min(48, length // 2), min(240, length // 2)
        wave[:attack] *= np.linspace(0, 1, attack)
        wave[-release:] *= np.linspace(1, 0, release)
        offset = round(start * SR)
        out[offset:offset + length] += amplitude * wave
    # A restrained speaker roll-off, rather than adding sampled room dirt back in.
    out = signal.sosfilt(signal.butter(2, [100, 3800], btype='bandpass', fs=SR, output='sos'), out)
    return level(out)


def events():
    # [start, duration, starting Hz, ending Hz, relative level]. Editable approximation.
    fanfare = [
        [.02, .07, 445, 445, .7], [.10, .08, 592, 592, .7],
        [.19, .08, 759, 759, .7], [.28, .64, 880, 880, .7],
    ]
    beware = [[.05, .47, 155.3, 155.3, .7], [.52, .12, 175, 175, .7], [.64, .26, 184.5, 184.5, .7], [.91, .26, 155.1, 155.1, .7]]
    # The latter half is deliberately rough modulation, not hiss to be removed.
    for t in np.arange(1.24, 2.78, .035):
        hz = 209 + 8 * np.sin((t - 1.24) * 2 * np.pi * 8)
        beware.append([float(t), .035, float(hz), float(hz), .7])
    discordant = [[.04, .50, 208.4, 208.4, .7], [.55, .1, 414, 414, .7], [.65, .66, 347.7, 347.7, .7], [1.33, .17, 414, 414, .7], [1.51, .64, 347.7, 347.7, .7]]
    down_up = [[0, .82, 347.7, 195, .7], [.84, .08, 195, 278, .7], [.92, .10, 278, 525, .7]]
    return {'fanfare': fanfare, 'beware': beware, 'discordant': discordant, 'down-and-up': down_up}


def main():
    scores = events()
    (HERE / 'scores.json').write_text(json.dumps(scores, indent=2) + '\n')
    manifest = []
    for name, start, end in CUTS:
        rendered = case_reverb(synth_notes(scores[name], end - start))
        # Encode through a temporary WAV; retain only the compact MP3 output.
        with TemporaryDirectory(prefix='bbc-cue-') as temporary:
            wav = Path(temporary) / f'{name}.wav'
            write(wav, rendered.copy())
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '160k', '-ac', '1', str(HERE / f'{name}-resynth.mp3')], check=True)
        manifest.append({'id': name, 'sourceStart': start, 'sourceEnd': end, 'seconds': len(rendered) / SR, 'channels': 1, 'variant': 'resynthesized with mono case resonance', 'caseResponseSeconds': .16, 'caseWetGain': .80, 'transcription': 'approximate; fanfare begins at measured melody onset'})
        print(name, f'{len(rendered)/SR:.3f}s', 'resynth + light mono case resonance')
    (HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
