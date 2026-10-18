"""Cut the owner's continuous Level 2 take into the game's narration clips.

Each clip is given as one or more pieces, each a rough (start, end) in seconds
of the take: the words whisper heard in that range. Every cut is moved into
the nearest real pause (ffmpeg silencedetect at -50 dB), padded with a little
room tone, and given short fades. Pieces of one clip are joined with their
natural pause, or a second of room tone if that pause was long.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
ASSETS = ROOT / "src/audio/assets/narration/level2"
CLIPS = HERE / "clips"
GAIN_DB = 4.0  # the whole take measures -22.2 LUFS; the game's clips sit at -18
PRE, POST, FADE, LONG_GAP = 0.25, 0.4, 0.012, 2.5
# A speech starts and ends only at a pause this long; shorter ones are breaths.
EDGE = 0.65

# key: [(start, end), ...]  (times are the first and last words' rough times)
MAP = {
    "intro_1": [(4.4, 28.0)],
    "intro_2": [(31.9, 40.4)],
    "intro_3": [(52.7, 64.9)],
    "intro_4": [(68.8, 74.9), (80.5, 81.5)],
    "cue_001": [(86.4, 92.9)],
    "startup_main": [(96.7, 106.1)],
    "cue_002": [(112.2, 126.4)],
    "betaform_done": [(133.6, 140.6)],
    "cue_003": [(145.4, 152.6)],
    "cue_004": [(158.6, 174.2)],
    "normal_extra": [(178.9, 183.4)],
    "normal_done": [(187.5, 193.3)],
    "cue_005": [(199.9, 202.0)],
    "cue_006": [(204.7, 211.9)],
    "cue_007": [(218.8, 227.0)],
    "cue_008": [(241.00, 248.51, "exact")],
    "cue_009": [(252.5, 267.2)],
    "cue_010": [(272.8, 281.1)],
    "cue_011": [(285.0, 297.0)],
    "cue_012": [(301.2, 310.7)],
    "cue_013": [(315.7, 327.1)],
    "cue_014": [(332.4, 334.3)],
    "cue_015": [(338.4, 347.5)],
    "cue_016": [(352.2, 355.0)],
    "cue_017": [(358.6, 362.1)],
    "cue_018": [(365.8, 368.5)],
    "cue_019": [(372.4, 380.4)],
    "cue_020": [(385.6, 390.2)],
    "cue_021": [(395.7, 398.5)],
    "cue_022": [(406.9, 412.0)],
    "cue_023": [(416.1, 426.3)],
    "cue_024": [(431.7, 436.5)],
    "cue_025": [(441.2, 446.4)],
    "cue_026": [(452.3, 464.0)],
    "cue_027": [(468.2, 472.0)],
    "cue_028": [(475.9, 479.0)],
    "cue_029": [(484.4, 497.0)],
    "cue_030": [(501.6, 505.4)],
    "cue_031": [(510.4, 514.1)],
    "cue_032": [(517.9, 523.0)],
    "cue_033": [(527.1, 529.5)],
    "cue_034": [(534.0, 538.5)],
    "cue_035": [(543.5, 547.0)],
    "cue_036": [(550.5, 552.5)],
    "cue_037": [(556.2, 558.1)],
    "cue_038": [(562.3, 564.3)],
    "cue_039": [(568.4, 576.5)],
    "cue_040": [(581.7, 586.6), (588.1, 589.6)],
    "cue_041": [(594.7, 604.1)],
    "cue_042": [(607.7, 616.6), (624.9, 625.50, "exact")],
    "cue_043": [(625.8, 629.6)],
    "cue_044": [(632.6, 635.0)],
    "cue_045": [(637.7, 640.0)],
    "cue_046": [(643.1, 645.5)],
    "cue_047": [(647.2, 648.8)],
    "cue_048": [(650.5, 651.6)],
    "cue_049": [(654.7, 657.5)],
    "cue_050": [(659.8, 663.0)],
    "cue_051": [(666.7, 670.5)],
    "cue_052": [(672.9, 673.9)],
    "cue_053": [(677.5, 678.6)],
    "cue_054": [(683.0, 688.0)],
    "cue_055": [(691.4, 696.4)],
    "cue_056": [(699.8, 702.8)],
    "cue_057": [(705.8, 708.2)],
    "cue_058": [(711.4, 714.8)],
    "cue_059": [(719.6, 727.0)],
    "cue_060": [(730.3, 733.3)],
    "cue_061": [(736.6, 739.6)],
    "cue_062": [(742.7, 745.8)],
    "cue_063": [(749.8, 753.5)],
    "cue_064": [(756.6, 761.5)],
    "cue_065": [(765.2, 767.8)],
    "cue_066": [(771.4, 777.3)],
    "cue_067": [(781.3, 786.1)],
    "cue_068": [(790.6, 791.8)],
    "cue_069": [(795.1, 797.0)],
    "cue_070": [(801.8, 805.1)],
    "cue_071": [(814.2, 817.7)],
    "cue_072": [(823.1, 826.5)],
    "cue_073": [(828.8, 831.0)],
    "cue_074": [(833.7, 836.0)],
    "cue_075": [(838.9, 841.0)],
    "cue_076": [(843.7, 846.3)],
    "cue_077": [(850.7, 854.6)],
    "cue_078": [(857.2, 859.4)],
    "cue_079": [(862.1, 866.7)],
    "cue_080": [(869.2, 872.0)],
    "cue_081": [(874.3, 876.5)],
    "cue_082": [(878.9, 882.2)],
    "cue_083": [(890.3, 896.9)],
    "cue_084": [(900.0, 901.0)],
    "cue_085": [(904.9, 908.6)],
    "cue_086": [(912.2, 918.2)],
    "cue_087": [(922.1, 930.5)],
    "cue_088": [(934.4, 935.8)],
    "cue_089": [(939.9, 948.0)],
    "cue_091": [(953.7, 962.71, "exact")],
    "cue_092": [(962.71, 963.46, "exact"), (966.6, 966.8)],
    "cue_093": [(969.0, 971.4)],
    "cue_094": [(976.2, 977.0)],
    "cue_095": [(980.7, 982.6)],
    "farewell_1": [(985.7, 988.5)],
    "farewell_2": [(992.6, 994.6)],
    "farewell_3": [(997.3, 1002.2)],
    "cue_096": [(1007.1, 1041.5), (1054.0, 1085.4)],
    "startup_main_reset": [(1095.3, 1105.0)],
    "betaform_intro": [(1108.8, 1117.9)],
    "betaform_outro": [(1122.8, 1127.3)],
    "betaform_ack_1": [(1130.4, 1131.8)],
    "betaform_ack_2": [(1133.2, 1135.6)],
    "betaform_ack_3": [(1136.6, 1140.1)],
    "betaform_isolator_say": [(1146.4, 1149.8)],
    "betaform_isolator_remind": [(1166.40, 1175.79, "exact")],
    "betaform_speed_say": [(1181.6, 1185.0)],
    "betaform_speed_remind": [(1187.1, 1195.4)],
    "betaform_fan_say": [(1210.0, 1213.4)],
    "betaform_fan_remind": [(1217.3, 1230.4)],
    "betaform_key_say": [(1236.73, 1242.23, "exact")],
    "betaform_key_remind": [(1244.8, 1257.9)],
    "betaform_boost_say": [(1263.0, 1265.5)],
    "betaform_boost_remind": [(1269.6, 1278.2)],
    "betaform_phase_say": [(1284.3, 1289.5)],
    "betaform_phase_remind": [(1292.7, 1303.4)],
    "betaform_kirk_say": [(1309.1, 1312.7)],
    "betaform_kirk_remind": [(1316.9, 1326.8)],
    "betaform_hoa_say": [(1332.8, 1335.8)],
    "betaform_hoa_remind": [(1338.6, 1348.3)],
    "betaform_test_say": [(1352.4, 1354.2)],
    "betaform_test_remind": [(1357.4, 1367.8)],
    "betaform_stop_say": [(1373.4, 1378.8)],
    "betaform_stop_remind": [(1382.8, 1393.9)],
    "reset_prompt": [(1401.7, 1411.6)],
    "reset_remind": [(1415.2, 1424.3)],
    "skip_appears": [(1429.4, 1435.4)],
    "cue_097": [(1443.0, 1464.4)],
    "cue_098": [(1469.8, 1476.6)],
    "cue_099": [(1479.2, 1483.6)],
    "cue_100": [(1487.4, 1492.7)],
    "cue_101": [(1495.0, 1498.5)],
    "cue_102": [(1500.6, 1502.5)],
    "cue_103": [(1505.5, 1523.5)],
    "cue_104": [(1525.5, 1533.0)],
    "cue_105": [(1535.1, 1539.0)],
    "cue_106": [(1540.6, 1543.5)],
    "cue_107": [(1544.8, 1549.0)],
    "cue_108": [(1550.9, 1555.9)],
    "card_1": [(1593.6, 1595.9)],
    "card_2": [(1596.6, 1599.5)],
    "card_3": [(1605.6, 1608.8)],
    "card_4": [(1611.4, 1614.4)],
    "card_5": [(1616.1, 1619.1)],
    "encourage_a_1": [(1625.8, 1633.1)],
    "encourage_b_1": [(1636.1, 1648.0)],
    "encourage_a_2": [(1650.6, 1658.5)],
    "encourage_b_2": [(1660.9, 1672.0)],
    "encourage_a_3": [(1675.0, 1684.0)],
    "encourage_b_3": [(1686.9, 1697.7)],
    "encourage_a_4": [(1700.0, 1708.6)],
    "encourage_b_4": [(1712.6, 1724.3)],
    "encourage_a_5": [(1726.6, 1736.0)],
    "encourage_b_5": [(1738.8, 1748.3), (1750.2, 1750.5)],
    "last_1": [(1754.0, 1758.5)],
    "last_2": [(1760.7, 1765.9)],
    "last_3": [(1768.0, 1774.4)],
    "last_4": [(1775.7, 1782.8)],
    "last_5": [(1785.8, 1793.1)],
}
# Not performed: a beat of room tone stands in for it.
ROOM_TONE_ONLY = {"cue_090": 0.4}


def silences() -> list[tuple[float, float]]:
    """Pauses of a quarter-second or more (silencedetect's, rejoined across blips)."""
    spans = [tuple(map(float, line.split())) for line in (HERE / "pauses.tsv").read_text().splitlines()]
    return [s for s in spans if s[1] - s[0] >= 0.25]


def onset(t: float, end: float, quiet: list[tuple[float, float]]) -> float:
    """Where speech starting near t really starts: the end of its pause."""
    return max(s[1] for s in quiet if s[0] <= t + 0.4 and s[1] < end and s[1] - s[0] >= EDGE)


def offset(t: float, start: float, quiet: list[tuple[float, float]]) -> float:
    """Where speech ending near t really ends: the start of the next pause."""
    return min(s[0] for s in quiet if s[1] >= t - 0.4 and s[0] > start and s[1] - s[0] >= EDGE)


def main() -> None:
    audio, rate = sf.read(HERE / "take.wav", dtype="float32")
    quiet = silences()
    tone_start = 1087.0  # a long, clean pause before startup_main_reset
    tone = audio[int(tone_start * rate):int((tone_start + 2) * rate)]
    gain = 10 ** (GAIN_DB / 20)
    CLIPS.mkdir(exist_ok=True)
    report = {}

    def fade(x: np.ndarray) -> np.ndarray:
        n = min(int(FADE * rate), len(x) // 2)
        ramp = np.linspace(0, 1, n, dtype=np.float32)
        x = x.copy()
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
        return x

    keys = sys.argv[1:] or list(MAP) + list(ROOM_TONE_ONLY)
    for key in keys:
        if key in ROOM_TONE_ONLY:
            out = fade(tone[: int(ROOM_TONE_ONLY[key] * rate)])
            report[key] = []
        else:
            spans = []
            for a, b, *exact in MAP[key]:
                if exact:
                    s, e = a, b
                else:
                    s = onset(a, b, quiet)
                    e = offset(b, s, quiet)
                # Pad into the pause, never past its middle.
                before = [q for q in quiet if q[1] == s]
                after = [q for q in quiet if q[0] == e]
                s0 = max(s - PRE, (before[0][0] + s) / 2) if before else s - PRE
                e0 = min(e + POST, (after[0][1] + e) / 2) if after else e + POST
                spans.append((s0, e0, s, e))
            parts = []
            for i, (s0, e0, s, e) in enumerate(spans):
                if i and s - spans[i - 1][3] <= LONG_GAP:
                    # A natural pause: run straight on from the last piece.
                    parts[-1] = audio[int(spans[i - 1][0] * rate):int(e0 * rate)]
                    spans[i] = (spans[i - 1][0], e0, spans[i - 1][2], e)
                    continue
                if i:
                    parts.append(tone[: int(1.0 * rate)])
                parts.append(audio[int(s0 * rate):int(e0 * rate)])
            out = fade(np.concatenate([fade(p) for p in parts]))
            report[key] = [(round(s, 2), round(e, 2)) for _, _, s, e in spans]
        out = np.clip(out * gain, -0.89, 0.89)  # about -1 dBFS
        wav = CLIPS / f"{key}.wav"
        sf.write(wav, out, rate, subtype="PCM_24")
        subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
             "-af", "highpass=f=75,alimiter=limit=0.79:level=false", "-ac", "1", "-ar", "24000",
             "-b:a", "64k", str(CLIPS / f"{key}.mp3")],
            check=True,
        )
    (HERE / "cuts.json").write_text(json.dumps(report, indent=1))
    print(f"Cut {len(keys)} clips into {CLIPS}")


if __name__ == "__main__":
    main()
