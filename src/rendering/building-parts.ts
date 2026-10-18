import { computed, effect, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { click, partAudio, recording, tone } from '../audio/part-audio';
import type { SoundRecipe } from '../audio/part-audio';
import { largeDoorMovement } from '../audio/door-sounds';
import {
  ALARM_BUZZER,
  CRACKLE,
  EXTRACT_FAN,
  FIRE_BELL,
  FIRE_SOUNDER,
  WATER_SPRAY,
} from '../audio/part-loops';
import type {
  Binding,
  PartEvent,
  PartListener,
  Readable,
} from '../game/world/components';
import {
  createAccessDoor,
  createAcCassette,
  createAcController,
  createAlarmReset,
  createBinFire,
  createCeilingSpeaker,
  createFireBell,
  createCallPoint,
  createDimmerPlate,
  createDistributionBoard,
  createEmergencyLight,
  createExitSign,
  createExtinguisher,
  createExtractorFan,
  createFirePanel,
  createFloorBox,
  createFusedSpur,
  createHeldFireDoor,
  createIntercom,
  createKeyPlate,
  createOccupancySensor,
  createOverDoorLight,
  createPullSwitch,
  createRadiator,
  createRockerPlate,
  createSmokeDetector,
  createSounderBeacon,
  createSprinklerHead,
  createThermostat,
  createToiletAlarm,
  createTwinSocket,
  createValveSet,
  createWindowWithVent,
} from '../scene/building-fittings';
import type { ExtinguisherKind, PanelLamps } from '../scene/building-fittings';
import type { PanelKit } from '../scene/eighties-controls';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * Building fittings as parts (see `parts.ts`): each brings its look (the
 * views in `src/scene/building-fittings.ts`), what a click on it does and
 * its own sounds, and is bound to a world model (dev8's is
 * `src/game/building-services.ts`) by its props. None decides anything
 * for itself that the building would decide: a light switch only throws
 * its switch, and the model says whether the lights come on.
 */

// ---- Sounds ------------------------------------------------------------------

const asset = (file: string) =>
  new URL(`../audio/assets/${file}`, import.meta.url);
const ROCKER = recording(asset('rocker-click.wav'), 0.08);
const PRESS = recording(asset('button-press.wav'), 0.07);
const DETENT = recording(asset('switch-click.wav'), 0.05);
const DOOR_OPEN = largeDoorMovement;
const DOOR_SHUT = largeDoorMovement;
const KEY_TURN = click({
  band: 5200,
  q: 4,
  decay: 0.012,
  level: 0.45,
  repeat: [3, 0.035],
});
const LOCKED = click({
  band: 900,
  q: 3,
  decay: 0.02,
  level: 0.5,
  repeat: [2, 0.05],
  thump: [80, 0.04],
});
const CALL_POINT = click({
  band: 1600,
  q: 1.2,
  decay: 0.04,
  level: 0.6,
  thump: [110, 0.06],
});
const CORD = click({ band: 2600, q: 2, decay: 0.02, level: 0.4 });
const LID = click({ band: 1000, q: 1.5, decay: 0.04, level: 0.4 });
const BREAKER = click({
  band: 3200,
  q: 1.4,
  decay: 0.03,
  level: 0.7,
  thump: [140, 0.04],
});
const HANDWHEEL = click({
  band: 700,
  q: 1,
  decay: 0.06,
  level: 0.6,
  repeat: [4, 0.09],
  thump: [60, 0.08],
});
const PIN = click({ band: 4200, q: 3, decay: 0.02, level: 0.5 });
const MAGLOCK = click({
  band: 1200,
  q: 2,
  decay: 0.03,
  level: 0.5,
  thump: [90, 0.05],
});
const BEEP = tone({ hz: 2700, seconds: 0.08, level: 0.04 });
const ERROR = tone({ hz: 420, seconds: 0.25, level: 0.05, type: 'sawtooth' });
/** A sprinkler head's glass bulb bursting. */
const BULB = click({
  band: 5200,
  q: 1.5,
  decay: 0.03,
  level: 0.7,
  thump: [300, 0.03],
});
/** The voice alarm's alert tone: a second on, a second off, three times. */
const ALERT_TONE = tone({
  hz: 970,
  seconds: 1,
  level: 0.05,
  type: 'triangle',
  repeat: [3, 1],
});
/**
 * The voice alarm's messages, a calm British voice (`CREDITS.md`). Their
 * paths are written out in full so the build bundles them: a path built at
 * run time from a folder below `assets/` is left out.
 */
const ALERT = recording(
  new URL('../audio/assets/voice-alarm/va-alert.mp3', import.meta.url),
  0.9,
);
const EVACUATE = recording(
  new URL('../audio/assets/voice-alarm/va-evacuate.mp3', import.meta.url),
  0.9,
);
const FALSE_ALARM = recording(
  new URL('../audio/assets/voice-alarm/va-false-alarm.mp3', import.meta.url),
  0.9,
);
const ALL_CLEAR = recording(
  new URL('../audio/assets/voice-alarm/va-all-clear.mp3', import.meta.url),
  0.9,
);
const CHIME = tone({
  hz: 880,
  seconds: 0.35,
  level: 0.05,
  type: 'sine',
  repeat: [2, 0.12],
});

/** A part's own events, for its sounds and its listeners. */
function emitter() {
  const listeners = new Set<PartListener>();
  return {
    onEvent(listener: PartListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: PartEvent) {
      for (const listener of listeners) listener(event, undefined);
    },
  };
}

/** Play `sound` from `part` now, outside its event sounds. */
const play = (sound: SoundRecipe, from: Part['object']) =>
  partAudio.play(sound, from);

/** Keep a view showing values from the model, as they change. */
function show(a: ReturnType<typeof beginPart>, render: () => void) {
  a.disposers.push(effect(render));
}

// ---- Lighting ----------------------------------------------------------------

/** A plate switch of one rocker per gang, each throwing its binding. */
export function lightSwitch(
  kit: PanelKit,
  props: { name?: string; gangs: Binding<boolean>[] },
): Part {
  const a = beginPart(kit, props.name ?? 'light switch');
  const view = createRockerPlate(kit, props.gangs.length);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  view.rockers.forEach((rocker, i) => {
    const bound = props.gangs[i];
    a.uses.set(rocker.mesh, () => {
      bound.set(!bound.value);
      e.emit(bound.value ? 'on' : 'off');
    });
  });
  show(a, () => view.rockers.forEach((r, i) => r.set(props.gangs[i].value)));
  return a.part();
}

/** A rotary dimmer: a click on its left half dims, its right brightens. */
export function dimmer(
  kit: PanelKit,
  props: { name?: string; bound: Binding<number> },
): Part {
  const a = beginPart(kit, props.name ?? 'dimmer');
  const view = createDimmerPlate(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.knob, (direction = 1) => {
    const next = Math.max(0, Math.min(10, props.bound.value + direction));
    if (next === props.bound.value) return e.emit('end-stop');
    props.bound.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.bound.value));
  return a.part();
}

/** A ceiling pull-cord switch, hanging from y = 0. */
export function pullCordSwitch(
  kit: PanelKit,
  props: { name?: string; bound: Binding<boolean> },
): Part {
  const a = beginPart(kit, props.name ?? 'pull-cord switch');
  const view = createPullSwitch(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: CORD, off: CORD });
  a.uses.set(view.bobble, () => {
    view.pull();
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  a.updates.push(view.update);
  return a.part();
}

/** A key switch plate, as for the emergency lighting test. */
export function keyPlate(
  kit: PanelKit,
  props: { name?: string; legend: string; bound: Binding<boolean> },
): Part {
  const a = beginPart(kit, props.name ?? `${props.legend} key switch`);
  const view = createKeyPlate(kit, props.legend);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: KEY_TURN, off: KEY_TURN });
  a.uses.set(view.key, () => {
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  show(a, () => view.set(props.bound.value));
  return a.part();
}

/** A ceiling occupancy sensor, its LED lit while it sees someone. */
export function occupancySensor(
  kit: PanelKit,
  props: { occupied: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'occupancy sensor');
  const view = createOccupancySensor(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.occupied.value));
  return a.part();
}

/** A non-maintained emergency light on the ceiling. */
export function emergencyLight(
  kit: PanelKit,
  props: { lit: Readable<boolean>; charging: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'emergency light');
  const view = createEmergencyLight(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.lit.value, props.charging.value));
  return a.part();
}

/** A maintained exit sign. */
export function exitSign(
  kit: PanelKit,
  props: { level: Readable<number> },
): Part {
  const a = beginPart(kit, 'exit sign');
  const view = createExitSign(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.level.value));
  return a.part();
}

// ---- Fire --------------------------------------------------------------------

/** A resettable call point: press its face; reset it with its key. */
export function callPoint(
  kit: PanelKit,
  props: {
    latched: Readable<boolean>;
    press: () => void;
    reset: () => void;
  },
): Part {
  const a = beginPart(kit, 'manual call point');
  const view = createCallPoint(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CALL_POINT, release: KEY_TURN, refused: LOCKED });
  a.uses.set(view.face, () => {
    if (props.latched.value) return e.emit('refused');
    props.press();
    e.emit('press');
  });
  a.uses.set(view.key, () => {
    props.reset();
    e.emit('release');
  });
  show(a, () => view.set(props.latched.value));
  return a.part();
}

/** A sounder-beacon; `voice` gives it the sounder's sound. */
export function sounderBeacon(
  kit: PanelKit,
  props: {
    sounding: Readable<boolean>;
    voice?: boolean;
    /** A voice-alarm sequence can pause the tone while speech plays. */
    tone?: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, 'sounder-beacon');
  const view = createSounderBeacon(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.sounding.value));
  a.updates.push(view.update);
  if (props.voice !== false)
    a.holdWhile(props.tone ?? props.sounding, FIRE_SOUNDER);
  return a.part();
}

/** An optical smoke detector, showing the model's alarm. */
export function smokeDetector(
  kit: PanelKit,
  props: { alarm: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'smoke detector');
  const view = createSmokeDetector(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.alarm.value));
  a.updates.push(view.update);
  return a.part();
}

/**
 * The fire alarm panel. Its controls work only at access level 2: with
 * its red key turned, or after the numbered keys; it beeps when one works
 * and buzzes an error when it refuses. The red button silences the
 * sounders, or resounds them (EVACUATE) once silenced or when quiet; the
 * green resets; the white silences the panel's own buzzer, which sounds
 * while there is a fire not yet silenced; key 2 leaves access mode and
 * key 4 tests the lamps.
 */
export function firePanel(
  kit: PanelKit,
  props: {
    lamps: Readable<PanelLamps>;
    key: Binding<boolean>;
    silence: () => boolean;
    reset: () => boolean;
    evacuate: () => boolean;
  },
): Part {
  const a = beginPart(kit, 'fire alarm panel');
  const view = createFirePanel(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: BEEP, refused: ERROR, on: KEY_TURN, off: KEY_TURN });
  const buzzerMuted = signal(false);
  const button = (
    mesh: Part['object']['children'][number],
    act: () => boolean,
  ) =>
    a.uses.set(mesh, () => {
      play(PRESS, a.object);
      e.emit(act() ? 'press' : 'refused');
    });
  button(view.silenceBuzzer, () => {
    buzzerMuted.value = true;
    return true;
  });
  button(view.silenceResound, () => {
    const lamps = props.lamps.value;
    return lamps.alarm && !lamps.silenced ? props.silence() : props.evacuate();
  });
  button(view.reset, () => {
    const done = props.reset();
    if (done) buzzerMuted.value = false;
    return done;
  });
  // The numbered keys: 2 leaves access mode, 4 tests the lamps; 1 and 3
  // (override delays, next option) have nothing to do on this system.
  view.keys.forEach((mesh, i) =>
    button(mesh, () => {
      if (i === 1) {
        props.key.set(false);
        return true;
      }
      if (i === 3) {
        view.lampTest();
        return true;
      }
      return false;
    }),
  );
  const turnKey = () => {
    props.key.set(!props.key.value);
    e.emit(props.key.value ? 'on' : 'off');
  };
  a.uses.set(view.key, turnKey);
  for (const child of view.keyHead.children) a.uses.set(child, turnKey);
  show(a, () => view.set(props.lamps.value));
  a.updates.push(view.update);
  a.holdWhile(
    computed(
      () =>
        props.lamps.value.fire &&
        !props.lamps.value.silenced &&
        !buzzerMuted.value,
    ),
    ALARM_BUZZER,
  );
  return a.part();
}

/**
 * A pendant sprinkler head: its glass bulb bursts with a pop when the
 * model says it has, and it sprays while water reaches it; `voice` gives
 * it the sound of the spray.
 */
export function sprinklerHead(
  kit: PanelKit,
  props: {
    head: Readable<{ burst: boolean; spraying: boolean }>;
    voice?: boolean;
    fallDistance?: number;
  },
): Part {
  const a = beginPart(kit, 'sprinkler head');
  const view = createSprinklerHead(kit, props.fallDistance);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { trip: BULB });
  let was = false;
  show(a, () => {
    const { burst, spraying } = props.head.value;
    view.set(burst, spraying);
    if (burst && !was) e.emit('trip');
    was = burst;
  });
  a.updates.push(view.update);
  if (props.voice)
    a.holdWhile(
      computed(() => props.head.value.spraying),
      WATER_SPRAY,
    );
  return a.part();
}

/**
 * The voice alarm, heard from its ceiling speaker. In the alert stage it
 * sounds the intermittent alert tone and the alert message, every half
 * minute; in evacuation, it cues the wall sounders, alternating with the
 * evacuation message, over and over; once over, the false alarm or the
 * all-clear, after a chime. Silenced, it stops at once.
 */
export function voiceAlarm(
  kit: PanelKit,
  props: {
    voice: Readable<'alert' | 'evacuate' | null>;
    announcement: Readable<{
      kind: 'false-alarm' | 'all-clear' | null;
      n: number;
    }>;
  },
): Part & { evacuationTone: ReadonlySignal<boolean> } {
  const a = beginPart(kit, 'voice alarm');
  const view = createCeilingSpeaker(kit);
  a.object.add(view.group);
  const evacuationTone = signal(false);
  let audible = true;
  let announcementTimer: ReturnType<typeof setTimeout> | undefined;
  let stopMessage = () => {};
  let mode: 'alert' | 'evacuate' | null = null;
  let clock = 0;
  let step = 0;
  const say = (recipe: SoundRecipe) => {
    stopMessage();
    stopMessage = play(recipe, a.object);
  };
  const quiet = () => {
    stopMessage();
    evacuationTone.value = false;
    clearTimeout(announcementTimer);
  };
  show(a, () => {
    const next = props.voice.value;
    if (next === mode) return;
    mode = next;
    quiet();
    clock = 0;
    step = 0;
  });
  let heard = props.announcement.value.n;
  show(a, () => {
    const { kind, n } = props.announcement.value;
    if (!kind || n === heard) return;
    heard = n;
    if (!audible) return;
    quiet();
    say(CHIME);
    announcementTimer = setTimeout(
      () => say(kind === 'false-alarm' ? FALSE_ALARM : ALL_CLEAR),
      1200,
    );
  });
  // The sequence, step by step: [seconds to wait, what to do].
  const sequences: Record<'alert' | 'evacuate', [number, () => void][]> = {
    alert: [
      [0, () => say(ALERT_TONE)],
      [6.2, () => say(ALERT)],
      [12, () => {}],
      [12, () => {}],
    ],
    evacuate: [
      [
        0,
        () => {
          evacuationTone.value = true;
        },
      ],
      [
        5,
        () => {
          evacuationTone.value = false;
        },
      ],
      [0.6, () => say(EVACUATE)],
      [11, () => {}],
    ],
  };
  a.updates.push((delta) => {
    if (!mode || !audible) return;
    clock -= delta;
    if (clock > 0) return;
    const sequence = sequences[mode];
    const [, act] = sequence[step];
    act();
    step = (step + 1) % sequence.length;
    clock = sequence[step][0] || 0.01;
  });
  a.disposers.push(quiet);
  const part = a.part();
  return {
    ...part,
    evacuationTone,
    setAudible(on) {
      if (on === audible) return;
      audible = on;
      quiet();
      clock = 0;
      step = 0;
      part.setAudible(on);
    },
  };
}

/** An electric fire bell, ringing while water flows in the sprinklers. */
export function fireBell(
  kit: PanelKit,
  props: { ringing: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'sprinkler alarm bell');
  const view = createFireBell(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.ringing.value));
  a.updates.push(view.update);
  a.holdWhile(props.ringing, FIRE_BELL);
  return a.part();
}

/** The waste-paper bin, burning as big as the model's fire. */
export function burningBin(
  kit: PanelKit,
  props: { size: Readable<number>; smoke: Readable<number> },
): Part {
  const a = beginPart(kit, 'waste-paper bin');
  const view = createBinFire(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.size.value, props.smoke.value));
  a.updates.push(view.update);
  a.holdWhile(
    computed(() => props.size.value > 0),
    CRACKLE,
  );
  return a.part();
}

/** The sprinkler valve set: the main valve's handwheel and the reset. */
export function valveSet(
  kit: PanelKit,
  props: {
    main: Binding<boolean>;
    tripped: Readable<boolean>;
    reset: () => void;
  },
): Part {
  const a = beginPart(kit, 'sprinkler valve set');
  const view = createValveSet(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: HANDWHEEL, off: HANDWHEEL, press: PRESS });
  a.uses.set(view.wheel, () => {
    props.main.set(!props.main.value);
    e.emit(props.main.value ? 'on' : 'off');
  });
  a.uses.set(view.reset, () => {
    props.reset();
    e.emit('press');
  });
  show(a, () => view.set(props.main.value, props.tripped.value));
  return a.part();
}

/**
 * A portable extinguisher of its kind. It keeps its own state: a click
 * pulls the pin, the next discharges it for a few seconds, and once it is
 * empty a click puts a fresh one in its place.
 */
export function extinguisher(
  kit: PanelKit,
  props: { kind: ExtinguisherKind },
): Part & {
  state: ReadonlySignal<'ready' | 'unpinned' | 'discharging' | 'empty'>;
} {
  const a = beginPart(kit, `${props.kind} extinguisher`);
  const view = createExtinguisher(kit, props.kind);
  a.object.add(view.group);
  const state = signal<'ready' | 'unpinned' | 'discharging' | 'empty'>('ready');
  const e = emitter();
  a.voice(e, { release: PIN, press: PRESS, on: LID });
  let left = 0;
  a.uses.set(view.body, () => {
    if (state.value === 'ready') {
      state.value = 'unpinned';
      return e.emit('release');
    }
    if (state.value === 'unpinned') {
      state.value = 'discharging';
      left = 7;
      return e.emit('press');
    }
    if (state.value === 'empty') {
      state.value = 'ready';
      e.emit('on');
    }
  });
  a.updates.push((delta) => {
    if (state.value === 'discharging') {
      left -= delta;
      if (left <= 0) state.value = 'empty';
    }
    view.update(delta);
  });
  show(a, () => view.set(state.value));
  a.holdWhile(
    computed(() => state.value === 'discharging'),
    WATER_SPRAY,
  );
  return { ...a.part(), state };
}

/**
 * A fire door on an electromagnetic holder. Opened, it stays back against
 * the holder while the holder is energised; when the fire alarm releases
 * the holder the door swings shut on its closer. Opened with the holder
 * released, it shuts again by itself.
 */
export function heldFireDoor(
  kit: PanelKit,
  props: { held: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'fire door');
  const view = createHeldFireDoor(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: DOOR_OPEN, off: DOOR_SHUT });
  view.setTarget(true);
  let closing = 0;
  a.uses.set(view.leaf, () => {
    const open = !view.open;
    view.setTarget(open);
    closing = open && !props.held.value ? 1.5 : 0;
    e.emit(open ? 'on' : 'off');
  });
  show(a, () => {
    const held = props.held.value;
    view.setHolder(held);
    if (!held && view.open) {
      view.setTarget(false);
      e.emit('off');
    }
  });
  a.updates.push((delta) => {
    if (closing > 0) {
      closing -= delta;
      if (closing <= 0 && view.open) {
        view.setTarget(false);
        e.emit('off');
      }
    }
    view.update(delta);
  });
  return a.part();
}

// ---- Power -------------------------------------------------------------------

/** A twin switched socket, each side with a tester plugged in. */
export function twinSocket(
  kit: PanelKit,
  props: {
    left: Binding<boolean>;
    right: Binding<boolean>;
    live: Readable<{ left: boolean; right: boolean }>;
    metalclad?: boolean;
    testers?: boolean;
  },
): Part {
  const a = beginPart(kit, 'twin socket');
  const view = createTwinSocket(kit, props);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  const sides = [props.left, props.right];
  view.sides.forEach((side, i) =>
    a.uses.set(side.rocker, () => {
      sides[i].set(!sides[i].value);
      e.emit(sides[i].value ? 'on' : 'off');
    }),
  );
  show(a, () => {
    view.sides[0].set(props.left.value, props.live.value.left);
    view.sides[1].set(props.right.value, props.live.value.right);
  });
  return a.part();
}

/** A switched fused spur, its neon lit while it is live. */
export function fusedSpur(
  kit: PanelKit,
  props: { bound: Binding<boolean>; live: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'fused spur');
  const view = createFusedSpur(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  a.uses.set(view.rocker, () => {
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  show(a, () => view.set(props.bound.value, props.live.value));
  return a.part();
}

/** A floor box whose lid a click opens and shuts. */
export function floorBox(kit: PanelKit): Part {
  const a = beginPart(kit, 'floor box');
  const view = createFloorBox(kit);
  a.object.add(view.group);
  const open = signal(false);
  const e = emitter();
  a.voice(e, { on: LID, off: LID });
  a.uses.set(view.lid, () => {
    open.value = !open.value;
    e.emit(open.value ? 'on' : 'off');
  });
  show(a, () => view.set(open.value));
  return a.part();
}

/** The distribution board: its main switch and a breaker per circuit. */
export function distributionBoard(
  kit: PanelKit,
  props: { main: Binding<boolean>; circuits: [string, Binding<boolean>][] },
): Part {
  const a = beginPart(kit, 'distribution board');
  const view = createDistributionBoard(
    kit,
    props.circuits.map(([name]) => name),
  );
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: BREAKER, off: BREAKER });
  let open = false;
  const toggleCover = () => {
    open = !open;
    view.setOpen(open);
    e.emit(open ? 'on' : 'off');
  };
  a.uses.set(view.cover, toggleCover);
  a.uses.set(view.latch, toggleCover);
  const work = (bound: Binding<boolean>) => () => {
    bound.set(!bound.value);
    e.emit(bound.value ? 'on' : 'off');
  };
  a.uses.set(view.main.lever, work(props.main));
  props.circuits.forEach(([, bound], i) =>
    a.uses.set(view.breakers[i].lever, work(bound)),
  );
  show(a, () => {
    view.main.set(props.main.value);
    props.circuits.forEach(([, bound], i) => view.breakers[i].set(bound.value));
  });
  return a.part();
}

// ---- Climate -----------------------------------------------------------------

/** The air-conditioning wall controller. */
export function acController(
  kit: PanelKit,
  props: {
    power: Binding<boolean>;
    mode: Binding<number>;
    setpoint: Binding<number>;
    modes: readonly string[];
    temperature: Readable<number>;
    running: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, 'AC controller');
  const view = createAcController(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: BEEP });
  const button = (mesh: Part['object']['children'][number], act: () => void) =>
    a.uses.set(mesh, () => {
      act();
      e.emit('press');
    });
  button(view.power, () => props.power.set(!props.power.value));
  button(view.mode, () =>
    props.mode.set((props.mode.value + 1) % props.modes.length),
  );
  button(view.up, () =>
    props.setpoint.set(Math.min(30, props.setpoint.value + 0.5)),
  );
  button(view.down, () =>
    props.setpoint.set(Math.max(16, props.setpoint.value - 0.5)),
  );
  show(a, () =>
    view.set(
      props.power.value,
      props.modes[props.mode.value] ?? '',
      props.setpoint.value,
      props.temperature.value,
      props.running.value,
    ),
  );
  return a.part();
}

/** A ceiling cassette: vanes open and a whirr while it runs. */
export function acCassette(
  kit: PanelKit,
  props: { running: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'AC cassette');
  const view = createAcCassette(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.running.value));
  a.updates.push(view.update);
  a.holdWhile(props.running, EXTRACT_FAN);
  return a.part();
}

/** A dial thermostat: a click on the dial's left half turns it down 1 °C. */
export function thermostat(
  kit: PanelKit,
  props: { bound: Binding<number>; calling: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'room thermostat');
  const view = createThermostat(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.dial, (direction = 1) => {
    const next = Math.max(5, Math.min(30, props.bound.value + direction));
    if (next === props.bound.value) return e.emit('end-stop');
    props.bound.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.bound.value, props.calling.value));
  return a.part();
}

/** A radiator: its thermostatic valve's head turns 0 to 5, a click a step. */
export function radiator(
  kit: PanelKit,
  props: { valve: Binding<number>; heat: Readable<number> },
): Part {
  const a = beginPart(kit, 'radiator');
  const view = createRadiator(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.head, (direction = 1) => {
    const next = Math.max(0, Math.min(5, props.valve.value + direction));
    if (next === props.valve.value) return e.emit('end-stop');
    props.valve.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.valve.value, props.heat.value));
  return a.part();
}

/** A window: its handle opens the vent; a click on the blinds turns them. */
export function windowWithVent(
  kit: PanelKit,
  props: { vent: Binding<boolean>; blinds: Binding<boolean> },
): Part {
  const a = beginPart(kit, 'window');
  const view = createWindowWithVent(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: LID, off: LID, detent: CORD });
  const vent = () => {
    props.vent.set(!props.vent.value);
    e.emit(props.vent.value ? 'on' : 'off');
  };
  a.uses.set(view.handle, vent);
  a.uses.set(view.sash, vent);
  const blinds = () => {
    props.blinds.set(!props.blinds.value);
    e.emit('detent');
  };
  a.uses.set(view.headrail, blinds);
  for (const slat of view.slats) a.uses.set(slat, blinds);
  show(a, () => view.set(props.vent.value, props.blinds.value));
  return a.part();
}

/** A wall extractor fan, spinning and whirring while it runs. */
export function extractorFan(
  kit: PanelKit,
  props: { running: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'extractor fan');
  const view = createExtractorFan(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.running.value));
  a.updates.push(view.update);
  a.holdWhile(props.running, EXTRACT_FAN);
  return a.part();
}

// ---- Access and welfare ------------------------------------------------------

/**
 * An access controlled door: present a card at the reader, push to exit,
 * or break the green emergency release (reset with its key); then push the
 * door. Locked, the door rattles and the reader buzzes.
 */
export function accessDoor(
  kit: PanelKit,
  props: {
    locked: Readable<boolean>;
    open: Readable<boolean>;
    broken: Readable<boolean>;
    card: () => void;
    exit: () => void;
    breakGlass: () => void;
    resetGlass: () => void;
    work: () => boolean;
  },
): Part {
  const a = beginPart(kit, 'access door');
  const view = createAccessDoor(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, {
    press: BEEP,
    release: KEY_TURN,
    refused: LOCKED,
    on: DOOR_OPEN,
    off: DOOR_SHUT,
    trip: CALL_POINT,
  });
  a.uses.set(view.reader, () => {
    props.card();
    e.emit('press');
  });
  a.uses.set(view.exitButton, () => {
    play(PRESS, a.object);
    props.exit();
  });
  a.uses.set(view.release, () => {
    props.breakGlass();
    e.emit('trip');
  });
  a.uses.set(view.releaseKey, () => {
    props.resetGlass();
    e.emit('release');
  });
  a.uses.set(view.leaf, () => {
    const was = props.open.value;
    if (!props.work()) {
      play(ERROR, a.object);
      return e.emit('refused');
    }
    e.emit(was ? 'off' : 'on');
  });
  let wasLocked = true;
  show(a, () => {
    const locked = props.locked.value;
    view.set(locked, props.open.value, props.broken.value);
    if (locked !== wasLocked) play(MAGLOCK, a.object);
    wasLocked = locked;
  });
  a.updates.push(view.update);
  return a.part();
}

/** A door entry intercom: its button rings reception. */
export function intercom(kit: PanelKit): Part {
  const a = beginPart(kit, 'intercom');
  const view = createIntercom(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CHIME });
  a.uses.set(view.button, () => e.emit('press'));
  return a.part();
}

/** The accessible toilet's emergency pull cord, hanging from y = 0. */
export function toiletAlarmCord(
  kit: PanelKit,
  props: { pull: () => void },
): Part {
  const a = beginPart(kit, 'toilet alarm cord');
  const view = createToiletAlarm(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CORD });
  const pull = () => {
    view.pull();
    props.pull();
    e.emit('press');
  };
  for (const child of view.cord.children) a.uses.set(child, pull);
  a.updates.push(view.update);
  return a.part();
}

/** The toilet alarm's reset plate, which buzzes while the alarm is on. */
export function toiletAlarmReset(
  kit: PanelKit,
  props: { on: Readable<boolean>; reset: () => void },
): Part {
  const a = beginPart(kit, 'toilet alarm reset');
  const view = createAlarmReset(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: PRESS });
  a.uses.set(view.button, () => {
    props.reset();
    e.emit('press');
  });
  show(a, () => view.set(props.on.value));
  a.holdWhile(props.on, ALARM_BUZZER);
  return a.part();
}

/** The over-door light outside the accessible toilet. */
export function overDoorLight(
  kit: PanelKit,
  props: { on: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'over-door alarm light');
  const view = createOverDoorLight(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.on.value));
  a.updates.push(view.update);
  return a.part();
}
