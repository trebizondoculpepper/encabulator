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
  new URL('./assets/narration/plinths/clip_32.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_33.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_34.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_35.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_36.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_37.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_38.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_39.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_40.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_41.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_42.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_43.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_44.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_45.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_46.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_47.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_48.mp3', import.meta.url),
  new URL('./assets/narration/plinths/clip_49.mp3', import.meta.url),
];

const INTRO_PARTS = [29, 32, 33];
const INTRO_PAUSE_MS = 4500;
const SAME_SHAPE_PAUSE_MS = 5000;

/** One narrator voice. New arrivals can interrupt less immediate lines. */
export function createPlinthNarrationPlayer() {
  let unlocked = false;
  let visible = true;
  let current: HTMLAudioElement | null = null;
  let currentCue: NarrationCue | null = null;
  let pending: NarrationCue | null = null;
  let disposed = false;
  let introRemaining: number[] = [];
  let introTimer: ReturnType<typeof setTimeout> | null = null;
  let shapeTimer: ReturnType<typeof setTimeout> | null = null;
  const clearShapePause = () => {
    if (shapeTimer !== null) clearTimeout(shapeTimer);
    shapeTimer = null;
  };
  const clearIntro = () => {
    if (introTimer !== null) clearTimeout(introTimer);
    introTimer = null;
    introRemaining = [];
  };
  const scheduleIntro = () => {
    if (!visible || !unlocked || introTimer !== null || !introRemaining.length)
      return;
    introTimer = setTimeout(() => {
      introTimer = null;
      if (!visible || disposed) return;
      const clip = introRemaining.shift();
      if (clip) start({ clip, priority: 4 });
    }, INTRO_PAUSE_MS);
  };
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
      if (pending) {
        clearIntro();
        if (unlocked && visible) {
          if (cue.shape && pending.shape === cue.shape) {
            shapeTimer = setTimeout(() => {
              shapeTimer = null;
              if (!visible || disposed || !pending) return;
              const next = pending;
              pending = null;
              start(next);
            }, SAME_SHAPE_PAUSE_MS);
            return;
          }
          const next = pending;
          pending = null;
          start(next);
        }
      } else if (INTRO_PARTS.includes(cue.clip)) scheduleIntro();
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
      if (shapeTimer !== null) {
        if (pending && cue.shape === pending.shape) {
          if (cue.priority >= pending.priority) pending = cue;
          return;
        }
        clearShapePause();
        pending = null;
      }
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
      if (cue.clip === 29) introRemaining = INTRO_PARTS.slice(1);
      else if (introRemaining.length || introTimer !== null) clearIntro();
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
      else if (!current && pending && shapeTimer === null) {
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
      else if (value && !current && pending && shapeTimer === null) {
        const next = pending;
        pending = null;
        start(next);
      } else if (value && !current) scheduleIntro();
    },
    state: () => ({
      playing: currentCue?.clip ?? null,
      queued: pending?.clip ?? null,
      introActive:
        INTRO_PARTS.includes(currentCue?.clip ?? 0) ||
        pending?.clip === 29 ||
        introRemaining.length > 0,
    }),
    dispose() {
      disposed = true;
      clearIntro();
      clearShapePause();
      current?.pause();
      if (current) current.onended = null;
      current = null;
      currentCue = null;
      pending = null;
    },
  };
}
