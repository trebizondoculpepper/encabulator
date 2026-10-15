import type { NarrationCue } from '../game/plinth-narration';

/** Browser-ready recordings, ordered by the spoken script number. */
const clips = [
  new URL('./assets/narration/plinths/clip_01.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_02.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_03.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_04.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_05.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_06.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_07.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_08.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_09.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_10.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_11.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_12.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_13.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_14.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_15.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_16.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_17.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_18.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_19.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_20.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_21.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_22.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_23.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_24.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_25.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_26.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_27.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_28.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_29.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_30.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_31.mp3', import.meta.url),
];

/** One narrator voice. New arrivals can interrupt less immediate lines. */
export function createPlinthNarrationPlayer() {
  let unlocked = false;
  let visible = true;
  let current: HTMLAudioElement | null = null;
  let currentCue: NarrationCue | null = null;
  let pending: NarrationCue | null = null;
  let disposed = false;
  const start = (cue: NarrationCue) => {
    const url = clips[cue.clip - 1];
    if (!url || disposed) return;
    const audio = new Audio(url.href);
    audio.preload = 'auto';
    audio.volume = 0.8;
    audio.onended = () => {
      if (current !== audio) return;
      current = null;
      currentCue = null;
      if (pending && unlocked && visible) {
        const next = pending;
        pending = null;
        start(next);
      }
    };
    current = audio;
    currentCue = cue;
    void audio.play().catch((error: unknown) => {
      if (disposed) return;
      console.warn('Plinth narration could not play:', error);
      if (current === audio) {
        current = null;
        currentCue = null;
        pending = cue;
      }
    });
  };
  return {
    offer(cue: NarrationCue | null) {
      if (!cue || disposed) return;
      if (!unlocked || !visible) {
        if (!pending || cue.priority >= pending.priority) pending = cue;
        return;
      }
      if (current && currentCue) {
        if (cue.priority < currentCue.priority) {
          if (!pending || cue.priority >= pending.priority) pending = cue;
          return;
        }
        current.pause();
        current.onended = null;
        current = null;
        currentCue = null;
        if (pending && pending.priority <= cue.priority) pending = null;
      }
      start(cue);
    },
    unlock() {
      if (disposed || !visible) return;
      unlocked = true;
      if (current?.paused)
        void current
          .play()
          .catch((error: unknown) =>
            console.warn('Plinth narration could not resume:', error),
          );
      else if (!current && pending) {
        const next = pending;
        pending = null;
        start(next);
      }
    },
    setVisible(value: boolean) {
      visible = value;
      if (!value) current?.pause();
      else if (unlocked && current?.paused)
        void current
          .play()
          .catch((error: unknown) =>
            console.warn('Plinth narration could not resume:', error),
          );
    },
    state: () => ({
      playing: currentCue?.clip ?? null,
      queued: pending?.clip ?? null,
    }),
    dispose() {
      disposed = true;
      current?.pause();
      if (current) current.onended = null;
      current = null;
      currentCue = null;
      pending = null;
    },
  };
}
