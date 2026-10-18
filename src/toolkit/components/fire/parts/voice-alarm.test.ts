import { signal } from '@preact/signals-core';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { partAudio } from '../../core/audio/part-audio';
import { FIRE_SOUNDER } from '../../core/audio/part-loops';
import { createPanelKit } from '../../core/views/eighties-controls';
import { sounderBeacon, voiceAlarm } from './fire-parts';

function fixture() {
  const play = vi.spyOn(partAudio, 'play').mockReturnValue(vi.fn());
  const hold = vi.spyOn(partAudio, 'hold').mockImplementation(() => {});
  const voice = signal<'alert' | 'evacuate' | null>('evacuate');
  const announcement = signal<{
    kind: 'false-alarm' | 'all-clear' | null;
    n: number;
  }>({ kind: null, n: 0 });
  const kit = createPanelKit();
  const speaker = voiceAlarm(kit, { voice, announcement });
  const sounder = sounderBeacon(kit, {
    sounding: signal(true),
    tone: speaker.evacuationTone,
  });
  return { speaker, sounder, play, hold, voice, announcement };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('voice alarm placement and room suspension', () => {
  it('sounds the evacuation tone from the sounder, and speech from the speaker', () => {
    const { speaker, sounder, play, hold } = fixture();
    speaker.update(0.01);
    expect(hold).toHaveBeenLastCalledWith(
      expect.any(Object),
      FIRE_SOUNDER,
      sounder.object,
    );
    expect(play).not.toHaveBeenCalled();
    speaker.update(5);
    expect(speaker.evacuationTone.value).toBe(false);
    speaker.update(0.6);
    expect(play).toHaveBeenLastCalledWith(expect.any(Object), speaker.object);
    speaker.dispose();
    sounder.dispose();
  });

  it('stops speech and tones on leaving, cancels pending announcements, and resumes the sequence', () => {
    vi.useFakeTimers();
    const { speaker, sounder, play, announcement } = fixture();
    speaker.update(0.01);
    speaker.setAudible(false);
    expect(speaker.evacuationTone.value).toBe(false);
    announcement.value = { kind: 'all-clear', n: 1 };
    vi.advanceTimersByTime(2000);
    speaker.update(20);
    expect(play).not.toHaveBeenCalled();
    speaker.setAudible(true);
    speaker.update(0.01);
    expect(speaker.evacuationTone.value).toBe(true);
    announcement.value = { kind: 'all-clear', n: 2 };
    const stop = play.mock.results.at(-1)!.value;
    speaker.setAudible(false);
    expect(stop).toHaveBeenCalled();
    const count = play.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(play).toHaveBeenCalledTimes(count);
    speaker.dispose();
    sounder.dispose();
  });
});
