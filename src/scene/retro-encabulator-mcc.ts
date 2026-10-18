import { neumannDiagnostics } from '../toolkit/components/industrial-control/parts/neumann-diagnostics';
import { createCablePartition } from '../toolkit/components/industrial-control/views/cabinet-rear-fittings';
import { createEncabulatorRear } from './encabulator-rear';
import type { RearBucket } from './encabulator-rear';
import { createScreenBoot } from '../toolkit/components/industrial-control/logic/screen-boot';
import { drawBootScreen } from '../toolkit/components/industrial-control/views/boot-screen';
import { machineTone } from '../toolkit/components/sound/audio/machine-tones';
import type { MachineToneId } from '../toolkit/components/sound/audio/machine-tones';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import type { SoundRecipe } from '../toolkit/components/core/audio/part-audio';
import {
  bootBeep,
  postBeep,
} from '../toolkit/components/sound/audio/boot-beep';
import { createMachinePower } from '../game/machine-power';
import {
  FAILURES,
  failureAt,
  faultsAt,
  smokeAt,
  sootAfter,
} from '../game/machine-failure';
import type { Failure, FailureId } from '../game/machine-failure';
import {
  ISOLATOR,
  createIncomingIsolator,
} from '../toolkit/components/industrial-control/views/incoming-isolator';
import { createShortSpark } from '../toolkit/components/core/views/button-effects';
import { stackLightAt } from '../game/stack-light';
import type { MachineState } from '../game/stack-light';
import { createUnitSmoke } from './mcc-smoke';
import type { SootedFace } from './mcc-smoke';
import { createPcbBackplane } from '../toolkit/components/industrial-control/views/pcb-backplane';
import { computed, signal } from '@preact/signals-core';
import type { Signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { createCircuitBreaker } from '../toolkit/components/industrial-control/logic/machine-components';
import { createGraph } from '../toolkit/components/core/logic/world/graph';
import type {
  Binding,
  Readable,
} from '../toolkit/components/core/logic/world/components';
import { machineComponent } from '../toolkit/components/industrial-control/parts/machine-components';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import { createAnnunciator } from '../toolkit/components/industrial-control/logic/annunciator';
import { createSoftStarter as createSoftStarterLogic } from '../toolkit/components/industrial-control/logic/soft-starter';
import {
  beginPart,
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
} from '../toolkit/components/core/parts/parts';
import type { Part, PartSet } from '../toolkit/components/core/parts/parts';
import {
  createAnnunciatorPanel,
  createChartRecorder,
  createLcdMonitor,
  createDoorLeaf,
  createLouvres,
  createPowerMonitor,
  createSoftStarter,
  createViewingWindow,
} from '../toolkit/components/industrial-control/views/cabinet-fittings';
import type { LcdMode } from '../toolkit/components/industrial-control/views/cabinet-fittings';
import { createBrandBadge } from '../toolkit/components/core/views/brand-badge';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  createBarGraph,
  createMicroLabel,
  createSevenSegment,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createLegendPlate,
  createNameplate,
} from '../toolkit/components/industrial-control/views/industrial-controls';
import type { OperatorColour } from '../toolkit/components/industrial-control/views/industrial-controls';
import {
  createHourMeterView,
  createMessageDisplay,
  createStackLight,
} from '../toolkit/components/industrial-control/views/industrial-displays';

import {
  createCharacterLcd,
  createJewelLamp,
  createLedMatrix,
  createPanelMeter,
  createRoundGauge,
} from '../toolkit/components/industrial-control/views/panel-instruments';
import {
  MCC_BLUE,
  createWornPaint,
} from '../toolkit/components/core/views/worn-paint';

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
/** The middle of the incoming isolator, to the left of the line-up. */
export const MCC_ISOLATOR_X =
  -MCC_WIDTH / 2 - ISOLATOR.gap - ISOLATOR.width / 2;

/** Which fittings a unit's door wears; see `dressDoor`. */
export type Face =
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
  | 'lcd-trend'
  | 'lcd-log'
  | 'lcd-vector'
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
  /**
   * What it sounds like while the machine has power, if anything: one of
   * the machine tones (`src/toolkit/components/sound/audio/machine-tones.ts`, heard in dev12), at a
   * rate (slower for a bigger machine) and a level, held from inside the
   * bucket, so it is heard from there. Only what would have cooling or
   * something turning sounds; the rest are quiet.
   */
  tone?: { id: MachineToneId; rate: number; level: number };
  /**
   * A fixed cover, bolted shut, instead of a door: not every unit opens.
   * Its fittings are on the cover; its works are inside, never seen.
   */
  fixed?: boolean;
};
const BAYS: Bucket[][] = [
  [
    {
      spaces: 2,
      label: 'MAIN INCOMING\n480 VAC 3 PH',
      kind: 'main',
      face: 'meters',
      fixed: true,
    },
    {
      spaces: 5,
      label: 'MAIN DISCONNECT\n100 A',
      kind: 'main',
      face: 'main',
      fixed: true,
    },
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
      tone: { id: 'motor', rate: 0.8, level: 0.055 },
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
    tone:
      i === 0 ? { id: 'pump' as const, rate: 0.6, level: 0.045 } : undefined,
  })),
  [
    {
      spaces: 3,
      label: 'ENCABULATOR\nCONTROL',
      kind: 'control',
      face: 'lcd-trend',
      tone: { id: 'cabinet-fan', rate: 0.85, level: 0.045 },
    },
    { spaces: 3, label: 'MODIAL\nINTERACTION', kind: 'control', face: 'chart' },
    {
      spaces: 3,
      label: 'PHASE\nREFERENCE',
      kind: 'control',
      face: 'lcd-vector',
    },
    { spaces: 3, label: 'PANENDERMIC\nMONITOR', kind: 'control', face: 'bars' },
  ],
  [
    {
      spaces: 8,
      label: 'PLC-5 / 1771\nAUTOMATION CONTROL',
      kind: 'plc',
      face: 'plc',
      tone: { id: 'cabinet-fan', rate: 1.15, level: 0.04 },
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
      tone: { id: 'drive-fan', rate: 1, level: 0.07 },
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
      face: 'lcd-log',
    },
    {
      spaces: 3,
      label: 'HYDROCOPTIC\nPUMP',
      kind: 'aux',
      face: 'matrix',
      tone: { id: 'pump', rate: 0.9, level: 0.06 },
    },
    {
      spaces: 3,
      label: 'PANENDERMIC\nFAN',
      kind: 'aux',
      face: 'fan',
      tone: { id: 'blower', rate: 1, level: 0.06 },
    },
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
  /** The exact green-tier indication, shared with observers. */
  steady: Readable<boolean>;
  diagnosticFault: Readable<boolean>;
  diagnosticEndpoint: Readable<boolean>;
  /** Incoming isolator, upstream of the machine main disconnect. */
  supply: Readable<boolean>;
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
  isDoorOpen(index: number): boolean;
  /** How many unit doors it has. */
  doorCount: number;
  /**
   * Door controls a scenario may watch, by name, each as a position:
   * `drive.speed` (the VFD-601's SPEED knob, 0 to 10), `fan.mode` (the
   * panendermic fan's LOW OFF HIGH selector, 0 to 2), `fan.boost` (its
   * BOOST button, 1 on), `hydraulic.key` (the hydraulic pump's LOCAL
   * REMOTE key, 0 LOCAL), `incoming.phase` (MAIN INCOMING's PHASE
   * selector, 0 to 2), `main.kirk` (the main disconnect's Kirk key, 1
   * on), `feed.hoa` (the feed motor's HAND OFF AUTO, 0 HAND),
   * `annunciator.tests` (how many times its TEST has been pressed),
   * `auxiliary.stop` (the auxiliary motor's emergency stop, 1 pushed) and
   * `automation.reset` (how many times Automation Control's RESET has been
   * pressed; it restarts a stalled machine).
   */
  controls: ReadonlyMap<string, { position: Readable<number> }>;
  /**
   * How fast the machine runs, as a share of normal, set by a scenario:
   * every running sound follows it, so its note shifts as a stage comes in.
   */
  pitch: Signal<number>;
  /** The failure playing out, or limping on, if any. */
  readonly failure: FailureId | null;
  /**
   * Make the machine give up, one of `FAILURES`, if it is running: its
   * sounds sag, sputter and slide away; a fatal one trips its main breaker.
   */
  fail(id: FailureId): void;
  /** Put the machine back as it was, closing a breaker a failure tripped. */
  recover(): void;
  /** Whether a sputter has left the machine stalled: powered but stopped. */
  readonly stalled: boolean;
  /** Sputter a stalled (or any running) machine back into life. */
  restart(): void;
  /** Each bucket's circuit, by bucket id (`section5.bucket1`). */
  rear: ReturnType<typeof createEncabulatorRear>;
  circuits: ReadonlyMap<string, BucketCircuit>;
  /** Whether each opening unit's door is open, by bucket id. */
  doors: ReadonlyMap<string, Readable<boolean>>;
  /** The main breaker, which a failure may trip. */
  mainBreaker: ReturnType<typeof createCircuitBreaker>;
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
export interface MccOptions {
  incomingOn?: boolean;
  diagnosticsAvailable?: Readable<boolean>;
  /**
   * Whether the drive train's deep hum starts with the main power, rather
   * than waiting for the drive to boot (Level 2's script has it begin the
   * moment the master power goes on).
   */
  driveTrainWithMains?: boolean;
  toneEnabled?: Partial<Record<string, Readable<boolean>>>;
  /** Scripted training sequences can hold a bucket's feed until its cue. */
  bucketFeed?: Partial<Record<string, Readable<boolean>>>;
  /** Bucket IDs such as section5.bucket1; windowed PLC buckets default to always. */
  interiorVisibility?: Partial<Record<string, 'always' | 'when-open'>>;
  /**
   * A room's own fittings for a unit's door, by face: return true to
   * replace the line-up's own for that unit (Level 0 wires every panel to
   * its own model this way, leaving Level 2's as they are).
   */
  dress?: (face: Face, bucket: string, door: DoorKit) => boolean;
  /** A permissive in series with a starter's contactor coil, by bucket. */
  interlock?: Partial<Record<string, Readable<boolean>>>;
  /** Holds a bucket breaker's handle where it is (a Kirk key), by bucket. */
  breakerLatch?: Partial<Record<string, Readable<boolean>>>;
  /** Scales a bucket's machine tone's rate, as its machine runs faster. */
  toneRate?: Partial<Record<string, Readable<number>>>;
  /** The drive train's hum: while it runs, and at what share of its speed. */
  driveTrain?: { running: Readable<boolean>; rate: Readable<number> };
  /** What the stack light shows, instead of the line-up's own failures. */
  stackLight?: (screensBooting: boolean) => MachineState;
}

/** What a room's `dress` is given to fit a door with. */
export interface DoorKit {
  kit: PanelKit;
  hinge: Group;
  width: number;
  height: number;
  /** The raised panel's middle, and a little below the nameplate. */
  cx: number;
  top: number;
  seed: number;
  doorPaint: Material;
  circuit: BucketCircuit;
  /** Lit: the unit's own supply, after the lamp test. */
  lit: Readable<boolean>;
  parts: PartSet;
  /** Run every frame, with the line-up's clock. */
  every(update: (delta: number, clock: number) => void): void;
  put(part: Object3D, x: number, y: number, scale?: number): Object3D;
  place<P extends Part>(part: P, x: number, y: number, scale?: number): P;
  caption(text: string, x: number, y: number, size?: number): void;
  legend(text: string, x: number, y: number, w?: number): Object3D;
  handle(
    colour?: 'black' | 'red',
    scale?: number,
    x?: number,
    y?: number,
  ): Part;
  louvres(w: number, h: number, x: number, y: number): void;
  /** A screen's boot on the unit's own supply, beeping when it is ready. */
  screenBoot(
    name: string,
    from: Object3D,
    chosen?: SoundRecipe,
  ): ReturnType<typeof createScreenBoot>;
  /** Count this boot as the unit's own readiness (its tone waits on it). */
  ready(boot: Readable<boolean>): void;
  register(name: string, part: { position: Readable<number> }): void;
}

export function createRetroEncabulatorMcc(
  kit: PanelKit,
  options: MccOptions = {},
): MccView {
  const group = new Group();
  group.name = 'Allen-Bradley CENTERLINE-style Retro Encabulator MCC';
  // Everything above the plinth stands in its own group.
  const lineup = new Group();
  lineup.position.y = MCC_PLINTH;
  group.add(lineup);
  const parts = createPartSet();
  const components: MachineDevice[] = [];
  const steady = signal(false);
  const world = createGraph();
  // The supply comes in through the isolator to the left of the line-up
  // and lands in MAIN INCOMING, live whenever the isolator is on; the main
  // disconnect, after it, feeds everything else (`mains`).
  const isolator = createIncomingIsolator(
    kit,
    options.incomingOn ? 'on' : 'off',
  );
  isolator.group.position.x = MCC_ISOLATOR_X;
  group.add(isolator.group);
  parts.add(isolator.handle);
  const supply = isolator.handle.on;
  const mainBreaker = createCircuitBreaker(world, 'section1.bucket2.breaker');
  mainBreaker.position.set('off');
  const mains = computed(() => supply.value && mainBreaker.closed.value);
  const startup = createMachinePower(mains);
  // How fast the machine runs, as a share of normal: every running sound
  // follows it, pitch and pace together. `pitch` is set by a scenario (the
  // note shifting as a stage comes in); `strain` by a failure.
  const pitch = signal(1);
  const strain = signal(1);
  const running = computed(() => pitch.value * strain.value);
  // A failure can flicker or kill the lamps and displays.
  const lampsOk = signal(true);
  // A hiccup trips the sections' own sounds out for a moment.
  const dropped = signal(false);
  // What a failure brings up on the annunciator (see `Faults`).
  const faults: Faults = {
    active: signal(false),
    failure: signal<FailureId | null>(null),
    alarms: signal<readonly string[]>([]),
    acknowledged: signal<readonly string[]>([]),
    battery: supply,
  };
  // A stopped machine is a silent one: its sounds fade as it slows.
  const audible = computed(() => Math.min(1, strain.value * 3));
  const lamps = computed(() => startup.lit.value && lampsOk.value);
  // Preserve the former open-door loudness; attenuate the closed cabinet
  // until the difference is 9 dB.
  const openGain = 10 ** (4 / 20);
  const closedGain = openGain / 10 ** (9 / 20);
  let driveReady: Readable<boolean> = mains;
  let driveDoorOpen: Readable<boolean> = signal(false);
  let driveBay: Group | undefined;
  let plcBay: Group | undefined;
  const hinges: {
    group: Group;
    open: () => boolean;
    force(open: boolean): void;
    interior: Group;
    alwaysRender: boolean;
    section: number;
    centre: number;
  }[] = [];
  const rearBuckets: RearBucket[] = [];
  const updates: ((delta: number, clock: number) => void)[] = [];
  const controls = new Map<string, { position: Readable<number> }>();
  const circuits = new Map<string, BucketCircuit>();
  const doors = new Map<string, Readable<boolean>>();
  let bootNote = 0;
  /** Every screen that boots, for the stack light to wait on. */
  const screens: ReturnType<typeof createScreenBoot>[] = [];
  const screenReadyBeep = (
    boot: ReturnType<typeof createScreenBoot>,
    from: Object3D,
    chosen?: SoundRecipe,
  ) => {
    // Rising a semitone at a time from just above the terminal's 880 Hz POST.
    const hz = 880 * 2 ** (++bootNote / 12);
    screens.push(boot);
    let wasReady = false;
    updates.push(() => {
      const ready = boot.ready.value;
      if (ready && !wasReady) partAudio.play(chosen ?? bootBeep(hz), from);
      wasReady = ready;
    });
  };
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
  // Individual rear panels replace the former continuous outer sheet.
  for (let phase = 0; phase < 3; phase++) {
    const y = MCC_HEIGHT - 0.24 - phase * 0.042;
    box(lineup, copper, total - 0.05, 0.018, 0.012, 0, y, -0.43);
  }
  box(lineup, copper, total - 0.05, 0.012, 0.015, 0, 0.09, -0.44);

  /** Every unit's face, by its bucket id, for the smoke to stain. */
  const unitFaces = new Map<
    string,
    { section: Group; bay: number; face: SootedFace; centre: number }
  >();
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
    if (bayIndex === 5) driveBay = bay;
    if (bayIndex === 4) plcBay = bay;
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
    if (bayIndex === 3 || bayIndex === 4) {
      let bucketTop = MCC_HEIGHT - WIREWAY;
      const holes = BAYS[bayIndex].map((bucket) => {
        const height = bucket.spaces * SPACE;
        const y = bucketTop - height / 2 - 0.035 - MCC_HEIGHT / 2;
        bucketTop -= height;
        return { x: -0.432 + MCC_DEPTH / 2, y };
      });
      const partition = createCablePartition(
        kit,
        MCC_DEPTH - 0.03,
        MCC_HEIGHT - 2 * WIREWAY,
        holes,
        liner,
      );
      partition.rotation.y = -Math.PI / 2;
      partition.position.set(
        width / 2 - channel,
        MCC_HEIGHT / 2,
        -MCC_DEPTH / 2,
      );
      bay.add(partition);
    } else {
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
    }
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
    // The maker's logo, from its one definition (dev4), on a dark plate
    // in the middle of each section's top wireway cover, as a line-up's
    // maker marks every section; not on the section whose cover carries
    // the message display. The hardware inside keeps its own makers'
    // marks (including the rival Pepperdyne cards).
    if (bayIndex !== 3) {
      const brand = createBrandBadge(kit, 'neumann-dynamik', {
        height: 0.024,
        ink: '#f0eee5',
        plate: '#202b32',
      });
      brand.name = `Section ${bayIndex + 1} Neumann Dynamik manufacturer plaque`;
      brand.position.set(0, MCC_HEIGHT - WIREWAY / 2, 0.0065);
      bay.add(brand);
    }
    if (bayIndex === 3) {
      // The plant message display over the control section, as in the film.
      const message = createMessageDisplay(kit, { caption: 'DATALINE 1500' });
      message.group.scale.setScalar(0.95);
      message.group.position.set(-0.02, MCC_HEIGHT - WIREWAY / 2, 0.006);
      bay.add(message.group);
      const boot = createScreenBoot(mains, 'DATALINE');
      updates.push((delta) => boot.step(delta));
      screenReadyBeep(boot, message.group);
      updates.push((_, clock) =>
        message.show(
          boot.booting
            ? boot.lines(2, 20)
            : MESSAGES[Math.floor(clock / 4) % MESSAGES.length],
          lamps.value,
        ),
      );
    }
    if (bayIndex === 4) {
      const stack = createStackLight(kit);
      stack.group.position.set(-0.2, MCC_HEIGHT, -0.15);
      bay.add(stack.group);
      stack.group.name = 'Machine stack light';
      // Red flashing in a fault, amber while it boots, green running.
      updates.push((_, clock) => {
        const booting = screens.some((screen) => screen.booting);
        const tiers = stackLightAt(
          options.stackLight?.(booting) ?? {
            powered: lamps.value,
            battery: faults.battery.value,
            fault: faults.active.value,
            restarting: faults.failure.value === 'restart',
            booting,
          },
          clock,
        );
        steady.value = tiers[2];
        stack.group.userData.lit = tiers;
        stack.set(tiers);
      });
    }
    let top = MCC_HEIGHT - WIREWAY;
    for (const [bucketIndex, spec] of BAYS[bayIndex].entries()) {
      const h = spec.spaces * SPACE;
      const cy = top - h / 2;
      rearBuckets.push({
        id: `section${bayIndex + 1}.bucket${bucketIndex + 1}`,
        section: bayIndex + 1,
        centre: cy,
        height: h,
      });
      top -= h;
      // MAIN INCOMING is before the main disconnect: live from the isolator.
      const bucketId = `section${bayIndex + 1}.bucket${bucketIndex + 1}`;
      const incoming = bayIndex === 0 && bucketIndex === 0;
      const baseFeed = incoming ? supply : mains;
      const gate = options.bucketFeed?.[bucketId];
      const feed = gate
        ? computed(() => baseFeed.value && gate.value)
        : baseFeed;
      let toneReady: Readable<boolean> = feed;
      let doorOpen: Readable<boolean> = signal(false);
      const plcReady = signal(false);
      // Cull the entire bucket contents, including its parts, while shut.
      const interior = new Group();
      interior.name = `Section ${bayIndex + 1} ${spec.label.replace('\n', ' ')} ${spec.fixed ? 'sealed works' : 'contents'}`;
      const alwaysRender =
        (options.interiorVisibility?.[bucketId] ??
          (spec.face === 'plc' ? 'always' : 'when-open')) === 'always';
      interior.userData.interiorVisibility = alwaysRender
        ? 'always'
        : 'when-open';
      interior.visible = alwaysRender;
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
        bucketId,
        mainBreaker,
        incoming ||
          bucketId === 'section1.bucket2' ||
          spec.face === 'annunciator'
          ? supply
          : feed,
        incoming ? supply : lamps,
        plcReady,
        faults.active,
        options.interlock?.[bucketId],
        options.breakerLatch?.[bucketId],
        options.diagnosticsAvailable,
      );
      circuits.set(bucketId, circuit);
      const hinge = new Group();
      hinge.position.set(faceX - faceW / 2, cy, 0.003);
      bay.add(hinge);
      unitFaces.set(bucketId, {
        section: bay,
        bay: bayIndex,
        centre: faceX,
        face: {
          hinge,
          x: 0.003,
          width: faceW - 0.006,
          bottom: cy - h / 2 + 0.003,
          top: cy + h / 2 - 0.003,
          z: DOOR_FRONT + 0.0006,
        },
      });
      const doorPaint = worn(faceW, h, { x: 0.86, y: 0.5 });
      const opening =
        spec.face === 'plc'
          ? { x: 0, y: -h * 0.23, width: faceW * 0.74, height: h * 0.42 }
          : null;
      const name = `Section ${bayIndex + 1} ${spec.label.replace('\n', ' ')} ${spec.fixed ? 'cover' : 'door'}`;
      // The pan behind the face, set over to the hinge side.
      const panelW = faceW - 0.006 - PANEL_INSET - LATCH_SIDE;
      const panelX = faceW / 2 + (PANEL_INSET - LATCH_SIDE) / 2;
      if (spec.fixed) {
        // A flat cover plate, screwed on at its corners.
        const cover = box(
          hinge,
          doorPaint,
          faceW - 0.006,
          h - 0.006,
          FLANGE,
          faceW / 2,
          0,
          0,
        );
        cover.name = name;
        for (const sx of [0.018, faceW - 0.018])
          for (const sy of [h / 2 - 0.018, -h / 2 + 0.018])
            box(hinge, dark, 0.008, 0.008, 0.003, sx, sy, DOOR_FRONT + 0.0015);
      } else {
        const leaf = createDoorLeaf(
          faceW - 0.006,
          h - 0.006,
          FLANGE,
          doorPaint,
          opening,
        );
        leaf.position.set(faceW / 2, 0, -FLANGE / 2);
        leaf.name = name;
        hinge.add(leaf);
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
      }
      const plate = createNameplate(kit, spec.label, {
        width: Math.min(0.205, faceW * 0.57),
        height: h < 0.35 ? 0.035 : 0.046,
      });
      plate.position.set(faceW * 0.43, h / 2 - 0.052, DOOR_FRONT + 0.001);
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
        incoming ? supply : lamps,
        mains,
        (ready) => (toneReady = ready),
        screenReadyBeep,
        (name, part) => controls.set(name, part),
        faults,
        () => (failing?.failure.id === 'kaput' ? failing.t : null),
        bucketId,
        options.dress,
      );
      if (!spec.fixed) {
        // Quarter-turn wing latches on the flange, by the free edge: the
        // only part of the door that opens it. Both toggle the one door;
        // its rear cover also closes it when approached from behind.
        let shared: ReturnType<typeof doorLatch>['door'] | undefined;
        for (const y of [h / 2 - 0.05, -h / 2 + 0.05]) {
          const latch = parts.add(
            doorLatch(kit, {
              material: dark,
              large: h >= 0.6,
              shared,
              name: `${name} latch`,
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
        doorOpen = door.state;
        doors.set(bucketId, door.state);
        if (spec.face === 'drive') driveDoorOpen = door.state;
        const back = parts.add(
          doorBack(kit, {
            shared: door,
            material: doorPaint,
            name: `${name} back`,
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
          alwaysRender,
          section: bayIndex + 1,
          centre: cy,
          open: () => door.state.value,
          force: (open) => door.set(open),
        });
      }
      if (spec.face === 'drive') driveReady = toneReady;
      if (spec.face === 'plc')
        updates.push(() => (plcReady.value = toneReady.value));
      if (spec.tone) {
        const { id, rate, level } = spec.tone;
        const sound = beginPart(
          kit,
          `${spec.label.replace('\n', ' ')} ${id} tone`,
        );
        sound.object.position.set(faceX, cy, -MCC_DEPTH / 2);
        sound.holdWhile(
          computed(
            () =>
              toneReady.value &&
              (options.toneEnabled?.[bucketId]?.value ?? true),
          ),
          machineTone(
            id,
            computed(
              () =>
                rate *
                running.value *
                (options.toneRate?.[bucketId]?.value ?? 1),
            ),
            computed(
              () =>
                level *
                (doorOpen.value ? openGain : closedGain) *
                (dropped.value ? 0 : audible.value),
            ),
          ),
        );
        parts.add(sound.part());
        bay.add(sound.object);
      }
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
  const rear = createEncabulatorRear(kit, {
    widths: BAY_WIDTHS,
    height: MCC_HEIGHT,
    depth: MCC_DEPTH,
    parts,
    paint: (width, height, seed) =>
      createWornPaint(kit, {
        colour: MCC_BLUE,
        width,
        height,
        seed,
        wear: 'light',
      }),
    buckets: rearBuckets,
  });
  lineup.add(rear.group);
  const drive = beginPart(kit, 'Encabulator drive train');
  drive.object.position.set(-0.0525, 0.7, -MCC_DEPTH / 2);
  drive.holdWhile(
    options.driveTrain?.running ??
      (options.driveTrainWithMains ? mains : driveReady),
    machineTone(
      'motor',
      computed(() => running.value * (options.driveTrain?.rate.value ?? 1)),
      computed(
        () =>
          0.07 * (driveDoorOpen.value ? openGain : closedGain) * audible.value,
      ),
    ),
  );
  parts.add(drive.part());
  driveBay!.add(drive.object);
  // A failure: the machine conks out like the Millennium Falcon's
  // hyperdrive (`src/game/machine-failure.ts`). Its own sounds bend with
  // `strain`, a thin spooling whine slides down over them, and it coughs.
  let failing: { failure: Failure; t: number; coughed: number } | null = null;
  let killed = false;
  const whining = signal(false);
  const whine = beginPart(kit, 'Encabulator failure whine');
  whine.holdWhile(
    whining,
    machineTone(
      'turbine',
      computed(() => 0.45 * strain.value),
      0.05,
      { up: 0.05, down: 0.3, floor: 1 },
    ),
  );
  parts.add(whine.part());
  drive.object.add(whine.object);
  const cough: SoundRecipe = {
    click: {
      band: 520,
      q: 0.8,
      decay: 0.11,
      level: 0.45,
      thump: [52, 0.2],
      repeat: [3, 0.055],
    },
  };
  // Discharge at the edges of the actual door controls, where a loose
  // connection or damaged contact could arc, rather than panel centres.
  const upperBucketCentre = MCC_HEIGHT - WIREWAY - 4 * SPACE;
  const controlX = -0.105 / 2 + (PANEL_INSET - LATCH_SIDE) / 2;
  const sparks = (
    [
      // Upper right of the drive LCD; lower left of its keypad.
      [
        driveBay!,
        controlX + 0.34 * 0.4,
        upperBucketCentre + 4 * SPACE - 0.27 + 0.34 * 0.3,
      ],
      [
        driveBay!,
        controlX - 0.1 - 0.075 / 2,
        upperBucketCentre + 0.02 - 0.115 / 2,
      ],
      // Upper right of Automation Control's operator terminal.
      [
        plcBay!,
        controlX + 0.25 / 2,
        upperBucketCentre + 8 * SPACE * 0.2 + 0.17 / 2,
      ],
    ] as const
  ).map(([bay, x, y]) => {
    const spark = createShortSpark(kit, 14);
    spark.group.scale.setScalar(3);
    spark.group.position.set(x, y, DOOR_FRONT + 0.035);
    bay.add(spark.group);
    updates.push((delta) => spark.update(delta, false));
    return spark;
  });
  let sparked = 0;
  const bang: SoundRecipe = {
    sequence: [
      {
        at: 0,
        click: {
          band: 2600,
          q: 0.7,
          decay: 0.16,
          level: 0.9,
          thump: [44, 0.32],
        },
      },
      {
        at: 0.03,
        click: {
          band: 5200,
          q: 1.2,
          decay: 0.03,
          level: 0.5,
          repeat: [5, 0.035],
        },
      },
    ],
  };
  // Smoke from the units a failure burns, and the soot it leaves on the
  // units above them in the same section.
  const smokes = FAILURES.flatMap((f) =>
    (f.smoke?.from ?? []).map((id, i) => {
      const source = unitFaces.get(id)!;
      const faces = [...unitFaces.values()]
        .filter(
          (u) => u.bay === source.bay && u.face.bottom >= source.face.bottom,
        )
        .map((u) => u.face);
      return {
        failure: f.id,
        soot: 0,
        view: createUnitSmoke(source.section, {
          x: source.centre,
          width: source.face.width,
          seam: source.face.top + 0.003,
          z: DOOR_FRONT,
          seed: 4100 + i,
          faces,
        }),
      };
    }),
  );
  let smokeClock = 0;
  const stepSmoke = (delta: number) => {
    smokeClock += delta;
    for (const smoke of smokes) {
      const strength =
        failing?.failure.id === smoke.failure
          ? smokeAt(smoke.failure, failing.t)
          : 0;
      smoke.soot = sootAfter(smoke.soot, strength, delta);
      smoke.view.update(smokeClock, strength, smoke.soot);
    }
  };
  const stepFailure = (delta: number) => {
    if (!failing) return;
    failing.t += delta;
    const { failure, t } = failing;
    const now = failureAt(failure.id, t);
    strain.value = now.speed;
    lampsOk.value = now.lit;
    const raised = faultsAt(failure.id, t);
    faults.active.value = true;
    faults.failure.value = failure.id;
    faults.alarms.value = raised.alarms;
    faults.acknowledged.value = raised.acknowledged;
    dropped.value = Boolean(
      failure.dropout && t >= failure.dropout[0] && t < failure.dropout[1],
    );
    whining.value =
      t < failure.seconds && failure.ends !== 'running' && mains.value;
    while (
      failing.coughed < failure.coughs.length &&
      failure.coughs[failing.coughed] <= t
    ) {
      failing.coughed++;
      if (mains.value) partAudio.play(cough, drive.object);
    }
    while (sparked < failure.sparks.length && failure.sparks[sparked] <= t) {
      const spark = sparks[sparked % sparks.length];
      spark.fire();
      if (
        sparked === 0 ||
        failure.sparks[sparked] - failure.sparks[sparked - 1] > 1
      )
        partAudio.play(bang, spark.group);
      sparked++;
    }
    if (t < failure.seconds) return;
    if (failure.ends === 'dead' && !killed) {
      killed = true;
      // The breaker trips: everything runs down and every lamp goes out.
      mainBreaker.trip();
      whining.value = false;
    }
    if (failure.ends === 'running') {
      failing = null;
      dropped.value = false;
      faults.active.value = false;
      faults.failure.value = null;
    }
  };
  /** Start a failure, or a restart, from the beginning. */
  const begin = (id: FailureId) => {
    failing = { failure: FAILURES.find((f) => f.id === id)!, t: 0, coughed: 0 };
    sparked = 0;
    killed = false;
  };
  let lastReset = 0;
  let clock = 0;
  for (const update of updates) update(0, 0);
  parts.update(0);
  return {
    group,
    parts,
    components,
    steady,
    diagnosticFault: faults.active,
    diagnosticEndpoint: computed(
      () =>
        circuits.get('section1.bucket3')?.diagnostics?.online.value ?? false,
    ),
    supply,
    world,
    update(delta) {
      clock += delta;
      startup.step(delta);
      const resets = controls.get('automation.reset')?.position.value ?? 0;
      if (resets !== lastReset) {
        lastReset = resets;
        if (
          failing?.failure.ends === 'stalled' &&
          failing.t >= failing.failure.seconds &&
          mains.value
        )
          begin('restart');
      }
      stepFailure(delta);
      stepSmoke(delta);
      for (const update of updates) update(delta, clock);
      parts.update(delta);
      rear.update();
      for (const hinge of hinges) {
        const target = hinge.open() ? -1.75 : 0;
        hinge.group.rotation.y +=
          (target - hinge.group.rotation.y) * Math.min(1, delta * 8);
        if (Math.abs(hinge.group.rotation.y - target) < 0.001)
          hinge.group.rotation.y = target;
        hinge.interior.visible =
          hinge.alwaysRender ||
          hinge.open() ||
          rear.access(hinge.section, hinge.centre) ||
          Math.abs(hinge.group.rotation.y) > 0.001;
      }
    },
    openAll(open) {
      for (const hinge of hinges) hinge.force(open);
    },
    door(index) {
      const hinge = hinges[index];
      hinge?.force(!hinge.open());
    },
    isDoorOpen(index) {
      return hinges[index]?.open() ?? false;
    },
    controls,
    pitch,
    get failure() {
      return failing?.failure.id ?? null;
    },
    get stalled() {
      return (
        failing?.failure.ends === 'stalled' &&
        failing.t >= failing.failure.seconds
      );
    },
    fail(id) {
      if (mains.value) begin(id);
    },
    restart() {
      if (mains.value) begin('restart');
    },
    recover() {
      failing = null;
      // Cleaned up, as if it had never burnt.
      for (const smoke of smokes) smoke.soot = 0;
      strain.value = 1;
      lampsOk.value = true;
      dropped.value = false;
      faults.active.value = false;
      faults.failure.value = null;
      faults.alarms.value = [];
      faults.acknowledged.value = [];
      whining.value = false;
      if (killed && mainBreaker.position.value === 'tripped') {
        mainBreaker.position.set('on');
      }
      killed = false;
    },
    get doorCount() {
      return hinges.length;
    },
    rear,
    circuits,
    doors,
    mainBreaker,
  };
}

/** A failure's faults, as the annunciator shows them. */
interface Faults {
  /** Whether a failure is playing out or has left the machine down. */
  active: Signal<boolean>;
  /** Which, while it is. */
  failure: Signal<FailureId | null>;
  /** Its windows in alarm, and those acknowledged, by one-line legend. */
  alarms: Signal<readonly string[]>;
  acknowledged: Signal<readonly string[]>;
  /**
   * The annunciator's own supply: the station battery, kept charged from
   * the incoming side, so it still tells what went wrong when the main
   * breaker has tripped.
   */
  battery: Readable<boolean>;
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
  startup: Readable<boolean>,
  /** Whether the machine is drawing current: the main disconnect closed. */
  load: Readable<boolean>,
  onBoot: (ready: Readable<boolean>) => void,
  onScreenReady: (
    boot: ReturnType<typeof createScreenBoot>,
    from: Object3D,
    chosen?: SoundRecipe,
  ) => void,
  /** Name a control a scenario may watch (see `MccView.controls`). */
  register: (name: string, part: { position: Readable<number> }) => void,
  faults: Faults,
  kaputTime: () => number | null,
  bucketId: string,
  dress: MccOptions['dress'],
) {
  // The raised panel's middle, where the fittings are centred.
  const lit = computed(() => circuit.powered.value && startup.value);
  const screenBoot = (name: string) => {
    const boot = createScreenBoot(circuit.powered, name);
    updates.push((delta) => boot.step(delta));
    return boot;
  };
  let operatingHours = 0;
  updates.push((delta) => {
    if (circuit.powered.value) operatingHours += delta / 3600;
  });
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
    style: 'flange' | 'heavy-throw' = 'flange',
  ) =>
    place(
      disconnectHandle(kit, { colour, style, shared: circuit.breaker?.handle }),
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
    illumination: (t: number) => boolean,
    scale = 0.9,
  ) => {
    const drive = signal(false);
    updates.push((_, clock) => (drive.value = illumination(clock)));
    return place(pilotLight(kit, { colour, drive, power: lit }), x, y, scale);
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
      // Current flows only while the machine draws it.
      view.set(
        circuit.powered.value && load.value
          ? 0.35 + wander(clock, seed + k) * 0.3
          : 0,
      );
      view.update(delta);
    });
  };
  const lcd = (mode: LcdMode, w: number, y: number, title?: string) => {
    const view = createLcdMonitor(kit, { width: w, mode, seed, title });
    put(view.group, cx - 0.005, y);
    const boot = screenBoot(title ?? mode);
    onScreenReady(boot, view.group);
    onBoot(boot.ready);
    updates.push((delta) => {
      const kaput = kaputTime();
      const kind =
        mode === 'trend'
          ? 'corrupt'
          : mode === 'vector'
            ? 'banding'
            : mode === 'log'
              ? 'stuck'
              : 'backlight';
      view.setFailure(kaput === null ? null : kind, kaput ?? 0);
      view.setOn(
        kaput === null
          ? lit.value
          : kind === 'banding'
            ? kaput < 14
            : kaput < 7.8,
      );
      view.setBoot(kaput === null && boot.booting ? boot.lines() : null);
      view.update(delta);
    });
  };
  const running = (_clock: number) => circuit.running.value;
  const top = height / 2 - 0.09;
  if (
    dress?.(spec.face, bucketId, {
      kit,
      hinge,
      width,
      height,
      cx,
      top,
      seed,
      doorPaint,
      circuit,
      lit,
      parts,
      every: (update) => updates.push(update),
      put,
      place,
      caption,
      legend,
      handle: (colour, scale, x, y) => handle(colour, scale, x, y),
      louvres,
      screenBoot: (name, from, chosen) => {
        const boot = screenBoot(name);
        onScreenReady(boot, from, chosen);
        return boot;
      },
      ready: onBoot,
      register,
    })
  )
    return;

  switch (spec.face) {
    case 'meters':
      // The incoming supply's line voltages, phase to phase: nominal
      // 480 V whenever the isolator is on, whatever the main disconnect.
      for (const [k, pair] of ['L1-L2', 'L2-L3', 'L3-L1'].entries()) {
        const view = createPanelMeter(kit, `V  ${pair}`, {
          width: 0.075,
          scaleMax: 600,
        });
        put(view.group, cx - 0.16 + k * 0.09, -0.02);
        updates.push((delta, clock) => {
          view.set(
            circuit.powered.value
              ? (480 + Math.sin(clock * 0.7 + k * 2.1) * 1.5) / 600
              : 0,
          );
          view.update(delta);
        });
      }
      register('incoming.phase', selector(3, cx + 0.13, -0.03, 0.9, 1));
      legend('PHASE', cx + 0.13, 0.0);
      break;
    case 'main': {
      handle('red', 1.3, width - LATCH_SIDE - 0.05, 0.02);
      const monitor = createPowerMonitor(kit);
      put(monitor.group, cx - 0.1, top - 0.08);
      updates.push((_, clock) => {
        const volts = 479 + Math.sin(clock) * 1.5;
        const amps =
          47 +
          1.4 * Math.sin(clock * 0.29 + seed) +
          0.6 * Math.sin(clock * 0.93 + seed * 0.47);
        monitor.show(
          volts,
          amps,
          (Math.sqrt(3) * volts * amps * 0.86) / 1000,
          lit.value,
        );
      });
      const danger = createMicroLabel(kit, 'DANGER\n480 VOLTS', {
        height: 0.011,
        ink: '#ffffff',
        plate: '#c42a1e',
      });
      put(danger, cx - 0.1, top - 0.24);
      danger.position.z += 0.001;
      const kirk = place(
        keySwitch(kit, { initial: true }),
        cx - 0.1,
        top - 0.36,
        1.2,
      );
      register('main.kirk', {
        position: computed(() => (kirk.state.value ? 1 : 0)),
      });
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
      const legends = labels.map((label) =>
        label.replace('-\n', '-').replace('\n', ' '),
      );
      const windows = (names: readonly string[]) =>
        names.map((name) => legends.indexOf(name)).filter((i) => i >= 0);
      // On the station battery: it shows what went wrong even once the
      // main breaker has tripped.
      const shows = circuit.powered;
      let acked = 0;
      let testUntil = 0;
      updates.push((_, clock) => {
        if (faults.active.value) {
          // A failure's own faults, and nobody passing to acknowledge
          // them but its own story.
          const raised = windows(faults.alarms.value);
          alarms.sense(labels.map((_, k) => raised.includes(k)));
          // Its story's acknowledgements, and anything stale from before
          // put out, so the panel tells only what this failure did.
          alarms.acknowledge([
            ...windows(faults.acknowledged.value),
            ...labels.map((_, k) => k).filter((k) => !raised.includes(k)),
          ]);
          acked = clock;
        } else {
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
        }
        alarms.test = clock < testUntil;
        panel.set(alarms.lit(clock).map((on) => shows.value && on));
      });
      const tests = signal(0);
      register('annunciator.tests', { position: tests });
      button('black', 'TEST', cx - 0.12, top - 0.3, () => {
        testUntil = now + 2;
        tests.value++;
      });
      button('amber', 'ACK', cx - 0.02, top - 0.3, () => {
        acked = now;
        alarms.acknowledge();
      });
      button('blue', 'RESET', cx + 0.08, top - 0.3);
      const hours = createHourMeterView(kit);
      put(hours.group, cx - 0.02, top - 0.45);
      updates.push(() => hours.show(61842.7 + operatingHours));
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
      updates.push(() => hours.show(23117.4 + operatingHours));
      break;
    }
    case 'smc': {
      const starter = createSoftStarter(kit);
      put(starter.group, cx - 0.045, top - 0.06, 0.95);
      const hoa = selector(3, cx - 0.09, -0.05, 0.9, 2);
      register('feed.hoa', hoa);
      // Each start ramps the feed motor up from rest, the yellow bar
      // filling before UP TO SPEED; in a fault it runs down to a stop and
      // FAULT flashes red (`soft-starter.ts`).
      // Its emergency stop: struck, the motor stops and stays stopped until
      // it is pulled out and HAND OFF AUTO is turned to OFF.
      const stop = place(
        mushroomStop(kit, { bound: circuit.emergency }),
        cx - 0.03,
        -0.18,
        0.85,
      );
      caption('RESET: PULL OUT, TURN TO OFF', cx + 0.09, -0.18);
      let stopped = false;
      const softStart = createSoftStarterLogic();
      updates.push((delta, clock) => {
        // It starts and stops on a cycle in AUTO; HAND runs it, OFF stops it.
        const t = clock % 40;
        if (stop.pushed.value) stopped = true;
        else if (hoa.position.value === 1) stopped = false;
        const demand =
          !stopped &&
          (hoa.position.value === 0 || (hoa.position.value === 2 && t < 30));
        if (demand) circuit.start();
        else circuit.stop();
        const on = circuit.running.value && lit.value;
        starter.set(softStart.step(delta, on, on && faults.active.value));
      });
      legend('HAND OFF AUTO', cx - 0.09, -0.02, 0.07);
      lamp('green', cx + 0.0, -0.05, () => circuit.running.value);
      legend('RUN', cx + 0.0, -0.02, 0.04);
      handle('black', 0.8, undefined, -0.05);
      louvres(0.24, 0.045, cx - 0.03, -height / 2 + 0.04);
      break;
    }
    case 'estop': {
      // The same soft starter as the feed motor's, ramping it up each start.
      const starter = createSoftStarter(kit);
      put(starter.group, cx - 0.045, top - 0.06, 0.95);
      const softStart = createSoftStarterLogic();
      updates.push((delta) => {
        const on = circuit.running.value && lit.value;
        starter.set(softStart.step(delta, on, on && faults.active.value));
      });
      const stop = place(
        mushroomStop(kit, { bound: circuit.emergency }),
        cx - 0.07,
        0.03,
      );
      register('auxiliary.stop', {
        position: computed(() => (stop.pushed.value ? 1 : 0)),
      });
      meter('A  AC', cx - 0.07, -0.13, 4, 50);
      lamp('green', cx - 0.11, -0.27, running);
      lamp('red', cx - 0.03, -0.27, (t) => !running(t));
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
      register('hydraulic.key', selector(2, cx - 0.11, -0.04, 0.8, 1, true));
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
      const boot = screenBoot('AUX DRIVE');
      onScreenReady(boot, lcd.group);
      updates.push((_, clock) =>
        lcd.show(
          boot.booting
            ? boot.lines(2, 16)
            : [
                'M-204  AUX DRIVE',
                `${(38 + wander(clock, seed) * 22).toFixed(1)} HZ  RUN`,
              ],
          lit.value,
        ),
      );
      handle('black', 0.55, width - LATCH_SIDE - 0.03, -0.02);
      break;
    }
    case 'blank':
      louvres(0.24, 0.09, cx - 0.02, -0.04);
      break;
    case 'lcd-trend':
      lcd('trend', 0.3, -0.035, 'ENCABULATOR SYSTEMS');
      break;
    case 'lcd-vector':
      lcd('vector', 0.3, -0.035, 'PHASE REFERENCE SCOPE');
      break;
    case 'lcd-log':
      lcd('log', 0.3, -0.035, 'DINGLE ARM LOGGER');
      break;
    case 'chart': {
      const chart = createChartRecorder(kit);
      put(chart.group, cx - 0.07, -0.04);
      updates.push((delta, clock) => {
        if (!circuit.powered.value) return;
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
          gauge.set(
            circuit.powered.value ? 0.3 + wander(clock, seed + k * 5) * 0.4 : 0,
          );
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
          bar.set(lit.value ? wander(clock * 1.6, seed + k * 1.7) : 0),
        );
      }
      const digits = createSevenSegment(kit, 4, { digitHeight: 0.02 });
      put(digits.group, cx + 0.06, 0.06);
      updates.push((_, clock) =>
        digits.show(lit.value ? (wander(clock, seed) * 999).toFixed(0) : ''),
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
            lit.value &&
            Math.abs(row - 3 - 2.8 * Math.sin(col * 0.5 - clock * 3)) < 0.6,
        ),
      );
      break;
    }
    case 'plc': {
      const terminalPart = place(operatorTerminal(kit, {}), cx, height * 0.2);
      const terminal = terminalPart.view;
      const boot = createScreenBoot(
        circuit.powered,
        'AUTOMATION CONTROL',
        'controller',
      );
      updates.push((delta) => boot.step(delta));
      onScreenReady(boot, terminalPart.object, postBeep);
      onBoot(boot.ready);
      updates.push((_, clock) => {
        if (!lit.value) {
          terminal.draw(null);
          return;
        }
        if (boot.booting) {
          terminal.draw((c, w, h) => drawBootScreen(c, w, h, boot.lines()));
          return;
        }
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
      // The system RESET: pressed after a failure, it sputters a stalled
      // machine back into life (`MccView.restart`).
      const resets = signal(0);
      register('automation.reset', { position: resets });
      button('blue', 'RESET', cx + 0.24, height * 0.2 - 0.13, () => {
        resets.value++;
      });
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
      warning.position.z += 0.001;
      break;
    }
    case 'drive': {
      lcd('mimic', 0.34, height / 2 - 0.27, 'VFD-601 PROCESS');
      const keypadPart = place(driveKeypad(kit, {}), cx - 0.1, 0.02);
      const keypad = keypadPart.view;
      const boot = screenBoot('VFD-601 HIM');
      onScreenReady(boot, keypadPart.object);
      onBoot(boot.ready);
      updates.push((_, clock) => {
        keypad.show(
          boot.booting
            ? boot.lines(2, 16)
            : [
                'VFD-601  RUNNING',
                `${(1150 + wander(clock, seed) * 40).toFixed(0)} RPM  FWD`,
              ],
          lit.value,
        );
      });
      register('drive.speed', pot(cx + 0.07, 0.04));
      legend('SPEED', cx + 0.07, 0.07);
      for (const [colour, dx, on] of [
        ['#3dff5a', 0.05, true],
        ['#ffb01a', 0.09, false],
      ] as const) {
        const lamp = createJewelLamp(kit, colour, { on: false });
        put(lamp.group, cx + dx, -0.04);
        updates.push(() => lamp.set(lit.value && on));
      }
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
            lit.value &&
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
      gauge.group.name = 'Panendermic fan pressure gauge';
      put(gauge.group, cx - 0.08, 0.0);
      updates.push((delta, clock) => {
        gauge.set(
          circuit.powered.value
            ? boost.state.value
              ? 0.94 + Math.sin(clock * 2) * 0.01
              : 0.45 + wander(clock * 2, seed) * 0.2
            : 0,
        );
        gauge.update(delta);
      });
      const hours = createHourMeterView(kit);
      put(hours.group, cx + 0.06, 0.03);
      updates.push(() => hours.show(8812.2 + operatingHours));
      register('fan.mode', selector(3, cx + 0.06, -0.1, 0.85, 1));
      legend('LOW OFF HIGH', cx + 0.06, -0.07, 0.065);
      // BOOST raises the pressure gauge into its red band.
      const boost = place(
        ledPushbutton(kit, { colour: 'blue', legend: 'BOOST', power: lit }),
        cx - 0.08,
        -0.13,
        0.9,
      );
      register('fan.boost', {
        position: computed(() => (boost.state.value ? 1 : 0)),
      });
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
          lit.value,
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

export interface BucketCircuit {
  diagnostics?: ReturnType<typeof neumannDiagnostics>;
  breaker?: MachineDevice;
  /** Every device inside the unit. */
  devices: readonly MachineDevice[];
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
  mainBreaker: ReturnType<typeof createCircuitBreaker>,
  /** What feeds this bucket's breaker. */
  feed: Readable<boolean>,
  indicatorPower: Readable<boolean>,
  plcReady: Readable<boolean>,
  failureActive: Readable<boolean>,
  /** A permissive in series with a starter's coil. */
  interlock?: Readable<boolean>,
  /** Holds the breaker's handle (a Kirk key). */
  latch?: Readable<boolean>,
  diagnosticsAvailable?: Readable<boolean>,
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
      machineComponent(kit, kind, {
        name: `${prefix}: ${kind}`,
        indicatorPower,
        ...props,
      }),
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
      devices: own,
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
      breaker:
        prefix === 'section1.bucket2'
          ? mainBreaker
          : createCircuitBreaker(world, `${prefix}.breaker`),
      handleSoundLevel: prefix === 'section1.bucket2' ? 0.22 : undefined,
      power: feed,
      latch,
    },
  );
  if (prefix === 'section5.bucket1') {
    // A small square status LED sits on the grey isolator body beside its
    // throw handle. Auxiliary indication stays fed when this breaker opens.
    const status = parts.add(
      pilotLight(kit, {
        name: 'Automation cabinet isolator status',
        colour: 'green',
        offColour: 'red',
        drive: breaker.breaker!.closed,
        power: feed,
        pushToTest: false,
      }),
    );
    for (const child of status.object.children) child.scale.setScalar(0);
    const bezel = new Mesh(
      new BoxGeometry(0.016, 0.016, 0.004),
      kitPaint(kit, '#292b2b'),
    );
    const darkLed = kitPaint(kit, '#252b27');
    const greenLed = kitPaint(kit, '#56845c', 0.45);
    const redLed = kitPaint(kit, '#8d4440', 0.45);
    const lens = new Mesh(new BoxGeometry(0.011, 0.011, 0.002), darkLed);
    lens.name = 'Automation isolator square LED';
    lens.position.z = 0.003;
    lens.onBeforeRender = () => {
      lens.material =
        status.object.userData.indication === 'green'
          ? greenLed
          : status.object.userData.indication === 'red'
            ? redLed
            : darkLed;
    };
    status.object.add(bezel, lens);
    status.object.position.set(x + w / 2 - 0.045, y + h * 0.13 + 0.015, -0.255);
    bay.add(status.object);
  }
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
  let diagnosticBoards: ReturnType<typeof neumannDiagnostics> | undefined;
  if (spec.face === 'annunciator') {
    diagnosticBoards = parts.add(
      neumannDiagnostics(
        kit,
        controlFeed,
        diagnosticsAvailable ?? signal(false),
      ),
    );
    diagnosticBoards.object.position.set(x - 0.07, y - 0.08, -0.34);
    bay.add(diagnosticBoards.object);
    const isolatorLabel = createMicroLabel(kit, 'ANNUNCIATOR\nISOLATOR', {
      height: 0.004,
      ink: '#1a2224',
      maxWidth: 0.1,
    });
    isolatorLabel.position.set(x + w * 0.26, y + h * 0.13 + 0.11, -0.25);
    bay.add(isolatorLabel);
  }
  if (spec.kind === 'plc' && h > 0.8) {
    // Custom five-card expansion assembly: 1771-format modules retain
    // catalogue pitch and dimensions rather than stretching to fill the enclosure.
    const assembly = put('backplane', -0.04, 0.27, -0.35, {
      attachment: 'fixed',
      power: controlFeed,
      running,
      input: load,
    });
    installed.push(...assembly.cards!);
    running = assembly.active;
    // Genuine 2U instrument cases, not fictitious rack-mounted 1771 cards.
    for (let i = 0; i < 2; i++)
      put('rack-unit', 0, -h / 2 + 0.18 + i * 0.18, -0.03, {
        power: controlFeed,
        status: computed(() =>
          !controlFeed.value
            ? 'off'
            : failureActive.value || assembly.faulted.value
              ? 'fault'
              : plcReady.value
                ? 'running'
                : 'starting',
        ),
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
        !overload.faulted.value &&
        (interlock?.value ?? true),
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
    diagnostics: diagnosticBoards,
    devices: own,
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
