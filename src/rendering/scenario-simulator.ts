import { signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createPartSet,
  doorLatch,
  pushButton,
} from '../toolkit/components/core/parts/parts';
import type { OperatorColour } from '../toolkit/components/industrial-control/views/industrial-controls';
import {
  createRackCabinet,
  createRackUnit,
} from '../toolkit/components/industrial-control/views/rack-equipment';
import type { Level0Scenarios } from './level0-scenarios';

/** The cabinet, metres: a 42U rack, 600 mm wide and 800 mm deep. */
const UNITS = 42;
const WIDTH = 0.6;
const DEPTH = 0.8;
/** The control panel's bottom, in rack units: its 4U middle at about 1.52 m. */
const PANEL_AT = 32;
/** Half the cabinet's widest extent, for walking round it. */
export const SIMULATOR_HALF = 0.5;

const BUTTONS: readonly {
  legend: string;
  colour: OperatorColour;
  act:
    | 'fullOff'
    | 'fullOn'
    | 'slowStart'
    | 'reset'
    | 'hiccup'
    | 'glitch'
    | 'kaput';
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
 * The Hyperplasc Scenario Simulator, by Neumann Dynamik: a modern 42U
 * rack cabinet, built as the dev3 gallery's are, behind a smoked perspex
 * door marked AUTHORISED PERSONNEL ONLY, opened by its swing handle.
 * Inside, at eye level, a 4U panel of TESTING SCENARIOS push
 * buttons sets the machine's state (`src/rendering/level0-scenarios.ts`);
 * the rest of the rack is the simulator's own equipment. Its controls
 * can be seen through the door but worked only with it open. Front faces
 * +z; metres; its origin on the floor under the middle of its front.
 */
export function createScenarioSimulator(
  kit: PanelKit,
  scenarios: Level0Scenarios,
) {
  const group = new Group();
  group.name = 'Hyperplasc Scenario Simulator';
  const parts = createPartSet();
  const cabinet = createRackCabinet(kit, {
    units: UNITS,
    width: WIDTH,
    depth: DEPTH,
    colour: 'black',
    brand: 'neumann-dynamik',
    door: 'glass',
    glass: 'smoke',
    feet: 'levellers',
  });
  group.add(cabinet.group);
  // The simulator's own equipment, round its control panel.
  const fill: [number, Parameters<typeof createRackUnit>[1]][] = [
    [40, { u: 2, style: 'vented', colour: 'black' }],
    [
      37,
      {
        u: 3,
        style: 'display',
        colour: 'black',
        label: 'HYPERPLASC SCENARIO SIMULATOR',
      },
    ],
    [36, { u: 1, style: 'patch', colour: 'black' }],
    [28, { u: 4, style: 'drives', colour: 'black', label: 'SCENARIO STORE' }],
    [24, { u: 4, style: 'fans', colour: 'black' }],
    [20, { u: 4, style: 'handles', colour: 'black', label: 'HYPERPLASC CORE' }],
    [16, { u: 4, style: 'handles', colour: 'black', label: 'HYPERPLASC CORE' }],
    [12, { u: 4, style: 'vented', colour: 'black' }],
    [4, { u: 8, style: 'blank', colour: 'black' }],
    [
      1,
      { u: 3, style: 'handles', colour: 'black', label: 'POWER DISTRIBUTION' },
    ],
  ];
  const units = fill.flatMap(([at, options]) => {
    const unit = createRackUnit(kit, options);
    cabinet.mount(unit, at);
    // A patch panel is passive: no status lights among its sockets.
    return options.style === 'patch' ? [] : [unit];
  });
  // Rows of tiny status LEDs on every unit, twinkling green and amber at
  // their own rates, as a busy rack of about 2015 does.
  const ledOn = {
    green: kitGlow(kit, '#3dff6a'),
    amber: kitGlow(kit, '#ffb21e'),
  };
  const ledOff = kitPaint(kit, '#1b1d1e');
  const ledShape = new BoxGeometry(0.0035, 0.0035, 0.0015);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const leds = units.flatMap((unit) =>
    Array.from({ length: 8 }, (_, i) => {
      const led = new Mesh(ledShape, ledOff);
      led.name = 'Simulator status LED';
      led.position.set(
        unit.faceWidth / 2 - 0.012 - (i % 4) * 0.008,
        unit.u * 0.0222 - 0.012 - Math.floor(i / 4) * 0.008,
        0.002,
      );
      unit.face.add(led);
      // Some blink with every access, some only now and then.
      return { led, next: 0, busy: 0.04 + random() * (i % 3 ? 0.25 : 1.5) };
    }),
  );
  let clock = 0;
  const twinkle = (delta: number) => {
    clock += delta;
    for (const light of leds) {
      if (clock < light.next) continue;
      const roll = random();
      light.led.material =
        roll < 0.55 ? ledOn.green : roll < 0.85 ? ledOn.amber : ledOff;
      light.next = clock + light.busy * (0.5 + random());
    }
  };

  // The control panel, at eye level: TESTING SCENARIOS.
  const panel = createRackUnit(kit, {
    u: 4,
    style: 'blank',
    colour: 'charcoal',
    label: 'TESTING SCENARIOS',
  });
  cabinet.mount(panel, PANEL_AT);
  const controls = new Group();
  controls.name = 'Testing scenario controls';
  panel.face.add(controls);
  const title = createMicroLabel(kit, 'TESTING SCENARIOS', {
    height: 0.009,
    ink: '#e9edf0',
  });
  title.position.set(0, 0.075, 0.002);
  panel.face.add(title);
  const columns = 4;
  BUTTONS.forEach((spec, i) => {
    const button = parts.add(
      pushButton(kit, {
        colour: spec.colour,
        legend: spec.legend,
        action: () => scenarios[spec.act](),
      }),
    );
    button.object.position.set(
      -0.165 + (i % columns) * 0.11,
      0.035 - Math.floor(i / columns) * 0.075,
      0.002,
    );
    button.object.scale.setScalar(0.8);
    controls.add(button.object);
  });

  // The door: smoked perspex and its swing handle.
  const door = cabinet.door!;
  const sign = (
    text: string,
    height: number,
    ink: string,
    plate: string,
    y: number,
  ) => {
    const label = createMicroLabel(kit, text, { height, ink, plate });
    label.position.set(door.width / 2, y, 0.012);
    door.hinge.add(label);
  };
  sign(
    'HYPERPLASC SCENARIO SIMULATOR',
    0.02,
    '#e9edf0',
    '#1d1e20',
    door.middle + 0.86,
  );
  sign(
    'AUTHORISED PERSONNEL ONLY',
    0.018,
    '#151515',
    '#f2c418',
    door.middle - 0.2,
  );
  // A plain door: no lock, just its swing handle.
  door.lock.visible = false;
  const open = signal(false);
  // The door's latch works through its swing handle.
  const latch = doorLatch(kit, {
    name: 'Scenario simulator door',
    material: kitPaint(kit, '#18191a'),
    bound: {
      get value() {
        return open.value;
      },
      set: (value: boolean) => (open.value = value),
    },
  });
  latch.object.visible = false;
  latch.object.position.copy(door.handle.position);
  door.hinge.add(latch.object);
  // A chrome pull handle on two standoffs, on the door's free edge at
  // about hand height, so the door plainly opens there.
  const chrome = kitPaint(kit, '#d9dcde', 0.9);
  const pull = new Group();
  pull.name = 'Scenario simulator door pull';
  pull.position.set(door.width - 0.045, 1.1, 0.012);
  const bar = new Mesh(new CylinderGeometry(0.008, 0.008, 0.26, 16), chrome);
  bar.position.z = 0.04;
  pull.add(bar);
  for (const y of [-0.11, 0.11]) {
    const post = new Mesh(new CylinderGeometry(0.006, 0.006, 0.04, 12), chrome);
    post.rotation.x = Math.PI / 2;
    post.position.set(0, y, 0.02);
    pull.add(post);
  }
  door.hinge.add(pull);
  // A use anywhere on the door, its pull, handle, frame or glass, opens it
  // or shuts it.
  parts.add({
    ...latch,
    uses: new Map([[door.hinge, () => void latch.door.flip()]]),
  });

  // Its controls take clicks only with the door open (or swinging).
  let angle = 0;
  controls.raycast = () => (open.value || angle < -0.001 ? undefined : false);
  return {
    group,
    parts,
    /** Whether its door is open. */
    get open() {
      return open.value;
    },
    update(delta: number) {
      twinkle(delta);
      parts.update(delta);
      scenarios.update(delta);
      const target = open.value ? -1.9 : 0;
      angle += (target - angle) * Math.min(1, delta * 6);
      if (Math.abs(angle - target) < 0.001) angle = target;
      door.hinge.rotation.y = angle;
    },
    dispose() {
      parts.dispose();
    },
  };
}
