import { defaultControlRecording } from './control-sound-defaults';
import { createRecordedEffects } from './recorded-effects';

/**
 * The mechanical sounds of controls and devices: recorded control clicks
 * and Web Audio one-shots for every kind of part. Create after a user
 * gesture.
 */

export type ControlSound =
  | 'button'
  | 'key'
  | 'toggle'
  | 'rocker'
  | 'key-switch'
  | 'selector'
  | 'locked'
  | 'knob'
  | 'slide'
  | 'handwheel'
  | 'isolator'
  | 'mushroom'
  | 'handle'
  | 'trip'
  | 'pull-in'
  | 'drop-out'
  | 'blow'
  | 'bulge'
  | 'vent';

interface Click {
  /** Band of the noise burst, Hz, and how narrow it is. */
  band: number;
  q: number;
  /** Seconds for the burst to die away. */
  decay: number;
  level: number;
  /** A low thump under the click: frequency and decay, or none. */
  thump?: [number, number];
  /** Repeated clicks, as a ratchet or a run of detents: count and gap. */
  repeat?: [number, number];
  /** A slow scrape instead of a snap: noise swept over this many seconds. */
  sweep?: number;
}

/** What each kind of control sounds like. */
export const controlSounds: Record<ControlSound, Click> = {
  // A soft mushroom thump with a small switch click in it.
  button: { band: 2600, q: 2, decay: 0.03, level: 0.45, thump: [95, 0.06] },
  // A light plastic tick.
  key: { band: 3800, q: 3, decay: 0.018, level: 0.35 },
  // A hard bat-handle snap.
  toggle: { band: 4200, q: 1.5, decay: 0.025, level: 0.7, thump: [180, 0.03] },
  // A heavier clack with some body.
  rocker: { band: 2200, q: 1.2, decay: 0.04, level: 0.7, thump: [120, 0.06] },
  // A small metallic ratchet: the lock turning.
  'key-switch': {
    band: 5200,
    q: 4,
    decay: 0.012,
    level: 0.45,
    repeat: [3, 0.035],
  },
  // A detent clunk as a selector clicks over.
  selector: { band: 1600, q: 2, decay: 0.035, level: 0.6, thump: [140, 0.05] },
  // A locked selector rattling against its stop.
  locked: {
    band: 900,
    q: 3,
    decay: 0.02,
    level: 0.5,
    repeat: [2, 0.05],
    thump: [80, 0.04],
  },
  // One faint detent.
  knob: { band: 3000, q: 4, decay: 0.012, level: 0.25 },
  // A short scrape and a click.
  slide: { band: 2400, q: 1, decay: 0.03, level: 0.35, sweep: 0.06 },
  // The valve's spindle squeaking round in its gland.
  handwheel: {
    band: 1300,
    q: 8,
    decay: 0.08,
    level: 0.35,
    repeat: [5, 0.16],
    sweep: 0.12,
  },
  // A heavy industrial clunk.
  isolator: { band: 700, q: 1.2, decay: 0.09, level: 0.9, thump: [60, 0.14] },
  // A mushroom head struck home, or pulled back with a snap.
  mushroom: { band: 1900, q: 1.4, decay: 0.05, level: 0.75, thump: [90, 0.08] },
  // A breaker's operating handle: a stiff lever and a heavy mechanism.
  handle: { band: 900, q: 1.1, decay: 0.08, level: 0.9, thump: [70, 0.12] },
  // A breaker or overload tripping: a sharp spring-loaded snap.
  trip: { band: 3600, q: 1.2, decay: 0.035, level: 0.95, thump: [150, 0.05] },
  // A contactor pulling in: a solid clunk; and the lighter clack out.
  'pull-in': { band: 1100, q: 1.3, decay: 0.06, level: 0.85, thump: [85, 0.1] },
  'drop-out': {
    band: 2000,
    q: 1.5,
    decay: 0.04,
    level: 0.6,
    thump: [130, 0.05],
  },
  // A fuse blowing: a flat pop.
  blow: { band: 1500, q: 0.7, decay: 0.05, level: 1, thump: [110, 0.06] },
  // An electrolytic's can bulging: a small tick.
  bulge: { band: 5000, q: 6, decay: 0.01, level: 0.3, repeat: [2, 0.09] },
  // A capacitor venting: a bang and a hiss of escaping electrolyte.
  vent: {
    band: 800,
    q: 0.5,
    decay: 0.35,
    level: 1,
    thump: [55, 0.25],
    sweep: 0.05,
  },
};

export function createControlSounds(context: BaseAudioContext) {
  const output = context.createGain();
  const recordings = createRecordedEffects(context, output);
  void recordings
    .preload()
    .catch((error) => console.warn('Control recordings unavailable.', error));
  output.gain.value = 0.8;
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const burst = (click: Click, at: number) => {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = 0.8 + Math.random() * 0.4;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = click.band * (0.94 + Math.random() * 0.12);
    band.Q.value = click.q;
    const envelope = context.createGain();
    const length = (click.sweep ?? 0) + click.decay;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(
      click.level,
      at + (click.sweep ?? 0.002),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    if (click.sweep)
      band.frequency.exponentialRampToValueAtTime(
        click.band * 1.6,
        at + length,
      );
    source.connect(band).connect(envelope).connect(output);
    source.start(at, Math.random() * 0.5);
    source.stop(at + length + 0.02);
    if (click.thump) {
      const [hz, decay] = click.thump;
      const thump = context.createOscillator();
      thump.frequency.setValueAtTime(hz * 1.6, at);
      thump.frequency.exponentialRampToValueAtTime(hz, at + decay);
      const gain = context.createGain();
      gain.gain.setValueAtTime(click.level * 0.8, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      thump.connect(gain).connect(output);
      thump.start(at);
      thump.stop(at + decay + 0.02);
    }
  };

  return {
    output: output as AudioNode,
    /** One control's sound, now. */
    play(kind: ControlSound) {
      const recording = defaultControlRecording(kind);
      if (recording) {
        void recordings.play(recording, 1, 0);
        return;
      }
      const click = controlSounds[kind];
      const at = context.currentTime + 0.005;
      const [count, gap] = click.repeat ?? [1, 0];
      for (let i = 0; i < count; i++)
        burst(
          { ...click, level: click.level * (1 - i * 0.12) },
          at + i * gap * (0.85 + Math.random() * 0.3),
        );
    },
    dispose() {
      recordings.dispose();
      output.disconnect();
    },
  };
}

export type ControlSounds = ReturnType<typeof createControlSounds>;
