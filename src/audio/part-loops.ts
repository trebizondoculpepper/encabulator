/**
 * State sounds for panel parts: a sound held for as long as a part's state
 * calls for it (see `PartSounds.state` in `src/game/world/components.ts`).
 * Each part holds at most one at a time, keyed by the part; switching a
 * part's sound fades the old one out and the new one in. The sounds are
 * synthesised, quiet, and named:
 *
 * - `mains hum`: a transformer or breaker carrying load, 60 Hz (the
 *   American mains) and its harmonics;
 * - `neon buzz`: a mains neon or lamp ballast, a thin 120 Hz rasp;
 * - `relay hold`: a relay or contactor coil holding in, a 120 Hz buzz;
 * - `motor hum`: an induction motor running, its 120 Hz magnetic hum
 *   and the hiss of its cooling fan.
 *
 * Browsers allow sound only after a gesture: call `unlock` from one.
 */

export type PartLoop = 'mains hum' | 'neon buzz' | 'relay hold' | 'motor hum';

export const PART_LOOPS: readonly PartLoop[] = [
  'mains hum',
  'neon buzz',
  'relay hold',
  'motor hum',
];

interface Voice {
  sound: string;
  gain: GainNode;
  stop(): void;
}

const FADE_SECONDS = 0.08;

export function createPartLoops() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  /** What each part should be holding, whether or not sound has started. */
  const wanted = new Map<string, string | null>();
  const voices = new Map<string, Voice>();

  const build = (sound: string, ctx: AudioContext, out: AudioNode) => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    const nodes: AudioScheduledSourceNode[] = [];
    const tone = (type: OscillatorType, hz: number, level: number) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start();
      nodes.push(osc);
    };
    let level = 0;
    if (sound === 'mains hum') {
      tone('sine', 60, 0.7);
      tone('sine', 120, 0.35);
      tone('sine', 180, 0.08);
      level = 0.05;
    } else if (sound === 'neon buzz') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 120;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1800;
      band.Q.value = 3;
      osc.connect(band).connect(gain);
      osc.start();
      nodes.push(osc);
      level = 0.03;
    } else if (sound === 'relay hold') {
      tone('triangle', 120, 1);
      level = 0.014;
    } else if (sound === 'motor hum') {
      tone('sine', 120, 0.8);
      tone('sine', 240, 0.25);
      tone('sawtooth', 360, 0.04);
      // The fan: noise through a soft band.
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const fan = ctx.createBufferSource();
      fan.buffer = noise;
      fan.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900;
      band.Q.value = 0.7;
      const fanLevel = ctx.createGain();
      fanLevel.gain.value = 0.5;
      fan.connect(band).connect(fanLevel).connect(gain);
      fan.start();
      nodes.push(fan);
      level = 0.05;
    } else {
      console.warn(`No state sound called "${sound}".`);
    }
    gain.gain.setTargetAtTime(level, ctx.currentTime, FADE_SECONDS);
    return {
      sound,
      gain,
      stop() {
        gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_SECONDS);
        const end = ctx.currentTime + FADE_SECONDS * 6;
        for (const node of nodes) node.stop(end);
        window.setTimeout(() => gain.disconnect(), FADE_SECONDS * 6000 + 50);
      },
    };
  };

  /** Bring a part's voice in line with the sound it should hold. */
  const sync = (part: string) => {
    if (!context || !master) return;
    const sound = wanted.get(part) ?? null;
    const voice = voices.get(part);
    if (voice?.sound === sound) return;
    voice?.stop();
    voices.delete(part);
    if (sound) voices.set(part, build(sound, context, master));
  };

  return {
    /** Start sound; call from a click or key press. */
    async unlock() {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(context.destination);
        for (const part of wanted.keys()) sync(part);
      }
      if (context.state === 'suspended') await context.resume();
    },
    /** What `part` should hold now: a sound's name, or nothing. */
    hold(part: string, sound: string | null) {
      wanted.set(part, sound);
      sync(part);
    },
    setMuted(value: boolean) {
      muted = value;
      if (master && context)
        master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 0.03);
    },
    /** Silence everything while the room is hidden. */
    setVisible(visible: boolean) {
      if (!context) return;
      if (visible) void context.resume();
      else void context.suspend();
    },
    dispose() {
      for (const voice of voices.values()) voice.stop();
      voices.clear();
      void context?.close();
      context = null;
    },
  };
}

export type PartLoops = ReturnType<typeof createPartLoops>;
