import { tone } from './part-audio';

/** A coarse single-pitch pulse like an old computer's small speaker. */
export const bootBeep = (hz: number) =>
  tone({ hz, seconds: 0.16, level: 0.012, type: 'sawtooth' });
