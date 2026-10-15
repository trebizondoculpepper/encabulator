/**
 * Room ambience for the plinths: a quiet, other-worldly loop at each
 * exhibit, heard only near it. The three are made to be unlike one another
 * and to have nothing to do with their shapes:
 *
 * - `glass`: a struck-glass shimmer, inharmonic partials over 196 Hz that
 *   swell and fade at their own slow rates, never in step;
 * - `throb`: a low, slowly beating drone with a thin, wavering whistle
 *   high above it, like a distant station drifting in and out;
 * - `breath`: noise through narrow, resonant bands that slide slowly
 *   between pitches, a wind blowing over the mouth of something vast.
 *
 * Each is placed where its plinth stands (`PannerNode`, HRTF) and fades
 * linearly to nothing at `HEARD_WITHIN` metres, so in the dark between the
 * plinths the room is silent. Positions are in metres.
 *
 * Browsers allow sound only after a gesture: call `unlock` from one.
 */

export type DroneKind = 'glass' | 'throb' | 'breath';

/** Full level within this distance, metres. */
const NEAR = 1.5;
/** Silent beyond this distance, metres. */
export const HEARD_WITHIN = 9;

interface Source {
  kind: DroneKind;
  x: number;
  y: number;
  z: number;
}

/** A slow, endless wobble of an `AudioParam` round its value. */
const wobble = (
  ctx: BaseAudioContext,
  param: AudioParam,
  hz: number,
  depth: number,
  nodes: AudioScheduledSourceNode[],
) => {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = hz;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start();
  nodes.push(lfo);
};

const noiseBuffer = (ctx: BaseAudioContext, seconds: number) => {
  const buffer = ctx.createBuffer(
    1,
    Math.round(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

/** Build one drone into `out`; returns the sources to stop it. */
export function buildDrone(
  kind: DroneKind,
  ctx: BaseAudioContext,
  out: AudioNode,
): AudioScheduledSourceNode[] {
  const nodes: AudioScheduledSourceNode[] = [];
  const voice = (
    type: OscillatorType,
    hz: number,
    level: number,
    swellHz = 0,
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = level;
    if (swellHz) wobble(ctx, g.gain, swellHz, level * 0.9, nodes);
    osc.connect(g).connect(out);
    osc.start();
    nodes.push(osc);
    return osc;
  };

  if (kind === 'glass') {
    // A glass bowl's partials: not a harmonic series, so no chord, and
    // each swelling at a rate the others never share.
    const base = 196;
    const partials: [number, number, number][] = [
      [1, 0.5, 0.071],
      [2.32, 0.3, 0.053],
      [4.25, 0.18, 0.037],
      [6.63, 0.1, 0.029],
      [9.38, 0.06, 0.023],
    ];
    for (const [ratio, level, swell] of partials) {
      const osc = voice('sine', base * ratio, level, swell);
      // A slight, slow detune: the shimmer of the glass.
      wobble(ctx, osc.detune, swell * 1.7, 6, nodes);
    }
  } else if (kind === 'throb') {
    // Two low tones a breath apart beat slowly against each other ...
    voice('sine', 55, 0.55);
    voice('sine', 55.35, 0.55);
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 260;
    body.Q.value = 4;
    wobble(ctx, body.frequency, 0.05, 120, nodes);
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = 82.5;
    const sawLevel = ctx.createGain();
    sawLevel.gain.value = 0.12;
    saw.connect(body).connect(sawLevel).connect(out);
    saw.start();
    nodes.push(saw);
    // ... under a thin whistle that drifts in pitch and in and out.
    const whistle = voice('sine', 1318, 0.035, 0.083);
    wobble(ctx, whistle.frequency, 5.2, 7, nodes);
    wobble(ctx, whistle.detune, 0.031, 180, nodes);
  } else {
    // Wind over a great mouth: noise through narrow bands that slide.
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 4);
    noise.loop = true;
    noise.start();
    nodes.push(noise);
    const bands: [number, number, number, number][] = [
      // centre Hz, slide Hz, slide rate, level
      [310, 60, 0.043, 2.2],
      [465, 90, 0.029, 1.6],
      [1240, 260, 0.061, 0.7],
    ];
    for (const [centre, slide, rate, level] of bands) {
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = centre;
      band.Q.value = 28;
      wobble(ctx, band.frequency, rate, slide, nodes);
      const g = ctx.createGain();
      g.gain.value = level;
      wobble(ctx, g.gain, rate * 2.3, level * 0.7, nodes);
      noise.connect(band).connect(g).connect(out);
    }
  }
  return nodes;
}

/**
 * How loud each drone is close up, before distance: measured to about
 * -33 dBFS RMS for the glass and the breath, and -29 for the throb, whose
 * low notes sound quieter than they measure. Room ambience, not a feature.
 */
export const LEVELS: Record<DroneKind, number> = {
  glass: 0.043,
  throb: 0.072,
  breath: 0.38,
};

export function createPlinthDrones(sources: readonly Source[]) {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let stops: AudioScheduledSourceNode[] = [];
  let visible = true;

  const start = (ctx: BaseAudioContext, out: AudioNode) => {
    for (const source of sources) {
      const panner = new PannerNode(ctx, {
        panningModel: 'HRTF',
        distanceModel: 'linear',
        refDistance: NEAR,
        maxDistance: HEARD_WITHIN,
        rolloffFactor: 1,
        positionX: source.x,
        positionY: source.y,
        positionZ: source.z,
      });
      const level = ctx.createGain();
      level.gain.value = LEVELS[source.kind];
      level.connect(panner).connect(out);
      stops.push(...buildDrone(source.kind, ctx, level));
    }
  };

  return {
    /** Start sound; call from a click or key press. */
    async unlock() {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0;
        master.gain.setTargetAtTime(1, context.currentTime, 1.5);
        master.connect(context.destination);
        start(context, master);
      }
      if (visible && context.state === 'suspended') await context.resume();
    },
    /** Where the listener stands (metres) and which way they look. */
    listen(
      x: number,
      y: number,
      z: number,
      fx: number,
      fy: number,
      fz: number,
    ) {
      if (!context) return;
      const l = context.listener;
      const t = context.currentTime;
      l.positionX.setTargetAtTime(x, t, 0.05);
      l.positionY.setTargetAtTime(y, t, 0.05);
      l.positionZ.setTargetAtTime(z, t, 0.05);
      l.forwardX.setTargetAtTime(fx, t, 0.05);
      l.forwardY.setTargetAtTime(fy, t, 0.05);
      l.forwardZ.setTargetAtTime(fz, t, 0.05);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    },
    /** Whether sound has started: 'locked' until a gesture unlocks it. */
    state: (): AudioContextState | 'locked' => context?.state ?? 'locked',
    /** Silence everything while the room is hidden. */
    setVisible(value: boolean) {
      visible = value;
      if (!context) return;
      if (value) void context.resume();
      else void context.suspend();
    },
    dispose() {
      for (const node of stops) node.stop();
      stops = [];
      master?.disconnect();
      void context?.close();
      context = null;
    },
  };
}

export type PlinthDrones = ReturnType<typeof createPlinthDrones>;
