"""Prepare audition candidates. Run with uv run --no-project --with numpy --with scipy python prepare.py.

The resynthesis is an approximate transcription, not original BBC register data.
The first cue is especially uncertain because its opening is much quieter than its ending.
"""
from pathlib import Path
import json
import subprocess
import numpy as np
from scipy import signal, ndimage
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
SR = 48000
# Finish at the audible gaps rather than chopping the final notes at rough timestamps.
CUTS = [('fanfare', 0.0, 4.82), ('beware', 4.82, 7.65), ('discordant', 7.65, 9.85), ('down-and-up', 9.85, 11.03)]


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


def clean(x):
    # Adaptive narrow-band Wiener subtraction: chip partials survive; broadband dirt falls away.
    f, t, z = signal.stft(x, SR, nperseg=2048, noverlap=1536)
    mag = abs(z)
    floor = ndimage.median_filter(mag, size=(15, 5))
    gain = np.maximum(0.04, 1 - (1.25 * floor / np.maximum(mag, 1e-10)) ** 2)
    gain = ndimage.gaussian_filter(gain, sigma=(0.45, 0.65))
    _, result = signal.istft(z * gain, SR, nperseg=2048, noverlap=1536)
    result = result[:len(x)]
    result = signal.sosfilt(signal.butter(2, [90, 5200], btype='bandpass', fs=SR, output='sos'), result)
    # The source's automatic gain changes dramatically. Smooth local levelling corrects that.
    rms = np.sqrt(ndimage.uniform_filter1d(result * result, size=9600) + 1e-12)
    correction = np.minimum(80, (0.04 / np.maximum(rms, 0.00015)) ** 0.8)
    correction = ndimage.gaussian_filter1d(correction, 2400)
    return level(result * correction)


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
        [.64, .80, 261, 261, .45], [.64, .80, 330, 330, .45],
        [1.48, .28, 220, 220, .5], [1.48, .28, 294, 294, .42],
        [2.10, .30, 147, 147, .4], [2.10, .30, 294, 294, .55],
        [2.52, .43, 233, 233, .5], [2.52, .43, 294, 294, .4],
        [3.00, .18, 311, 311, .5], [3.25, .18, 294, 294, .5],
        [3.42, .34, 831, 831, .5],
        [3.80, .08, 440, 440, .7], [3.89, .08, 587, 587, .7],
        [3.98, .08, 762, 762, .7], [4.07, .64, 881, 881, .7],
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
    if not (HERE / 'source.wav').exists():
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(HERE / 'source.webm'), '-ac', '1', '-ar', str(SR), str(HERE / 'source.wav')], check=True)
    sr, source = wavfile.read(HERE / 'source.wav')
    assert sr == SR
    source = source.astype(float) / 32768
    scores = events()
    (HERE / 'scores.json').write_text(json.dumps(scores, indent=2) + '\n')
    comparisons = []
    manifest = []
    for name, start, end in CUTS:
        original = source[round(start * SR):round(end * SR)].copy()
        cleaned = clean(original)
        rebuilt = synth_notes(scores[name], end - start)
        write(HERE / f'{name}-cleaned.wav', cleaned.copy())
        write(HERE / f'{name}-resynth.wav', rebuilt.copy())
        # Three equally levelled versions per cue: original, cleaned, then resynthesized.
        for version in [level(original), cleaned, rebuilt]:
            comparisons.extend([version, np.zeros(round(.65 * SR))])
        manifest.append({'id': name, 'sourceStart': start, 'sourceEnd': end, 'cleanedSeconds': len(cleaned) / SR, 'resynthSeconds': len(rebuilt) / SR, 'transcription': 'approximate; fanfare opening least certain'})
        for version in ['cleaned', 'resynth']:
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(HERE / f'{name}-{version}.wav'), '-c:a', 'libmp3lame', '-b:a', '160k', str(HERE / f'{name}-{version}.mp3')], check=True)
        print(name, 'prepared', round(end - start, 2), 'seconds')
    write(HERE / 'comparison-original-cleaned-resynth.wav', np.concatenate(comparisons))
    (HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    for file in HERE.glob('*-cleaned.wav'):
        _, x = wavfile.read(file)
        print(file.name, 'peak', np.max(abs(x.astype(float))) / 32768, 'finite', bool(np.isfinite(x).all()))


if __name__ == '__main__':
    main()
