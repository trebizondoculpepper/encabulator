"""Make the Level 2 recording script and clip-to-asset index.

Run from the repository root: python3 doc/script/make-level2-teleprompter.py
The current game narration manifest supplies the spoken text, including every
conditional card-name/count variant. The scenario remains the authoring script.
"""

import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = ROOT / "src/audio/assets/narration/level2/lines.json"


def cues(first: int, last: int) -> list[str]:
    return [f"cue_{number:03d}" for number in range(first, last + 1)]


def main() -> None:
    lines = json.loads(SOURCE.read_text())
    operations = ["isolator", "speed", "fan", "key", "boost", "phase", "kirk", "hoa", "test", "stop"]
    groups = [
        ("Welcome back", "Corporate training film: grand, fond, entirely sincere.", [f"intro_{i}" for i in range(1, 5)]),
        ("Power and the normal baseline", "Matter-of-fact instructions. The machine is behaving normally.", ["cue_001", "startup_main", "cue_002"]),
        ("First fault and recovery", "A small surprise, brisk practical advice, then complete confidence in the machine's reliability.", ["betaform_done", "cue_003", "cue_004", "normal_extra", "normal_done"]),
        ("The Automation cabinet", "This time something is genuinely wrong. Suspicion turns to disgust.", cues(5, 9)),
        ("The first board", "Disgust, indignation and relief when it is thrown away.", cues(10, 13)),
        ("The second board", "Panic becomes personal. Friendship, faith and trust.", cues(14, 29)),
        ("The third board", "The machine is a sick child. Hope, pleading, gratitude.", cues(30, 38)),
        ("The fourth board", "Coaxing and extravagant promises. Then shared triumph.", cues(39, 71)),
        ("The last board", "Triumph collapses into panic and grief. The machine is still under warranty.", cues(72, 84)),
        ("Recovery and the ending", "Relief, awkward intimacy, then a sharp return to the training-film voice. Let the final poem breathe.", cues(85, 96)),
        ("Conditional: a premature main-power switch", "Patient correction. Isolator first, main power second.", ["startup_main_reset"]),
        ("Conditional: the two normal-operation reminders", "Weariness and precise sarcasm. Each clip is a separate response to inaction.", ["betaform_intro", "betaform_outro", "betaform_ack_1", "betaform_ack_2", "betaform_ack_3"]),
        ("Random operations: instructions and reminders", "For each control: a plain instruction first, then a separate sarcastic reminder. Record all ten; the game chooses two, then one different operation later.", [f"betaform_{operation}_{kind}" for operation in operations for kind in ("say", "remind")]),
        ("Conditional: reset and the skip", "Physical instructions and the offended suggestion that the skip was here all along.", ["reset_prompt", "reset_remind", "skip_appears"]),
        ("Optional: idle, holding, floor and refusal reactions", "Independent reactions, not one continuous speech. The game decides when to use them.", cues(97, 108)),
        ("Alternate first-card names", "The first card can be any of the five. Record each version.", [f"card_{i}" for i in range(1, 6)]),
        ("Alternate fourth-card encouragement", "Coaxing the trainee: each card can be the fourth one removed.", [f"encourage_{kind}_{i}" for i in range(1, 6) for kind in ("a", "b")]),
        ("Alternate final-card names", "Desperate urgency. Each card can be the last.", [f"last_{i}" for i in range(1, 6)]),
        ("Alternate remaining-card counts", "Faith and the sick-child metaphor. Read digits as ordinary spoken numbers. Each version is its own clip.", [f"remaining_{kind}_{i}" for i in range(4) for kind in ("a", "b")]),
    ]
    assigned = [key for _, _, keys in groups for key in keys]
    if len(assigned) != len(set(assigned)) or set(assigned) != set(lines):
        raise SystemExit(f"Clip coverage mismatch: missing {set(lines) - set(assigned)}, unknown {set(assigned) - set(lines)}")
    instructions = (
        'Record one WAV for the whole session. Before each clip, say its number aloud, '
        'for example, "Clip one." Pause about two seconds, read the speech, then pause '
        'another two seconds. For a retake, say "Clip one, again" and repeat the whole '
        'clip. Read only the speech and the spoken clip number; headings, asset names '
        'and italic directions are silent. Do not wait for the game\'s seven- or '
        'twenty-second pauses: those are added during playback. Keep the original WAV '
        'untrimmed so the slates and gaps can guide editing.'
    )
    md = ["# Module 2: Standard Encabulation Operation — teleprompter", "", instructions, "", f"{len(assigned)} clips, including all optional lines and card-name/count alternatives. Alternate versions belong to separate takes, not to one playthrough.", ""]
    plain = ["MODULE 2: STANDARD ENCABULATION OPERATION", "TELEPROMPTER / RECORDING SCRIPT", "", instructions, "", f"{len(assigned)} clips. Directions and asset IDs are not spoken.", ""]
    rows = []
    number = 0
    for title, direction, keys in groups:
        md += ["---", "", f"## {title}", "", f"_{direction}_", ""]
        plain += ["=" * 60, title.upper(), "[" + direction + "]", ""]
        for key in keys:
            number += 1
            speech = " ".join(lines[key].split())
            md += [f"### Clip {number:03d} · {key}", "", speech, ""]
            plain += [f"CLIP {number:03d} [{key}]", "", speech, "", ""]
            rows.append((number, key, title, speech))
    (HERE / "level2-teleprompter.md").write_text("\n".join(md))
    (HERE / "level2-teleprompter.txt").write_text("\n".join(plain).rstrip() + "\n")
    with (HERE / "level2-recording-clips.csv").open("w", newline="") as output:
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow(["clip", "asset_key", "section", "text"])
        writer.writerows(rows)
    print(f"Wrote {number} clips; every narration asset appears exactly once.")


if __name__ == "__main__":
    main()
