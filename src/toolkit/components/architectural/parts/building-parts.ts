import { signal } from '@preact/signals-core';
import { click, recording } from '../../core/audio/part-audio';
import { EXTRACT_FAN } from '../../core/audio/part-loops';
import type { Binding, Readable } from '../../core/logic/world/components';
import {
  createAccessDoor,
  createAcCassette,
  createAcController,
  createDimmerPlate,
  createDistributionBoard,
  createExtractorFan,
  createFloorBox,
  createFusedSpur,
  createIntercom,
  createOccupancySensor,
  createPullSwitch,
  createRadiator,
  createRockerPlate,
  createThermostat,
  createTwinSocket,
  createWindowWithVent,
} from '../views/building-fittings';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  BEEP,
  CALL_POINT,
  CHIME,
  CORD,
  DOOR_OPEN,
  DOOR_SHUT,
  ERROR,
  KEY_TURN,
  LID,
  LOCKED,
  PRESS,
  asset,
  emitter,
  play,
  show,
} from '../../core/parts/building-part-tools';

/**
 * A building's general fittings as parts, bound to its services model
 * (`../logic/building-services.ts`): lighting switches and sensors, power,
 * climate, the access door and the intercom.
 */

const ROCKER = recording(asset('rocker-click.wav'), 0.08);

const DETENT = recording(asset('switch-click.wav'), 0.05);

const BREAKER = click({
  band: 3200,
  q: 1.4,
  decay: 0.03,
  level: 0.7,
  thump: [140, 0.04],
});

const MAGLOCK = click({
  band: 1200,
  q: 2,
  decay: 0.03,
  level: 0.5,
  thump: [90, 0.05],
});

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
