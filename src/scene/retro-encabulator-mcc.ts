import { signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { createAnnunciator } from '../game/annunciator';
import {
  createPartSet,
  disconnectHandle,
  doorLatch,
  driveKeypad,
  keySwitch,
  ledPushbutton,
  mushroomStop,
  operatorTerminal,
  pilotLight,
  potentiometer,
  pushButton,
  pushbuttonStation,
  rackUnit,
  selector as selectorPart,
} from '../rendering/parts';
import type { Part, PartSet } from '../rendering/parts';
import {
  createAnnunciatorPanel,
  createChartRecorder,
  createCrtMonitor,
  createDoorLeaf,
  createLouvres,
  createPowerMonitor,
  createSoftStarter,
  createViewingWindow,
} from './cabinet-fittings';
import type { CrtMode } from './cabinet-fittings';
import type { PanelKit } from './eighties-controls';
import {
  createBarGraph,
  createMicroLabel,
  createSevenSegment,
  kitPaint,
} from './eighties-controls';
import { createLegendPlate, createNameplate } from './industrial-controls';
import type { OperatorColour } from './industrial-controls';
import {
  createHourMeterView,
  createMessageDisplay,
  createStackLight,
} from './industrial-displays';
import {
  createContactorView,
  createFuseHolderView,
  createOverloadRelayView,
} from './industrial-devices';
import {
  createCharacterLcd,
  createJewelLamp,
  createLedMatrix,
  createPanelMeter,
  createRoundGauge,
} from './panel-instruments';
import { MCC_BLUE, createWornPaint } from './worn-paint';

/** CENTERLINE 2100 envelope: 90 in high, 20 in standard width, 20 in deep. */
export const MCC_HEIGHT = 2.286;
export const MCC_DEPTH = 0.508;
/** The base channel the line-up stands on, and that boots kick. */
export const MCC_PLINTH = 0.1;
const WIREWAY = 0.1524;
/**
 * A unit door: a flat face with a deeper pan behind its middle, which
 * carries the fittings' bodies, so the door is thicker without standing
 * any further out. The pan stands in from the edges by `PANEL_INSET`,
 * and further on the latch side, clear of the latches; the face, where
 * the fittings mount, is at `DOOR_FRONT`.
 */
const FLANGE = 0.012;
const PANEL_DEPTH = 0.03;
const PANEL_INSET = 0.02;
const LATCH_SIDE = 0.042;
const DOOR_FRONT = FLANGE / 2;
const SPACE = (MCC_HEIGHT - 2 * WIREWAY) / 12;
export const BAY_WIDTHS = [0.635, 0.508, 0.508, 0.508, 0.762, 0.635, 0.508];
export const MCC_WIDTH = BAY_WIDTHS.reduce((sum, width) => sum + width, 0);

/** Which fittings a unit's door wears; see `dressDoor`. */
type Face =
  | 'meters'
  | 'main'
  | 'annunciator'
  | 'film'
  | 'smc'
  | 'estop'
  | 'small-lamps'
  | 'small-station'
  | 'small-key'
  | 'small-lcd'
  | 'blank'
  | 'crt-trend'
  | 'crt-log'
  | 'crt-vector'
  | 'chart'
  | 'bars'
  | 'plc'
  | 'terminations'
  | 'drive'
  | 'isolator'
  | 'matrix'
  | 'fan'
  | 'grammeter';

type Bucket = {
  spaces: number;
  label: string;
  kind: 'main' | 'starter' | 'small' | 'control' | 'plc' | 'drive' | 'aux';
  face: Face;
};
const BAYS: Bucket[][] = [
  [
    {
      spaces: 2,
      label: 'MAIN INCOMING\n480 VAC 3 PH',
      kind: 'main',
      face: 'meters',
    },
    { spaces: 5, label: 'MAIN DISCONNECT\n800 A', kind: 'main', face: 'main' },
    {
      spaces: 5,
      label: 'DISTRIBUTION\nBUS ENERGIZED',
      kind: 'main',
      face: 'annunciator',
    },
  ],
  [
    {
      spaces: 4,
      label: 'MAIN DRIVE MOTOR\nM-101',
      kind: 'starter',
      face: 'film',
    },
    { spaces: 4, label: 'FEED MOTOR\nM-102', kind: 'starter', face: 'smc' },
    {
      spaces: 4,
      label: 'AUXILIARY MOTOR\nM-103',
      kind: 'starter',
      face: 'estop',
    },
  ],
  (
    [
      ['LUBE OIL PUMP', 'small-lamps'],
      ['COOLING FAN', 'small-station'],
      ['HYDRAULIC PUMP', 'small-key'],
      ['AUXILIARY DRIVE', 'small-lcd'],
      ['VENTILATION FAN', 'small-lamps'],
      ['SPARE', 'blank'],
    ] as const
  ).map(([label, face], i) => ({
    spaces: 2,
    label: face === 'blank' ? 'SPARE\nSPACE' : `${label}\nM-${201 + i}`,
    kind: 'small' as const,
    face,
  })),
  [
    {
      spaces: 3,
      label: 'ENCABULATOR\nCONTROL',
      kind: 'control',
      face: 'crt-trend',
    },
    { spaces: 3, label: 'MODIAL\nINTERACTION', kind: 'control', face: 'chart' },
    {
      spaces: 3,
      label: 'PHASE\nREFERENCE',
      kind: 'control',
      face: 'crt-vector',
    },
    { spaces: 3, label: 'PANENDERMIC\nMONITOR', kind: 'control', face: 'bars' },
  ],
  [
    {
      spaces: 8,
      label: 'PLC-5 / 1771\nAUTOMATION CONTROL',
      kind: 'plc',
      face: 'plc',
    },
    {
      spaces: 4,
      label: 'FIELD TERMINATIONS\n24 VDC I/O',
      kind: 'plc',
      face: 'terminations',
    },
  ],
  [
    {
      spaces: 8,
      label: 'MAIN ENCABULATOR\nDRIVE VFD-601',
      kind: 'drive',
      face: 'drive',
    },
    {
      spaces: 4,
      label: 'DRIVE ISOLATOR\n480 VAC',
      kind: 'drive',
      face: 'isolator',
    },
  ],
  [
    {
      spaces: 3,
      label: 'RECIPROCATING\nDINGLE ARM',
      kind: 'aux',
      face: 'crt-log',
    },
    { spaces: 3, label: 'HYDROCOPTIC\nPUMP', kind: 'aux', face: 'matrix' },
    { spaces: 3, label: 'PANENDERMIC\nFAN', kind: 'aux', face: 'fan' },
    { spaces: 3, label: 'CARDINAL\nGRAMMETER', kind: 'aux', face: 'grammeter' },
  ],
];

const box = (
  parent: Object3D,
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
const rod = (
  parent: Object3D,
  material: Material,
  radius: number,
  length: number,
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, length, 8),
    material,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
};

export interface MccView {
  group: Group;
  /**
   * Its parts: every control on its doors, the doors' latches (the only
   * thing that opens a door) and the rack units inside. A room adds
   * their clicks and updates them; they make their own sounds.
   */
  parts: PartSet;
  update(delta: number): void;
  openAll(open: boolean): void;
  /** Open or shut one unit's door, as its latches would, silently. */
  door(index: number): void;
  /** How many unit doors it has. */
  doorCount: number;
}

/** Smooth wandering readings for the displays, 0 to 1. */
const wander = (t: number, seed: number) =>
  0.5 +
  0.25 * Math.sin(t * 0.37 + seed * 1.3) +
  0.15 * Math.sin(t * 1.1 + seed * 2.9);

/** Messages the line-up's display cycles through. */
const MESSAGES: readonly (readonly string[])[] = [
  ['RETRO ENCABULATOR', 'ALL SYSTEMS NOMINAL'],
  ['DINGLE ARM', 'REDUCTANCE NORMAL'],
  ['PANENDERMIC', 'SEMIBOLOID IN PHASE'],
  ['MODIAL INTERACTION', 'MAGNETO-REDUCTANCE'],
  ['SPURVING BEARINGS', 'LUBRICATED'],
];

/**
 * Seven adjoining MCC structures on a base channel, after the line-up in
 * Rockwell's Retro Encabulator film: every unit's door wears its own
 * fittings (`dressDoor`), the steel is a worn modernist pale blue, and
 * the plinth is kicked and scuffed by years of boots. Front faces +z;
 * dimensions are metres.
 */
export function createRetroEncabulatorMcc(kit: PanelKit): MccView {
  const group = new Group();
  group.name = 'Allen-Bradley CENTERLINE-style Retro Encabulator MCC';
  // Everything above the plinth stands in its own group.
  const lineup = new Group();
  lineup.position.y = MCC_PLINTH;
  group.add(lineup);
  const parts = createPartSet();
  const hinges: {
    group: Group;
    open: () => boolean;
    force(open: boolean): void;
  }[] = [];
  const updates: ((delta: number, clock: number) => void)[] = [];
  let seed = 0;
  const worn = (
    width: number,
    height: number,
    handled: { x: number; y: number } | null = null,
  ) =>
    createWornPaint(kit, {
      colour: MCC_BLUE,
      width,
      height,
      seed: ++seed,
      handled,
    });
  const paint = worn(0.5, 0.5);
  const liner = kitPaint(kit, '#d0d0c7');
  const dark = kitPaint(kit, '#242529');
  const copper = kitPaint(kit, '#a87644', 0.68);
  const brass = kitPaint(kit, '#ad8c50', 0.6);
  const wire = kitPaint(kit, '#32363a');
  const total = MCC_WIDTH;
  // Continuous structure and three-phase bus behind removable units.
  box(lineup, liner, total, MCC_HEIGHT, 0.012, 0, MCC_HEIGHT / 2, -MCC_DEPTH);
  for (let phase = 0; phase < 3; phase++) {
    const y = MCC_HEIGHT - 0.24 - phase * 0.042;
    box(lineup, copper, total - 0.05, 0.018, 0.012, 0, y, -0.43);
  }
  box(lineup, copper, total - 0.05, 0.012, 0.015, 0, 0.09, -0.44);

  let left = -total / 2;
  BAY_WIDTHS.forEach((width, bayIndex) => {
    const bay = new Group();
    bay.position.x = left + width / 2;
    lineup.add(bay);
    left += width;
    // This section's length of the plinth, kicked and scuffed, its ends
    // overlapping its neighbours' a little, and of the top trim.
    const ends =
      bayIndex === 0 || bayIndex === BAY_WIDTHS.length - 1 ? 0.015 : 0;
    box(
      bay,
      createWornPaint(kit, {
        colour: MCC_BLUE,
        width: width + ends,
        height: MCC_PLINTH,
        seed: 90 + bayIndex,
        wear: 'heavy',
      }),
      width + 0.001 + ends,
      MCC_PLINTH,
      MCC_DEPTH + 0.03,
      bayIndex === 0 ? -ends / 2 : ends / 2,
      MCC_PLINTH / 2 - MCC_PLINTH,
      -MCC_DEPTH / 2 + 0.015,
    );
    box(
      bay,
      worn(width, 0.05),
      width,
      0.05,
      MCC_DEPTH,
      0,
      MCC_HEIGHT - 0.025,
      -MCC_DEPTH / 2,
    );
    const channel = 0.105;
    const faceW = width - channel - 0.02;
    const faceX = -channel / 2;
    // Folded steel sides, partition, wireway covers and joining flanges.
    for (const side of [-1, 1])
      box(
        bay,
        paint,
        0.012,
        MCC_HEIGHT,
        MCC_DEPTH,
        side * (width / 2 - 0.006),
        MCC_HEIGHT / 2,
        -MCC_DEPTH / 2,
      );
    box(
      bay,
      liner,
      0.012,
      MCC_HEIGHT - 2 * WIREWAY,
      MCC_DEPTH - 0.03,
      width / 2 - channel,
      MCC_HEIGHT / 2,
      -MCC_DEPTH / 2,
    );
    for (const y of [WIREWAY / 2, MCC_HEIGHT - WIREWAY / 2]) {
      box(
        bay,
        worn(width - 0.025, WIREWAY - 0.01),
        width - 0.025,
        WIREWAY - 0.01,
        0.012,
        0,
        y,
        0,
      );
      for (const x of [-width / 2 + 0.035, width / 2 - 0.035])
        rod(bay, dark, 0.004, 0.006, x, y, 0.01);
    }
    const wireway = box(
      bay,
      worn(channel, MCC_HEIGHT - 2 * WIREWAY),
      channel - 0.012,
      MCC_HEIGHT - 2 * WIREWAY - 0.01,
      0.012,
      width / 2 - channel / 2 - 0.006,
      MCC_HEIGHT / 2,
      0,
    );
    wireway.name = `Section ${bayIndex + 1} vertical wireway`;
    for (let phase = 0; phase < 3; phase++)
      box(
        bay,
        copper,
        0.012,
        MCC_HEIGHT - 2 * WIREWAY - 0.07,
        0.012,
        -width / 2 + 0.04 + phase * 0.025,
        MCC_HEIGHT / 2,
        -0.4,
      );
    if (bayIndex === 0) {
      const brand = createMicroLabel(kit, 'ALLEN-BRADLEY\nCENTERLINE', {
        height: 0.009,
        ink: '#a52a22',
      });
      brand.position.set(-0.04, MCC_HEIGHT - 0.075, 0.008);
      bay.add(brand);
    }
    if (bayIndex === 3) {
      // The plant message display over the control section, as in the film.
      const message = createMessageDisplay(kit, { caption: 'DATALINE 1500' });
      message.group.scale.setScalar(0.95);
      message.group.position.set(-0.02, MCC_HEIGHT - WIREWAY / 2, 0.006);
      bay.add(message.group);
      updates.push((_, clock) =>
        message.show(MESSAGES[Math.floor(clock / 4) % MESSAGES.length], true),
      );
    }
    if (bayIndex === 4) {
      const stack = createStackLight(kit);
      stack.group.position.set(-0.2, MCC_HEIGHT, -0.15);
      bay.add(stack.group);
      updates.push((_, clock) => {
        const warn = Math.sin(clock * 0.21) > 0.6;
        stack.set([false, warn && Math.floor(clock * 2) % 2 === 0, !warn]);
      });
    }
    let top = MCC_HEIGHT - WIREWAY;
    for (const [bucketIndex, spec] of BAYS[bayIndex].entries()) {
      const h = spec.spaces * SPACE;
      const cy = top - h / 2;
      top -= h;
      // Unit pan, enclosed back and wired interior, all visible when opened.
      box(
        bay,
        liner,
        faceW + 0.004,
        0.008,
        MCC_DEPTH - 0.06,
        faceX,
        cy - h / 2,
        -MCC_DEPTH / 2,
      );
      box(bay, liner, faceW - 0.018, h - 0.02, 0.006, faceX, cy, -0.375);
      populateInterior(
        kit,
        bay,
        spec,
        faceX,
        cy,
        h,
        faceW,
        {
          liner,
          dark,
          brass,
          copper,
          wire,
        },
        parts,
      );
      const hinge = new Group();
      hinge.position.set(faceX - faceW / 2, cy, 0.003);
      bay.add(hinge);
      const doorPaint = worn(faceW, h, { x: 0.86, y: 0.5 });
      const opening =
        spec.face === 'plc'
          ? { x: 0, y: -h * 0.23, width: faceW * 0.74, height: h * 0.42 }
          : null;
      const leaf = createDoorLeaf(
        faceW - 0.006,
        h - 0.006,
        FLANGE,
        doorPaint,
        opening,
      );
      leaf.position.set(faceW / 2, 0, -FLANGE / 2);
      leaf.name = `Section ${bayIndex + 1} ${spec.label.replace('\n', ' ')} door`;
      hinge.add(leaf);
      // The pan behind the face, set over to the hinge side.
      const panelW = faceW - 0.006 - PANEL_INSET - LATCH_SIDE;
      const panelX = faceW / 2 + (PANEL_INSET - LATCH_SIDE) / 2;
      const panel = createDoorLeaf(
        panelW,
        h - 0.006 - 2 * PANEL_INSET,
        PANEL_DEPTH,
        doorPaint,
        opening && {
          ...opening,
          x: opening.x + faceW / 2 - panelX,
        },
      );
      panel.position.set(panelX, 0, -FLANGE / 2 - PANEL_DEPTH);
      hinge.add(panel);
      if (opening) {
        const pane = createViewingWindow(kit, opening.width, opening.height);
        pane.position.set(faceW / 2 + opening.x, opening.y, DOOR_FRONT);
        hinge.add(pane);
      }
      for (const y of [-h / 2 + 0.035, h / 2 - 0.035])
        box(hinge, dark, 0.012, 0.025, 0.018, 0, y, -0.004);
      const plate = createNameplate(kit, spec.label, {
        width: Math.min(0.205, faceW * 0.57),
        height: h < 0.35 ? 0.035 : 0.046,
      });
      plate.position.set(faceW * 0.43, h / 2 - 0.052, DOOR_FRONT);
      hinge.add(plate);
      dressDoor(kit, hinge, spec, faceW, h, seed, updates, parts, doorPaint);
      // Quarter-turn wing latches on the flange, by the free edge: the
      // only part of the door that opens it. Both work the one door.
      let shared: ReturnType<typeof doorLatch>['door'] | undefined;
      for (const y of [h / 2 - 0.05, -h / 2 + 0.05]) {
        const latch = parts.add(
          doorLatch(kit, {
            material: dark,
            shared,
            name: `${leaf.name} latch`,
          }),
        );
        shared ??= latch.door;
        latch.object.position.set(
          faceW - LATCH_SIDE / 2 - 0.003,
          y,
          FLANGE / 2,
        );
        hinge.add(latch.object);
      }
      const door = shared!;
      hinges.push({
        group: hinge,
        open: () => door.state.value,
        force: (open) => door.set(open),
      });
      // Numbered section and bucket tags remain legible at close range.
      const tag = createMicroLabel(
        kit,
        `${bayIndex + 1}${String.fromCharCode(65 + bucketIndex)}`,
        { height: 0.005, ink: '#242529', plate: '#d0d0c7' },
      );
      tag.position.set(0.04, h / 2 - 0.045, DOOR_FRONT + 0.0005);
      hinge.add(tag);
    }
  });
  let clock = 0;
  return {
    group,
    parts,
    update(delta) {
      clock += delta;
      for (const update of updates) update(delta, clock);
      parts.update(delta);
      for (const hinge of hinges) {
        const target = hinge.open() ? -1.75 : 0;
        hinge.group.rotation.y +=
          (target - hinge.group.rotation.y) * Math.min(1, delta * 8);
      }
    },
    openAll(open) {
      for (const hinge of hinges) hinge.force(open);
    },
    door(index) {
      const hinge = hinges[index];
      hinge?.force(!hinge.open());
    },
    get doorCount() {
      return hinges.length;
    },
  };
}

/**
 * Fit a unit's door with its face's fittings. The door runs from the
 * hinge (x = 0) to `width`, centred on y = 0, its front at z = 0.006.
 * Anything that moves or glows registers an update.
 */
function dressDoor(
  kit: PanelKit,
  hinge: Group,
  spec: Bucket,
  width: number,
  height: number,
  seed: number,
  updates: ((delta: number, clock: number) => void)[],
  parts: PartSet,
  doorPaint: Material,
) {
  // The raised panel's middle, where the fittings are centred.
  const cx = (PANEL_INSET + width - LATCH_SIDE) / 2;
  let now = 0;
  updates.push((_, clock) => (now = clock));
  const put = (part: Object3D, x: number, y: number, scale = 1) => {
    part.position.set(x, y, DOOR_FRONT);
    part.scale.setScalar(scale);
    hinge.add(part);
    return part;
  };
  const caption = (text: string, x: number, y: number, size = 0.0045) => {
    const label = createMicroLabel(kit, text, { height: size, ink: '#1f2224' });
    label.position.set(x, y, DOOR_FRONT + 0.0005);
    hinge.add(label);
  };
  const legend = (text: string, x: number, y: number, w = 0.05) =>
    put(createLegendPlate(kit, text, { width: w, height: 0.012 }), x, y);
  /** Place a part on the door and add it to the line-up's parts. */
  const place = <P extends Part>(part: P, x: number, y: number, scale = 1) => {
    put(part.object, x, y, scale);
    return parts.add(part);
  };
  const handle = (
    colour: 'black' | 'red' = 'black',
    scale = 0.9,
    x = width - LATCH_SIDE - 0.04,
    y = 0,
  ) => place(disconnectHandle(kit, { colour }), x, y, scale);
  const selector = (
    positions: 2 | 3,
    x: number,
    y: number,
    scale = 0.9,
    initial = 0,
    key = false,
  ) => place(selectorPart(kit, { positions, initial, key }), x, y, scale);
  const pot = (x: number, y: number, scale = 0.9) =>
    place(potentiometer(kit, { initial: 0.6 }), x, y, scale);
  const station = (
    buttons: { colour: OperatorColour; legend: string }[],
    x: number,
    y: number,
    scale = 1,
  ) => place(pushbuttonStation(kit, { buttons }), x, y, scale);
  /** A pilot light lit by `lit` of the clock; push to test. */
  const lamp = (
    colour: OperatorColour,
    x: number,
    y: number,
    lit: (t: number) => boolean,
    scale = 0.9,
  ) => {
    const drive = signal(false);
    updates.push((_, clock) => (drive.value = lit(clock)));
    return place(pilotLight(kit, { colour, drive }), x, y, scale);
  };
  const button = (
    colour: OperatorColour,
    legend: string,
    x: number,
    y: number,
    action?: () => void,
  ) => place(pushButton(kit, { colour, legend, action }), x, y, 0.9);
  const louvres = (w: number, h: number, x: number, y: number) =>
    put(createLouvres(kit, w, h, doorPaint), x, y);
  const meter = (
    unit: string,
    x: number,
    y: number,
    k: number,
    scaleMax = 10,
  ) => {
    const view = createPanelMeter(kit, unit, { width: 0.075, scaleMax });
    put(view.group, x, y);
    updates.push((delta, clock) => {
      view.set(0.35 + wander(clock, seed + k) * 0.3);
      view.update(delta);
    });
  };
  const crt = (mode: CrtMode, w: number, y: number, title?: string) => {
    const view = createCrtMonitor(kit, { width: w, mode, seed, title });
    put(view.group, cx - 0.005, y);
    updates.push((delta) => view.update(delta));
  };
  const running = (clock: number) => Math.sin(clock * 0.05 + seed) > -0.7;
  const top = height / 2 - 0.09;

  switch (spec.face) {
    case 'meters':
      meter('A  L1', cx - 0.16, -0.02, 1, 1000);
      meter('A  L2', cx - 0.07, -0.02, 2, 1000);
      meter('A  L3', cx + 0.02, -0.02, 3, 1000);
      selector(3, cx + 0.13, -0.03, 0.9, 1);
      legend('PHASE', cx + 0.13, 0.0);
      break;
    case 'main': {
      handle('red', 1.3, width - LATCH_SIDE - 0.05, 0.02);
      const monitor = createPowerMonitor(kit);
      put(monitor.group, cx - 0.1, top - 0.08);
      updates.push((_, clock) => {
        const amps = 412 + wander(clock, seed) * 60;
        monitor.show(
          479 + Math.sin(clock) * 1.5,
          amps,
          (amps * 479 * 1.73 * 0.86) / 1000,
        );
      });
      const danger = createMicroLabel(kit, 'DANGER\n480 VOLTS', {
        height: 0.011,
        ink: '#ffffff',
        plate: '#c42a1e',
      });
      put(danger, cx - 0.1, top - 0.24);
      place(keySwitch(kit, { initial: true }), cx - 0.1, top - 0.36, 1.2);
      caption('KIRK KEY INTERLOCK', cx - 0.1, top - 0.41);
      louvres(0.3, 0.1, cx - 0.04, -height / 2 + 0.09);
      break;
    }
    case 'annunciator': {
      const labels = [
        'BUS\nOVERVOLT',
        'GROUND\nFAULT',
        'PHASE\nLOSS',
        'BREAKER\nTRIP',
        'DINGLE\nARM',
        'MODIAL\nHI',
        'BEARING\nTEMP',
        'LUBE\nLOW',
        'FAN\nFAIL',
        'GRAM-\nMETER',
        'DOOR\nOPEN',
        'SPARE',
      ];
      const panel = createAnnunciatorPanel(kit, labels, {
        columns: 4,
        cell: 0.07,
      });
      put(panel.group, cx - 0.02, top - 0.1);
      const alarms = createAnnunciator(labels.length);
      let acked = 0;
      let testUntil = 0;
      updates.push((_, clock) => {
        alarms.sense(
          labels.map(
            (_, k) =>
              k < 11 && Math.sin(clock * (0.09 + k * 0.017) + k * 2.1) > 0.9,
          ),
        );
        // Somebody walks by and acknowledges, now and then.
        if (clock - acked > 7) {
          acked = clock;
          alarms.acknowledge();
        }
        alarms.test = clock < testUntil;
        panel.set(alarms.lit(clock));
      });
      button(
        'black',
        'TEST',
        cx - 0.12,
        top - 0.3,
        () => (testUntil = now + 2),
      );
      button('amber', 'ACK', cx - 0.02, top - 0.3, () => {
        acked = now;
        alarms.acknowledge();
      });
      button('blue', 'RESET', cx + 0.08, top - 0.3);
      const hours = createHourMeterView(kit);
      put(hours.group, cx - 0.02, top - 0.45);
      updates.push((_, clock) => hours.show(61842.7 + clock / 3600));
      louvres(0.3, 0.08, cx - 0.02, -height / 2 + 0.08);
      break;
    }
    case 'film': {
      station(
        [
          { colour: 'green', legend: 'START' },
          { colour: 'red', legend: 'STOP' },
          { colour: 'black', legend: 'RESET' },
        ],
        cx - 0.06,
        0.04,
      );
      handle('black', 0.9, undefined, 0.04);
      const hours = createHourMeterView(kit);
      put(hours.group, cx - 0.06, -0.22);
      updates.push((_, clock) => hours.show(23117.4 + clock / 3600));
      break;
    }
    case 'smc': {
      const starter = createSoftStarter(kit);
      put(starter.group, cx - 0.045, top - 0.06, 0.95);
      const hoa = selector(3, cx - 0.09, -0.05, 0.9, 2);
      updates.push((_, clock) => {
        // It starts, ramps up over three seconds, runs, and stops again;
        // HAND runs it, OFF stops it.
        const t = clock % 40;
        const on =
          hoa.position.value === 0 || (hoa.position.value === 2 && t < 30);
        const ramp = Math.min(1, t / 3);
        starter.set({
          running: on,
          ramp: on ? ramp : 0,
          fault: false,
          amps: ramp < 1 ? 6 + 30 * ramp : 11.6 + Math.sin(clock * 1.7) * 0.4,
        });
      });
      legend('HAND OFF AUTO', cx - 0.09, -0.02, 0.07);
      lamp(
        'green',
        cx + 0.0,
        -0.05,
        (t) =>
          hoa.position.value === 0 || (hoa.position.value === 2 && t % 40 < 30),
      );
      legend('RUN', cx + 0.0, -0.02, 0.04);
      handle('black', 0.8, undefined, -0.05);
      louvres(0.24, 0.07, cx - 0.03, -height / 2 + 0.07);
      break;
    }
    case 'estop': {
      place(mushroomStop(kit, {}), cx - 0.07, top - 0.06);
      meter('A  AC', cx - 0.07, -0.06, 4, 50);
      lamp('green', cx - 0.11, -0.2, running);
      lamp('red', cx - 0.03, -0.2, (t) => !running(t));
      handle('black', 0.85, undefined, 0.02);
      break;
    }
    case 'small-lamps':
      lamp('red', cx - 0.12, -0.04, (t) => !running(t), 0.8);
      lamp('green', cx - 0.05, -0.04, running, 0.8);
      handle('black', 0.55, width - LATCH_SIDE - 0.03, -0.02);
      break;
    case 'small-station': {
      station(
        [
          { colour: 'green', legend: 'START' },
          { colour: 'red', legend: 'STOP' },
        ],
        cx - 0.07,
        -0.03,
        0.85,
      );
      lamp('green', cx + 0.03, -0.04, running, 0.8);
      handle('black', 0.55, width - LATCH_SIDE - 0.03, -0.02);
      break;
    }
    case 'small-key': {
      selector(2, cx - 0.11, -0.04, 0.8, 1, true);
      legend('LOCAL REMOTE', cx - 0.11, -0.01, 0.06);
      lamp(
        'amber',
        cx - 0.02,
        -0.04,
        (t) => Math.sin(t * 0.3 + seed) > 0.4,
        0.8,
      );
      handle('red', 0.55, width - LATCH_SIDE - 0.03, -0.02);
      break;
    }
    case 'small-lcd': {
      const lcd = createCharacterLcd(kit, {
        columns: 16,
        rows: 2,
        cell: 0.0042,
      });
      put(lcd.group, cx - 0.06, -0.03);
      updates.push((_, clock) =>
        lcd.show(
          [
            'M-204  AUX DRIVE',
            `${(38 + wander(clock, seed) * 22).toFixed(1)} HZ  RUN`,
          ],
          true,
        ),
      );
      handle('black', 0.55, width - LATCH_SIDE - 0.03, -0.02);
      break;
    }
    case 'blank':
      louvres(0.24, 0.09, cx - 0.02, -0.04);
      break;
    case 'crt-trend':
      crt('trend', 0.3, -0.035, 'ENCABULATOR SYSTEMS');
      break;
    case 'crt-vector':
      crt('vector', 0.3, -0.035, 'PHASE REFERENCE SCOPE');
      break;
    case 'crt-log':
      crt('log', 0.3, -0.035, 'DINGLE ARM LOGGER');
      break;
    case 'chart': {
      const chart = createChartRecorder(kit);
      put(chart.group, cx - 0.07, -0.04);
      updates.push((delta, clock) => {
        chart.set([
          wander(clock, seed),
          wander(clock, seed + 3),
          0.3 + wander(clock * 0.3, seed + 6) * 0.2,
        ]);
        chart.update(delta);
      });
      for (const [y, k] of [
        [0.06, 1],
        [-0.11, 2],
      ] as const) {
        const gauge = createRoundGauge(kit, {
          radius: 0.035,
          label: k === 1 ? 'PSI' : '°F',
          scaleMax: k === 1 ? 150 : 300,
        });
        put(gauge.group, cx + 0.105, y);
        updates.push((delta, clock) => {
          gauge.set(0.3 + wander(clock, seed + k * 5) * 0.4);
          gauge.update(delta);
        });
      }
      break;
    }
    case 'bars': {
      for (let k = 0; k < 4; k++) {
        const bar = createBarGraph(kit, 14, { pitch: 0.0075, width: 0.012 });
        put(bar.group, cx - 0.14 + k * 0.03, -0.04);
        updates.push((_, clock) =>
          bar.set(wander(clock * 1.6, seed + k * 1.7)),
        );
      }
      const digits = createSevenSegment(kit, 4, { digitHeight: 0.02 });
      put(digits.group, cx + 0.06, 0.06);
      updates.push((_, clock) =>
        digits.show((wander(clock, seed) * 999).toFixed(0)),
      );
      caption('SEMIBOLOID COUNT', cx + 0.06, 0.03);
      const matrix = createLedMatrix(kit, {
        columns: 20,
        rows: 7,
        pitch: 0.0055,
      });
      put(matrix.group, cx + 0.06, -0.08);
      updates.push((_, clock) =>
        matrix.draw(
          (col, row) =>
            Math.abs(row - 3 - 2.8 * Math.sin(col * 0.5 - clock * 3)) < 0.6,
        ),
      );
      break;
    }
    case 'plc': {
      const terminal = place(operatorTerminal(kit, {}), cx, height * 0.2).view;
      updates.push((_, clock) => {
        terminal.draw((c, w) => {
          c.fillRect(0, 0, w, 18);
          c.fillStyle = '#26476e';
          c.fillText('ENCABULATOR  MAIN', 6, 3);
          c.fillStyle = '#e6eef4';
          c.fillText(
            `DINGLE ARM  ${(wander(clock, seed) * 100).toFixed(0)}%`,
            6,
            26,
          );
          c.fillText(
            `MODIAL      ${(wander(clock, seed + 2) * 9).toFixed(2)}`,
            6,
            44,
          );
          c.fillText(
            `SPURVING    ${(140 + wander(clock, seed + 4) * 30).toFixed(0)} F`,
            6,
            62,
          );
          c.fillText('F1 STATUS  F2 ALARMS', 6, 96);
        });
      });
      caption('PANELVIEW 1000', cx, height * 0.2 - 0.1);
      break;
    }
    case 'terminations': {
      louvres(0.42, 0.18, cx, -0.12);
      const warning = createMicroLabel(
        kit,
        'WARNING\nMULTIPLE SOURCES OF SUPPLY',
        {
          height: 0.01,
          ink: '#151515',
          plate: '#f2c418',
        },
      );
      put(warning, cx, 0.1);
      break;
    }
    case 'drive': {
      crt('mimic', 0.34, height / 2 - 0.27, 'VFD-601 PROCESS');
      const keypad = place(driveKeypad(kit, {}), cx - 0.1, 0.02).view;
      updates.push((_, clock) => {
        keypad.show(
          [
            'VFD-601  RUNNING',
            `${(1150 + wander(clock, seed) * 40).toFixed(0)} RPM  FWD`,
          ],
          true,
        );
      });
      pot(cx + 0.07, 0.04);
      legend('SPEED', cx + 0.07, 0.07);
      for (const [colour, dx, on] of [
        ['#3dff5a', 0.05, true],
        ['#ffb01a', 0.09, false],
      ] as const)
        put(createJewelLamp(kit, colour, { on }).group, cx + dx, -0.04);
      louvres(0.36, 0.34, cx - 0.01, -height / 2 + 0.24);
      break;
    }
    case 'isolator': {
      handle('red', 1.1, width - LATCH_SIDE - 0.045, 0.0);
      meter('A  AC', cx - 0.1, 0.06, 7, 200);
      lamp('green', cx - 0.14, -0.1, () => true);
      lamp('amber', cx - 0.06, -0.1, (t) => Math.sin(t * 0.17 + seed) > 0.7);
      break;
    }
    case 'matrix': {
      const matrix = createLedMatrix(kit, {
        columns: 24,
        rows: 7,
        pitch: 0.005,
      });
      put(matrix.group, cx - 0.05, 0.05);
      updates.push((_, clock) =>
        matrix.draw(
          (col, row) =>
            (col + Math.floor(clock * 8)) % 6 < 3 === (row % 2 === 0),
        ),
      );
      caption('FLOW PULSE', cx - 0.05, 0.015);
      lamp('blue', cx - 0.1, -0.1, running, 0.8);
      lamp('white', cx - 0.03, -0.1, (t) => Math.floor(t) % 2 === 0, 0.8);
      handle('black', 0.75, undefined, -0.02);
      break;
    }
    case 'fan': {
      const gauge = createRoundGauge(kit, {
        radius: 0.05,
        label: 'IN WC',
        scaleMax: 10,
      });
      put(gauge.group, cx - 0.08, 0.0);
      updates.push((delta, clock) => {
        gauge.set(0.45 + wander(clock * 2, seed) * 0.2);
        gauge.update(delta);
      });
      const hours = createHourMeterView(kit);
      put(hours.group, cx + 0.06, 0.03);
      updates.push((_, clock) => hours.show(8812.2 + clock / 3600));
      selector(3, cx + 0.06, -0.1, 0.85, 1);
      legend('LOW OFF HIGH', cx + 0.06, -0.07, 0.065);
      // Wired to nothing yet: it toggles its own light all the same.
      place(
        ledPushbutton(kit, { colour: 'blue', legend: 'BOOST' }),
        cx - 0.08,
        -0.13,
        0.9,
      );
      break;
    }
    case 'grammeter': {
      const monitor = createPowerMonitor(kit);
      put(monitor.group, cx - 0.08, 0.0);
      updates.push((_, clock) =>
        monitor.show(
          120 + Math.sin(clock * 0.7) * 0.6,
          2 + wander(clock, seed) * 3,
          0.4 + wander(clock, seed + 1) * 0.3,
        ),
      );
      station(
        [
          { colour: 'yellow', legend: 'CALIBRATE' },
          { colour: 'black', legend: 'ZERO' },
        ],
        cx + 0.075,
        0.0,
        0.8,
      );
      break;
    }
  }
}

function populateInterior(
  kit: PanelKit,
  bay: Group,
  spec: Bucket,
  x: number,
  y: number,
  h: number,
  w: number,
  mat: {
    liner: Material;
    dark: Material;
    brass: Material;
    copper: Material;
    wire: Material;
  },
  parts: PartSet,
) {
  const mount = (
    part: Object3D,
    px: number,
    py: number,
    pz = -0.27,
    scale = 1,
  ) => {
    part.position.set(x + px, y + py, pz);
    part.scale.setScalar(scale);
    bay.add(part);
  };
  if (spec.kind === 'plc' && h > 0.8) {
    // A vertical 1771 I/O chassis above the reused rack-unit equipment.
    box(bay, mat.dark, w - 0.055, 0.34, 0.026, x, y + 0.27, -0.32);
    const modules = ['P/S', 'CPU', 'DI', 'DI', 'DO', 'DO', 'AI', 'COM'];
    const moduleW = (w - 0.085) / modules.length;
    modules.forEach((name, i) => {
      const px = x - ((modules.length - 1) * moduleW) / 2 + i * moduleW;
      box(bay, mat.liner, moduleW - 0.004, 0.295, 0.055, px, y + 0.27, -0.27);
      box(bay, mat.dark, moduleW - 0.011, 0.025, 0.004, px, y + 0.38, -0.24);
      const label = createMicroLabel(kit, name, {
        height: 0.0037,
        ink: '#222426',
      });
      label.position.set(px, y + 0.19, -0.239);
      bay.add(label);
      box(bay, mat.brass, 0.007, 0.006, 0.004, px, y + 0.3, -0.238);
    });
    const rack = new Group();
    rack.position.set(x, y - h / 2 + 0.11, -0.18);
    rack.scale.setScalar(Math.min(1, (w - 0.035) / 0.4826));
    bay.add(rack);
    let at = 0;
    for (const [label, style, u] of [
      ['1771-P4 POWER', 'vented', 2],
      ['PLC-5/40 CPU', 'display', 3],
      ['1771-IBD INPUT', 'controls', 2],
      ['1771-OBD OUTPUT', 'controls', 2],
      ['1771-IFE ANALOG', 'handles', 2],
      ['1771-KE COMM', 'handles', 2],
    ] as const) {
      // Each module is a part: it can be pulled out of its chassis.
      const unit = parts.add(
        rackUnit(kit, { u, style, label, colour: 'putty', depth: 0.18 }),
      );
      unit.object.position.y = at;
      rack.add(unit.object);
      at += u * 0.04445;
    }
  } else if (spec.kind === 'drive' && h > 0.6) {
    const unit = parts.add(
      rackUnit(kit, {
        u: 5,
        style: 'vented',
        label: 'POWER ELECTRONICS',
        colour: 'grey',
        depth: 0.25,
      }),
    );
    unit.object.scale.setScalar(Math.min(1, (w - 0.04) / 0.4826));
    unit.object.position.set(x, y - 0.25, -0.13);
    bay.add(unit.object);
    for (const dx of [-0.11, 0, 0.11])
      box(bay, mat.dark, 0.055, 0.17, 0.075, x + dx, y + 0.16, -0.28);
  } else if (spec.kind !== 'control') {
    // Molded-case breaker on the bucket backplate, operated by the
    // door-mounted disconnect handle.
    box(
      bay,
      mat.dark,
      Math.min(0.12, w * 0.28),
      Math.min(0.18, h * 0.42),
      0.075,
      x + w * 0.19,
      y + h * 0.11,
      -0.31,
    );
    box(
      bay,
      mat.liner,
      0.022,
      0.045,
      0.018,
      x + w * 0.19,
      y + h * 0.11,
      -0.262,
    );
    const contactor = createContactorView(kit);
    mount(contactor.group, -w * 0.2, -h * 0.16, -0.24, 1.25);
    const overload = createOverloadRelayView(kit);
    mount(overload.group, w * 0.11, -h * 0.2, -0.24, 1.05);
    if (h > 0.45)
      mount(createFuseHolderView(kit).group, -w * 0.22, h * 0.2, -0.24);
  } else {
    // Control relay and terminal strip, with numbered markers.
    for (const dx of [-0.11, 0, 0.11])
      box(bay, mat.dark, 0.045, 0.085, 0.038, x + dx, y + 0.05, -0.31);
  }
  // DIN rail, control wiring duct and terminal strip along each bucket floor.
  box(bay, mat.brass, w - 0.055, 0.008, 0.018, x, y - h / 2 + 0.045, -0.3);
  box(bay, mat.wire, w - 0.05, 0.025, 0.03, x, y - h / 2 + 0.026, -0.26);
  for (let i = 0; i < Math.max(3, Math.floor(w / 0.045)); i++) {
    const px = x - w / 2 + 0.045 + i * 0.04;
    box(bay, mat.liner, 0.027, 0.02, 0.025, px, y - h / 2 + 0.068, -0.27);
    rod(bay, mat.copper, 0.0025, 0.004, px, y - h / 2 + 0.07, -0.25);
  }
}
