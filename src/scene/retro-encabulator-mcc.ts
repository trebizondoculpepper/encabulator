import { createPcbBackplane } from './pcb-backplane';
import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { createCircuitBreaker } from '../game/machine-components';
import { createGraph } from '../game/world/graph';
import type { Binding, Readable } from '../game/world/components';
import { machineComponent } from '../rendering/machine-components';
import type { MachineDevice } from '../rendering/machine-components';
import { createAnnunciator } from '../game/annunciator';
import {
  createPartSet,
  disconnectHandle,
  doorLatch,
  doorBack,
  driveKeypad,
  keySwitch,
  ledPushbutton,
  mushroomStop,
  operatorTerminal,
  pilotLight,
  potentiometer,
  pushButton,
  pushbuttonStation,
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
   * thing that opens a door), rear covers that close it and the rack units inside. A room adds
   * their clicks and updates them; they make their own sounds.
   */
  parts: PartSet;
  /** Every installed active device; the gallery uses these same factories. */
  components: readonly MachineDevice[];
  world: ReturnType<typeof createGraph>;
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
  const components: MachineDevice[] = [];
  const world = createGraph();
  const hinges: {
    group: Group;
    open: () => boolean;
    force(open: boolean): void;
    interior: Group;
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
    // Fixed manufacturer plaques sit on the upper trim, clear of the
    // wireway display and every moving door. The hardware inside retains
    // its own supplier markings (including the rival Pepperdyne cards).
    const brand = createNameplate(kit, 'NEUMAN DYNAMIK', {
      width: 0.36,
      height: 0.042,
      colour: '#202b32',
      ink: '#f0eee5',
    });
    brand.name = `Section ${bayIndex + 1} Neuman Dynamik manufacturer plaque`;
    brand.userData.manufacturer = 'Neuman Dynamik';
    brand.position.set(0, MCC_HEIGHT - 0.025, 0.001);
    // A restrained red keyline gives the repeated wordmark a house style.
    box(brand, kitPaint(kit, '#a52a22'), 0.003, 0.03, 0.0004, -0.168, 0, 0.002);
    bay.add(brand);
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
      // Cull the entire bucket contents, including its parts, while shut.
      const interior = new Group();
      interior.name = `Section ${bayIndex + 1} ${spec.label.replace('\n', ' ')} contents`;
      interior.visible = false;
      // Raycaster does not honour visible=false itself. Stop traversal of
      // hidden interiors so closed buckets cannot expose clickable parts.
      interior.raycast = () => (interior.visible ? undefined : false);
      bay.add(interior);
      box(
        interior,
        liner,
        faceW + 0.004,
        0.008,
        MCC_DEPTH - 0.06,
        faceX,
        cy - h / 2,
        -MCC_DEPTH / 2,
      ).userData.boardSupport = true;
      box(interior, liner, faceW - 0.018, h - 0.02, 0.006, faceX, cy, -0.375);
      const circuit = populateInterior(
        kit,
        interior,
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
        components,
        world,
        `section${bayIndex + 1}.bucket${bucketIndex + 1}`,
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
      dressDoor(
        kit,
        hinge,
        spec,
        faceW,
        h,
        seed,
        updates,
        parts,
        doorPaint,
        circuit,
      );
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
      const back = parts.add(
        doorBack(kit, {
          shared: door,
          material: doorPaint,
          name: `${leaf.name} back`,
          layout: {
            width: faceW - 0.006,
            height: h - 0.006,
            panWidth: panelW,
            panHeight: h - 0.006 - 2 * PANEL_INSET,
            panX: panelX - faceW / 2,
            flangeDepth: FLANGE,
            panDepth: PANEL_DEPTH,
            opening,
          },
        }),
      );
      back.object.position.x = faceW / 2;
      hinge.add(back.object);
      hinges.push({
        group: hinge,
        interior,
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
    components,
    world,
    update(delta) {
      clock += delta;
      for (const update of updates) update(delta, clock);
      parts.update(delta);
      for (const hinge of hinges) {
        const target = hinge.open() ? -1.75 : 0;
        hinge.group.rotation.y +=
          (target - hinge.group.rotation.y) * Math.min(1, delta * 8);
        if (Math.abs(hinge.group.rotation.y - target) < 0.001)
          hinge.group.rotation.y = target;
        hinge.interior.visible =
          hinge.open() || Math.abs(hinge.group.rotation.y) > 0.001;
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
  circuit: BucketCircuit,
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
  ) =>
    place(
      disconnectHandle(kit, { colour, shared: circuit.breaker?.handle }),
      x,
      y,
      scale,
    );
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
  ) =>
    place(
      pushbuttonStation(kit, {
        buttons: buttons.map((b) => ({
          ...b,
          action: /STOP|OFF/i.test(b.legend)
            ? circuit.stop
            : /RESET/i.test(b.legend)
              ? circuit.reset
              : circuit.start,
        })),
      }),
      x,
      y,
      scale,
    );
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
      view.set(
        circuit.powered.value ? 0.35 + wander(clock, seed + k) * 0.3 : 0,
      );
      view.update(delta);
    });
  };
  const crt = (mode: CrtMode, w: number, y: number, title?: string) => {
    const view = createCrtMonitor(kit, { width: w, mode, seed, title });
    put(view.group, cx - 0.005, y);
    updates.push((delta) => view.update(delta));
  };
  const running = (_clock: number) => circuit.running.value;
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
        const demand =
          hoa.position.value === 0 || (hoa.position.value === 2 && t < 30);
        if (demand) circuit.start();
        else circuit.stop();
        const on = circuit.running.value;
        const ramp = Math.min(1, t / 3);
        starter.set({
          running: on,
          ramp: on ? ramp : 0,
          fault: false,
          amps: ramp < 1 ? 6 + 30 * ramp : 11.6 + Math.sin(clock * 1.7) * 0.4,
        });
      });
      legend('HAND OFF AUTO', cx - 0.09, -0.02, 0.07);
      lamp('green', cx + 0.0, -0.05, () => circuit.running.value);
      legend('RUN', cx + 0.0, -0.02, 0.04);
      handle('black', 0.8, undefined, -0.05);
      louvres(0.24, 0.07, cx - 0.03, -height / 2 + 0.07);
      break;
    }
    case 'estop': {
      place(
        mushroomStop(kit, { bound: circuit.emergency }),
        cx - 0.07,
        top - 0.06,
      );
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

interface BucketCircuit {
  breaker?: MachineDevice;
  powered: Readable<boolean>;
  running: Readable<boolean>;
  emergency: Binding<boolean>;
  start(): void;
  stop(): void;
  reset(): void;
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
  installed: MachineDevice[],
  world: ReturnType<typeof createGraph>,
  prefix: string,
): BucketCircuit {
  const request = world.input(`${prefix}.run`, true, {
    where: 'START / STOP station',
  });
  const emergency = world.input(`${prefix}.emergency`, false, {
    where: 'emergency stop',
  });
  const load = world.input(`${prefix}.load`, 0.2, { where: 'load demand' });
  const own: MachineDevice[] = [];
  const put = (
    kind: MachineDevice['kind'],
    px: number,
    py: number,
    pz: number,
    props: Parameters<typeof machineComponent>[2] = {},
  ) => {
    const part = parts.add(
      machineComponent(kit, kind, { name: `${prefix}: ${kind}`, ...props }),
    );
    part.object.position.set(x + px, y + py, pz);
    bay.add(part.object);
    own.push(part);
    installed.push(part);
    return part;
  };
  const empty = signal(false);
  if (spec.face === 'blank')
    return {
      powered: empty,
      running: empty,
      emergency,
      start: () => request.set(true),
      stop: () => request.set(false),
      reset() {},
    };
  const breaker = put(
    'breaker',
    spec.kind === 'plc' ? w / 2 - 0.065 : w * 0.26,
    h * 0.13,
    -0.32,
    {
      breaker: createCircuitBreaker(world, `${prefix}.breaker`),
    },
  );
  const controlFuse = put('fuse', -w * 0.25, h / 2 - 0.075, -0.27, {
    power: breaker.active,
    current: world.fixed(`${prefix}.controlCurrent`, 0.25),
  });
  const powered = computed(
    () => breaker.active.value && controlFuse.active.value,
  );
  // Structural mounting hardware is passive; the terminals themselves have
  // real connection state and interrupt the control feed when loosened.
  box(bay, mat.brass, w - 0.055, 0.008, 0.018, x, y - h / 2 + 0.045, -0.3);
  box(bay, mat.wire, w - 0.05, 0.025, 0.03, x, y - h / 2 + 0.026, -0.26);
  const terminals = Array.from(
    { length: Math.max(4, Math.floor((w - 0.12) / 0.012)) },
    (_, i) =>
      put('terminal', -w / 2 + 0.06 + i * 0.012, -h / 2 + 0.03, -0.27, {
        power: powered,
        input: world.fixed(`${prefix}.terminal${i + 1}.signal`, 1),
      }),
  );
  const controlFeed = computed(
    () => powered.value && terminals[0].active.value,
  );
  let running: Readable<boolean> = computed(
    () => controlFeed.value && request.value && !emergency.value,
  );
  if (spec.kind === 'plc' && h > 0.8) {
    // Custom five-card expansion assembly: 1771-format modules retain
    // catalogue pitch and dimensions rather than stretching to fill the enclosure.
    const assembly = put('backplane', -0.04, 0.27, -0.35, {
      power: controlFeed,
      running,
      input: load,
    });
    installed.push(...assembly.cards!);
    running = assembly.active;
    // Genuine 2U instrument cases, not fictitious rack-mounted 1771 cards.
    for (let i = 0; i < 2; i++)
      put('rack-unit', 0, -h / 2 + 0.18 + i * 0.18, -0.03, {
        rack: {
          label: 'CONTROL INTERFACE',
          style: 'vented',
          u: 2,
          depth: 0.3302,
        },
      });
  } else if (spec.kind === 'drive' && h > 0.6) {
    const pcb = createPcbBackplane(kit, 0.3, 0.45, 650, 'DRIVE BACKPLANE');
    pcb.position.set(x - 0.07, y, -0.31);
    bay.add(pcb);
    const stage = put('drive-power', -0.02, 0.14, -0.29, {
      power: controlFeed,
      running,
      input: world.fixed(`${prefix}.dcBusDemand`, 1),
    });
    const caps = put('capacitors', -0.05, -0.15, -0.27, {
      power: stage.active,
      voltage: computed(() => stage.value.value / 2),
    });
    caps.object.rotation.x = Math.PI / 2;
    running = computed(() => stage.active.value && caps.active.value);
  } else if (spec.kind === 'control' || spec.kind === 'plc') {
    for (const dx of [-0.11, 0, 0.11])
      put('relay', dx, 0.05, -0.29, { power: controlFeed, running });
  } else if (spec.kind !== 'main') {
    let motorFlow: Readable<boolean> = signal(false);
    const overload = put('overload', w * 0.08, -h * 0.2, -0.24, {
      power: controlFeed,
      current: computed(() => (motorFlow.value ? load.value * 8 : 0)),
    });
    const coil = computed(
      () =>
        controlFeed.value &&
        request.value &&
        !emergency.value &&
        !overload.faulted.value,
    );
    const contact = put('contactor', -w * 0.2, -h * 0.16, -0.24, {
      power: controlFeed,
      running: coil,
    });
    motorFlow = computed(() => powered.value && contact.active.value);
    running = motorFlow;
  }
  return {
    breaker,
    powered,
    running,
    emergency,
    start: () => request.set(true),
    stop: () => request.set(false),
    reset: () => {
      for (const device of own) device.repair();
      emergency.set(false);
    },
  };
}
