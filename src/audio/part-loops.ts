import type { LoopRecipe } from './part-audio';

/**
 * State sounds for parts: sounds a part holds for as long as its state
 * calls for them (`partAudio.hold`). Each is a recipe the part that
 * makes it imports and holds; nothing chooses them by name. They are
 * synthesised and quiet:
 *
 * - `MAINS_HUM`: a transformer or breaker carrying load, 60 Hz (the
 *   American mains) and its harmonics;
 * - `NEON_BUZZ`: a mains neon or lamp ballast, a thin 120 Hz rasp;
 * - `RELAY_HOLD`: a relay or contactor coil holding in, a 120 Hz buzz;
 * - `MOTOR_HUM`: an induction motor running, its 120 Hz magnetic hum
 *   and the hiss of its cooling fan.
 */

/** Tones at `hz`, each at its level, under one gain. */
const tones =
  (level: number, partials: [OscillatorType, number, number][]): LoopRecipe =>
  (context, out) => {
    const gain = context.createGain();
    gain.gain.value = level;
    gain.connect(out);
    return partials.map(([type, hz, share]) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      const g = context.createGain();
      g.gain.value = share;
      osc.connect(g).connect(gain);
      osc.start();
      return osc;
    });
  };

export const MAINS_HUM: LoopRecipe = tones(0.05, [
  ['sine', 60, 0.7],
  ['sine', 120, 0.35],
  ['sine', 180, 0.08],
]);

export const RELAY_HOLD: LoopRecipe = tones(0.014, [['triangle', 120, 1]]);

export const NEON_BUZZ: LoopRecipe = (context, out) => {
  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 120;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 3;
  const gain = context.createGain();
  gain.gain.value = 0.03;
  osc.connect(band).connect(gain).connect(out);
  osc.start();
  return [osc];
};

export const MOTOR_HUM: LoopRecipe = (context, out) => {
  const hum = tones(0.05, [
    ['sine', 120, 0.8],
    ['sine', 240, 0.25],
    ['sawtooth', 360, 0.04],
  ])(context, out);
  // The fan: noise through a soft band.
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const fan = context.createBufferSource();
  fan.buffer = noise;
  fan.loop = true;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 0.7;
  const level = context.createGain();
  level.gain.value = 0.025;
  fan.connect(band).connect(level).connect(out);
  fan.start();
  return [...hum, fan];
};
