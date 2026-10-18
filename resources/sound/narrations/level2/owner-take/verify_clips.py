"""Transcribe each cut clip alone, so its first and last words can be checked."""
import json
from pathlib import Path
import mlx_whisper

HERE = Path(__file__).resolve().parent
out = {}
for wav in sorted((HERE / "clips").glob("*.wav")):
    r = mlx_whisper.transcribe(str(wav), path_or_hf_repo="mlx-community/whisper-large-v3-mlx",
                               language="en", condition_on_previous_text=False)
    out[wav.stem] = r["text"].strip()
    print(wav.stem, "|", out[wav.stem], flush=True)
(HERE / "clip-transcripts.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
