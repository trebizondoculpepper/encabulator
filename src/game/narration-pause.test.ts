import { describe, expect, it } from 'vite-plus/test';
import { createNarrationPause } from './narration-pause';

describe('unsolicited narration', () => {
  it('waits twenty seconds before the first reminder and between reminders', () => {
    const pause = createNarrationPause();
    pause.step(19, false);
    expect(pause.take()).toBe(false);
    pause.step(1, false);
    expect(pause.take()).toBe(true);
    expect(pause.take()).toBe(false);
    pause.step(19, false);
    expect(pause.take()).toBe(false);
    pause.step(1, false);
    expect(pause.take()).toBe(true);
  });
  it('counts from the end of speech, including long queued passages', () => {
    const pause = createNarrationPause();
    pause.step(19, false);
    pause.step(60, true);
    expect(pause.take()).toBe(false);
    pause.step(19, false);
    expect(pause.take()).toBe(false);
    pause.step(1, false);
    expect(pause.take()).toBe(true);
  });
});
