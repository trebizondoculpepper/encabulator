"""Make plinth-teleprompter.md from the master script, plinth-story.md.

Run from the repository root: python3 doc/script/make-teleprompter.py
"""

import re
from pathlib import Path

HERE = Path(__file__).parent
WORDS = (
    "zero one two three four five six seven eight nine ten eleven twelve thirteen "
    "fourteen fifteen sixteen seventeen eighteen nineteen twenty"
).split()

# The order of performance: one mood at a time. Every clip appears once.
GROUPS = [
    ("Coming in", "Wary. Talking the visitor out of it.", [(29, "Entering the room")]),
    ("The sphere", "Warm. Wholesome. Everything good.", [(1, "First visit"), (27, "Coming back"), (21, "Staying"), (22, "Staying, again"), (12, "Walking away"), (13, "Walking away, again")]),
    ("The rhombus", "Disgust and suspicion. Never fear.", [(2, "First visit"), (9, "Coming back"), (23, "Staying"), (3, "Walking away"), (15, "Walking away, again"), (16, "Walking away, a third"), (17, "Walking away, a fourth")]),
    ("The helix", "Wistful. Regret. What might have been.", [(4, "First visit"), (28, "Coming back"), (5, "Staying"), (24, "Staying, again"), (8, "Walking away"), (14, "Walking away, again")]),
    ("From one shape to another", "Changing mood mid-walk.", [(18, "Sphere to rhombus"), (25, "Sphere to helix"), (19, "Rhombus to sphere"), (20, "Rhombus to sphere, again"), (26, "Rhombus to helix"), (7, "Helix to sphere"), (6, "Helix to rhombus")]),
    ("In the dark", "Away from all three.", [(10, "Lingering in the dark"), (11, "Still in the dark")]),
    ("The way out", "", [(30, "Leaving without seeing a shape"), (31, "Leaving after seeing the shapes")]),
]


# The second teleprompter: short lines for standing and looking, read
# without slates and split by their pauses and words.
LOOKING = [
    ("The sphere", "Warm. Wholesome. Everything good.", [34, 35, 36, 37, 38]),
    ("The helix", "Wistful. Regret. What might have been.", [39, 40, 41, 42]),
    ("The rhombus", "Disgust and suspicion. Never fear.", [43, 44, 45, 46, 47]),
]


def spoken(n: int) -> str:
    if n <= 20:
        return WORDS[n]
    tens = {2: "twenty", 3: "thirty", 4: "forty"}[n // 10]
    return tens if n % 10 == 0 else f"{tens}-{WORDS[n % 10]}"


def main() -> None:
    clips: dict[int, str] = {}
    for line in (HERE / "plinth-story.md").read_text().splitlines():
        m = re.match(r"^\|\s*(\d+)\s*\|\s*`[^`]+`\s*\|.*\|(.*)\|\s*$", line)
        if m:
            text = re.sub(r"\s*_\(tidied:.*?\)_\s*$", "", m.group(2).strip())
            clips[int(m.group(1))] = text.strip()
    placed = sorted(
        [n for _, _, items in GROUPS for n, _ in items]
        + [n for _, _, items in LOOKING for n in items]
    )
    missing = sorted(set(clips) - set(placed))
    if missing or placed != sorted(set(placed)):
        raise SystemExit(f"Clips not placed exactly once in GROUPS: {missing or placed}")
    out = [
        "# The plinths: teleprompter script",
        "",
        'Before each clip, say its slate aloud: "Clip twelve." Pause two seconds. Read the line. Pause two seconds. To retake, say "Clip twelve, again" and go again: the last take counts. Improvise freely; keep each take to its moment.',
        "",
    ]
    for title, mood, items in GROUPS:
        out += ["---", "", f"## {title}", ""]
        if mood:
            out += [f"_{mood}_", ""]
        for n, label in items:
            out += [f"### Clip {spoken(n)}: {label}", "", clips[n], ""]
    out += ["---", "", "That's all of them. Thank you.", ""]
    (HERE / "plinth-teleprompter.md").write_text("\n".join(out))
    out = [
        "# The plinths: looking lines",
        "",
        "Short lines for standing at a shape and looking at it. No slates: read each line, then pause about three seconds before the next. To retake a line, just say it again; the last take counts. Improvise freely.",
        "",
    ]
    for title, mood, items in LOOKING:
        out += ["---", "", f"## {title}", "", f"_{mood}_", ""]
        for n in items:
            out += [clips[n], ""]
    out += ["---", "", "That's all of them. Thank you.", ""]
    (HERE / "plinth-teleprompter-looking.md").write_text("\n".join(out))


if __name__ == "__main__":
    main()
