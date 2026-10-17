import { createPcbBackplane } from '../scene/pcb-backplane';
import { computed } from '@preact/signals-core';
import { BoxGeometry, Box3, Group, Mesh } from 'three';
import { MACHINE_COMPONENTS } from '../game/machine-components';
import { MACHINE_REFERENCES } from '../game/machine-references';
import { createMicroLabel, kitPaint } from '../scene/eighties-controls';
import type { PanelKit } from '../scene/eighties-controls';
import { machineComponent } from './machine-components';
import {
  createPartSet,
  pilotLight,
  potentiometer,
  pushButton,
  selector,
} from './parts';
import type { Part } from './parts';
import type { TestFitting } from './test-boards';

export const MACHINE_PLINTH_WIDTH = 0.9;
/** Three rows, with a full walking aisle between every pair of plinths. */
export const MACHINE_GALLERY_LAYOUT = MACHINE_COMPONENTS.map(([kind], i) => ({
  kind,
  x: ((i % 6) - 2.5) * 2,
  z: -2.8 + Math.floor(i / 6) * 3,
}));

/** One true-size production part per plinth; test controls use the common scheme. */
export function createMachineGallery(kit: PanelKit): TestFitting[] {
  const stone = kitPaint(kit, '#5d625f');
  const top = kitPaint(kit, '#343936');
  const panelPaint = kitPaint(kit, '#c4c6bf');
  return MACHINE_COMPONENTS.map(([kind, title]) => {
    const group = new Group();
    group.name = `${title} plinth`;
    const parts = createPartSet();
    const column = new Mesh(new BoxGeometry(0.9, 0.95, 0.9), stone);
    column.position.y = 0.475;
    group.add(column);
    const deck = new Mesh(new BoxGeometry(0.94, 0.03, 0.94), top);
    deck.position.y = 0.965;
    group.add(deck);
    const panel = new Group();
    panel.position.set(0, 0.77, 0.5);
    panel.rotation.x = -0.6;
    group.add(panel);
    const face = new Mesh(new BoxGeometry(0.84, 0.26, 0.012), panelPaint);
    face.position.z = -0.006;
    panel.add(face);
    const label = (text: string, x: number, y: number, height = 0.005) => {
      const mark = createMicroLabel(kit, text, { height, ink: '#252922' });
      mark.position.set(x, y, 0.001);
      panel.add(mark);
    };
    const put = <P extends Part>(part: P, x: number, y: number) => {
      part.object.position.set(x, y, 0.012);
      panel.add(part.object);
      return parts.add(part);
    };
    const supply = put(
      selector(kit, {
        positions: 2,
        initial: 1,
        series: 'xb4',
        name: `${title} supply`,
      }),
      -0.32,
      0.025,
    );
    const input = put(
      potentiometer(kit, {
        initial: kind === 'fuse' ? 0.1 : kind === 'overload' ? 0.2 : 0.5,
        name: `${title} input`,
      }),
      0.32,
      0.025,
    );
    const power = computed(() => supply.position.value === 1);
    const device = parts.add(
      machineComponent(kit, kind, {
        power,
        input: input.share,
        current: computed(() => input.share.value * 8),
        voltage: computed(() => input.share.value * 600),
      }),
    );
    if (kind === 'drive-power') {
      const pcb = createPcbBackplane(kit, 0.3, 0.45, 650, 'DRIVE BACKPLANE');
      pcb.position.set(-0.05, 0, -0.012);
      device.object.add(pcb);
    }
    // Put the actual geometry on the deck, without scaling or guessing its origin.
    device.object.updateMatrixWorld(true);
    const envelope = new Box3().setFromObject(device.object);
    device.object.position.set(
      -(envelope.min.x + envelope.max.x) / 2,
      0.98 - envelope.min.y,
      -(envelope.min.z + envelope.max.z) / 2,
    );
    group.add(device.object);
    put(
      pushButton(kit, {
        colour: 'red',
        name: `${title} ${device.testLabel}`,
        action: device.test,
      }),
      -0.16,
      0.025,
    );
    put(
      pushButton(kit, {
        colour: 'blue',
        name: `${title} reset/replace`,
        action: device.repair,
      }),
      0,
      0.025,
    );
    put(
      pilotLight(kit, {
        colour: 'green',
        name: `${title} active`,
        drive: device.active,
        pushToTest: false,
        series: 'xb4',
      }),
      0.13,
      0.025,
    );
    put(
      pilotLight(kit, {
        colour: 'amber',
        name: `${title} fault/withdrawn`,
        drive: device.faulted,
        pushToTest: false,
        series: 'xb4',
      }),
      0.23,
      0.025,
    );
    for (const [text, x] of [
      ['SUPPLY', -0.32],
      [device.testLabel, -0.16],
      ['RESET / REPLACE', 0],
      ['ACTIVE', 0.13],
      ['FAULT / OUT', 0.23],
      ['INPUT / LOAD', 0.32],
    ] as const)
      label(text, x, -0.035, 0.004);
    const reference = MACHINE_REFERENCES[kind];
    const plaque = createMicroLabel(kit, `${title}\n${reference.model}`, {
      height: 0.012,
      ink: '#e8e5d9',
    });
    plaque.position.set(0, 0.43, 0.451);
    group.add(plaque);
    group.userData.machineReference = reference;
    return {
      group,
      parts,
      update: (_t, dt) => parts.update(dt),
      dispose: () => parts.dispose(),
    };
  });
}
