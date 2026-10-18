import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createPartSet,
  doorLatch,
  keySwitch,
  pushButton,
} from '../toolkit/components/core/parts/parts';
import type { OperatorColour } from '../toolkit/components/industrial-control/views/industrial-controls';
import type { Level0Cheats } from './level0-cheats';

/** The cabinet, metres: width, height, depth, and its height off the floor. */
const W = 0.42;
const H = 0.36;
const D = 0.14;
const BASE = 1.0;
/** Half the footprint of its base plate, for walking round it. */
export const CHEAT_CONSOLE_HALF = 0.2;

const BUTTONS: readonly {
  legend: string;
  colour: OperatorColour;
  act: keyof Pick<
    Level0Cheats,
    'fullOff' | 'fullOn' | 'slowStart' | 'reset' | 'hiccup' | 'glitch' | 'kaput'
  >;
}[] = [
  { legend: 'FULL OFF', colour: 'red', act: 'fullOff' },
  { legend: 'FULL ON', colour: 'green', act: 'fullOn' },
  { legend: 'SLOW START', colour: 'white', act: 'slowStart' },
  { legend: 'RESET', colour: 'blue', act: 'reset' },
  { legend: 'HICCUP', colour: 'amber', act: 'hiccup' },
  { legend: 'GLITCH', colour: 'amber', act: 'glitch' },
  { legend: 'KAPUT', colour: 'red', act: 'kaput' },
];

/**
 * The cheat console: a small steel cabinet on a pole, marked CHEATS and
 * AUTHORISED PERSONNEL ONLY, its door locked with the key left in the
 * lock. Turn the key, and the door's wing latch opens it on rows of push
 * buttons that set the machine's state (`src/rendering/level0-cheats.ts`).
 * The inside is not drawn, nor can it be clicked, while the door is shut.
 * Front faces +z; metres; its origin on the floor under the pole.
 */
export function createCheatConsole(kit: PanelKit, cheats: Level0Cheats) {
  const group = new Group();
  group.name = 'Cheat console';
  const parts = createPartSet();
  const steel = kitPaint(kit, '#4a5157', 0.35);
  const grey = kitPaint(kit, '#b9bcb6', 0.1);
  const box = (
    parent: Group,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // A weighted base plate and a tubular pole.
  box(group, steel, 0.4, 0.015, 0.4, 0, 0.0075, 0);
  const pole = new Mesh(new CylinderGeometry(0.025, 0.025, BASE, 16), steel);
  pole.position.y = BASE / 2;
  group.add(pole);
  // The cabinet: back, sides, top and bottom, open at the front.
  const cabinet = new Group();
  cabinet.position.y = BASE + H / 2;
  group.add(cabinet);
  const t = 0.012;
  box(cabinet, steel, W, H, t, 0, 0, -D / 2 + t / 2);
  for (const side of [-1, 1]) {
    box(cabinet, steel, t, H, D, side * (W / 2 - t / 2), 0, 0);
    box(cabinet, steel, W, t, D, 0, side * (H / 2 - t / 2), 0);
  }

  // Inside: a pale panel of push buttons, drawn only while the door is open.
  const inside = new Group();
  inside.name = 'Cheat console buttons';
  inside.visible = false;
  // The raycaster does not honour visibility: a shut cabinet takes no clicks.
  inside.raycast = () => (inside.visible ? undefined : false);
  cabinet.add(inside);
  box(inside, grey, W - 2 * t, H - 2 * t, 0.004, 0, 0, -D / 2 + t + 0.002);
  const columns = 4;
  BUTTONS.forEach((spec, i) => {
    const button = parts.add(
      pushButton(kit, {
        colour: spec.colour,
        legend: spec.legend,
        action: () => cheats[spec.act](),
      }),
    );
    const col = i % columns;
    const row = Math.floor(i / columns);
    button.object.position.set(
      -W / 2 + 0.06 + col * ((W - 0.12) / (columns - 1)),
      0.07 - row * 0.15,
      -D / 2 + t + 0.004,
    );
    button.object.scale.setScalar(0.85);
    inside.add(button.object);
  });

  // The door, hinged on its left, locked by the key in its lock.
  const hinge = new Group();
  hinge.position.set(-W / 2, 0, D / 2);
  cabinet.add(hinge);
  const leaf = box(hinge, steel, W, H, 0.014, W / 2, 0, 0.007);
  leaf.name = 'Cheat console door';
  const label = (
    text: string,
    height: number,
    ink: string,
    plate: string,
    y: number,
  ) => {
    const mesh = createMicroLabel(kit, text, { height, ink, plate });
    mesh.position.set(W / 2 - 0.03, y, 0.0145);
    hinge.add(mesh);
  };
  label('CHEATS', 0.045, '#ffffff', '#b3261e', 0.08);
  label('AUTHORISED PERSONNEL ONLY', 0.014, '#151515', '#f2c418', -0.02);
  // Unlocked: the key turned. Locked, the latch will not open the door.
  const unlocked = signal(false);
  const key = parts.add(
    keySwitch(kit, {
      name: 'Cheat console lock',
      bound: {
        get value() {
          return unlocked.value;
        },
        set: (value: boolean) => (unlocked.value = value),
      },
    }),
  );
  key.object.position.set(W - 0.05, 0.08, 0.014);
  hinge.add(key.object);
  const keyCaption = createMicroLabel(kit, 'LOCKED  ·  OPEN', {
    height: 0.006,
    ink: '#e8e6dd',
  });
  keyCaption.position.set(W - 0.05, 0.045, 0.0145);
  hinge.add(keyCaption);
  const open = signal(false);
  const latch = parts.add(
    doorLatch(kit, {
      name: 'Cheat console door latch',
      material: kitPaint(kit, '#141516'),
      // Locked, the shut door refuses; an open one always shuts.
      latch: computed(() => !unlocked.value && !open.value),
      bound: {
        get value() {
          return open.value;
        },
        set: (value: boolean) => (open.value = value),
      },
    }),
  );
  latch.object.position.set(W - 0.05, -0.09, 0.014);
  hinge.add(latch.object);

  let angle = 0;
  return {
    group,
    parts,
    /** Whether its door is open. */
    get open() {
      return open.value;
    },
    unlock(on = true) {
      unlocked.value = on;
    },
    update(delta: number) {
      parts.update(delta);
      cheats.update(delta);
      const target = open.value ? -1.9 : 0;
      angle += (target - angle) * Math.min(1, delta * 8);
      if (Math.abs(angle - target) < 0.001) angle = target;
      hinge.rotation.y = angle;
      inside.visible = open.value || Math.abs(angle) > 0.001;
    },
    dispose() {
      parts.dispose();
    },
  };
}
