"""Transcribe the named clips (or all) and print each with its length."""
import sys
from pathlib import Path
import mlx_whisper
import wave

HERE = Path(__file__).resolve().parent
for key in sys.argv[1:]:
    wav = HERE / "clips" / f"{key}.wav"
    text = mlx_whisper.transcribe(str(wav), path_or_hf_repo="mlx-community/whisper-large-v3-mlx",
                                  language="en", condition_on_previous_text=False)["text"].strip()
    print(f"{key} [{(lambda w: w.getnframes() / w.getframerate())(wave.open(str(wav))):.1f}s] {text}", flush=True)
