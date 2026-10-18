import { describe, expect, it } from 'vite-plus/test';
import lines from '../audio/assets/narration/level2/lines.json';
import {
  LEVEL2_BETAFORM,
  LEVEL2_RESET,
  LEVEL2_STARTUP,
  LEVEL2_NORMAL,
  LEVEL2_CUES,
} from './level2-cues';

const recorded = new Set(Object.values(lines));

describe('the Level 2 narration', () => {
  // Numbered cues play by number; these play by their text, so each must
  // match a recording exactly or the voice refuses it.
  it('has a recording for every line it plays by its text', () => {
    const all = [
      ...Object.values(LEVEL2_STARTUP),
      ...Object.values(LEVEL2_NORMAL),
      LEVEL2_BETAFORM.intro,
      LEVEL2_BETAFORM.outro,
      LEVEL2_BETAFORM.done,
      LEVEL2_RESET.prompt,
      LEVEL2_RESET.remind,
      ...LEVEL2_BETAFORM.acks,
      ...Object.values(LEVEL2_BETAFORM.operations).flatMap((o) => [
        o.say,
        o.remind,
      ]),
    ];
    // The revised opening cues must match their newly rendered takes.
    for (let i = 0; i < 6; i++) {
      const key = `cue_${String(i + 1).padStart(3, '0')}`;
      expect((lines as Record<string, string>)[key]).toBe(LEVEL2_CUES[i].text);
    }
    expect(Object.keys(LEVEL2_BETAFORM.operations)).toHaveLength(10);
    for (const text of all) expect(recorded.has(text)).toBe(true);
  });
});
