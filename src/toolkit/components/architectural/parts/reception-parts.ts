import type { Object3D } from 'three';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { click, tone } from '../../core/audio/part-audio';
import {
  ERROR,
  LOCKED,
  emitter,
  play,
} from '../../core/parts/building-part-tools';
import { createSlidingDoor } from '../logic/sliding-door';
import {
  createSecuredDoor,
  createSlidingEntrance,
} from '../views/reception-fittings';

/** The drive's motor, a soft whirr as the leaves run. */
const DRIVE = tone({ hz: 140, seconds: 0.9, level: 0.025, type: 'sawtooth' });

/** The leaves meeting as they shut. */
const MEET = click({
  band: 700,
  q: 1.5,
  decay: 0.05,
  level: 0.25,
  thump: [70, 0.05],
});

/**
 * An automatic sliding entrance (`createSlidingEntrance`) run by its
 * sensor: the room says each frame whether anyone is in the sensor's field
 * (`sense`), and the leaves open, hold and close (`../logic/sliding-door`).
 * It is a working door, not a way out: a use on it does nothing.
 */
export function slidingEntrance(kit: PanelKit): Part & {
  sense(present: boolean): void;
  readonly open: number;
  readonly leaves: readonly Object3D[];
} {
  const a = beginPart(kit, 'automatic sliding entrance');
  const view = createSlidingEntrance(kit);
  a.object.add(view.group);
  const door = createSlidingDoor();
  let present = false;
  let wasMoving = 0;
  a.updates.push((delta) => {
    const before = door.open;
    const open = door.step(delta, present);
    if (open === before) {
      wasMoving = 0;
      return;
    }
    // A whirr as the leaves start to move either way.
    const direction = open > before ? 1 : -1;
    if (direction !== wasMoving) play(DRIVE, a.object);
    wasMoving = direction;
    if (open === 0) play(MEET, a.object);
    view.set(open);
  });
  return {
    ...a.part(),
    sense(on: boolean) {
      present = on;
    },
    get open() {
      return door.open;
    },
    leaves: view.leaves,
  };
}

/**
 * A secured door (`createSecuredDoor`) that does not open from this side:
 * a card or code at the reader is refused (its lamp goes bright red and it
 * buzzes), and a push on the leaf only rattles it against its lock.
 */
export function securedDoor(kit: PanelKit, title: string): Part {
  const a = beginPart(kit, `${title} door`);
  const view = createSecuredDoor(kit, title);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { refused: LOCKED });
  let refusing = 0;
  view.set('idle');
  a.uses.set(view.leaf, () => e.emit('refused'));
  const refuse = () => {
    refusing = 1.2;
    view.set('refused');
    play(ERROR, a.object);
  };
  view.reader.traverse((o) => a.uses.set(o, refuse));
  a.updates.push((delta) => {
    if (refusing <= 0) return;
    refusing -= delta;
    if (refusing <= 0) view.set('idle');
  });
  return a.part();
}
