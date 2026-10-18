import { ALARM_BUZZER } from '../../core/audio/part-loops';
import type { Binding, Readable } from '../../core/logic/world/components';
import {
  createAlarmReset,
  createEmergencyLight,
  createExitSign,
  createKeyPlate,
  createOverDoorLight,
  createToiletAlarm,
} from '../views/safety-fittings';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  CORD,
  KEY_TURN,
  PRESS,
  emitter,
  show,
} from '../../core/parts/building-part-tools';

/**
 * General safety fittings as parts: emergency lighting and its test key,
 * exit signs, and the accessible WC's alarm, bound to a building's model.
 */

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
