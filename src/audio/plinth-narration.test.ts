import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createPlinthNarrationPlayer } from './plinth-narration';

const played: FakeAudio[] = [];
class FakeAudio {
  preload = '';
  volume = 1;
  paused = false;
  onended: (() => void) | null = null;
  constructor(readonly src: string) {
    played.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.onended?.();
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  played.length = 0;
});

describe('plinth intro playback', () => {
  it('plays three short sections with silence between them', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
    const player = createPlinthNarrationPlayer();
    player.unlock();
    player.offer({ clip: 29, priority: 4 });
    for (const [index, clip] of [29, 32, 33].entries()) {
      expect(player.state().playing).toBe(clip);
      played[index].end();
      if (index < 2) {
        expect(player.state().introActive).toBe(true);
        expect(player.state().playing).toBeNull();
        vi.advanceTimersByTime(4499);
        expect(played).toHaveLength(index + 1);
        vi.advanceTimersByTime(1);
      }
    }
    expect(player.state().introActive).toBe(false);
    player.dispose();
  });

  it('lets a plinth arrival take over after the current intro section', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
    const player = createPlinthNarrationPlayer();
    player.unlock();
    player.offer({ clip: 29, priority: 4 });
    player.offer({ clip: 1, priority: 3 });
    expect(player.state().playing).toBe(29);
    played[0].end();
    expect(player.state().playing).toBe(1);
    expect(player.state().introActive).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(played).toHaveLength(2);
    player.dispose();
  });

  it('leaves a pause between two lines about the same shape', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
    const player = createPlinthNarrationPlayer();
    player.unlock();
    player.offer({ clip: 2, priority: 3, shape: 'rhombus' });
    player.offer({ clip: 23, priority: 1, shape: 'rhombus' });
    played[0].end();
    expect(player.state().playing).toBeNull();
    player.unlock();
    vi.advanceTimersByTime(4999);
    expect(played).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(player.state().playing).toBe(23);
    player.dispose();
  });
});
