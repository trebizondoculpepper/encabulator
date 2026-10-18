import { createGraph } from '../toolkit/components/core/logic/world/graph';
import type {
  Graph,
  Writable,
} from '../toolkit/components/core/logic/world/graph';
import { CONTROLLER_BOOT } from '../toolkit/components/industrial-control/logic/screen-boot';
import {
  achievedDimension,
  allowedDimension,
  stepDimension,
} from './dimensionality';
import type { DimensionConditions } from './dimensionality';

/**
 * Level 0's process model: what the Retro Encabulator's line-up does with
 * the power its components pass, as one world graph. The electrical
 * components (breakers, fuses, terminals, contactors, cards) keep their
 * own state and are bridged in as inputs (`sense`); the operator controls
 * bind to inputs and actions here; pressures, temperatures, speeds, the
 * PLC's boot and the dimensionality are states advanced by processes; and
 * every reading, lamp, window, diagnostic and sound is an output. The
 * wiring is described, unit by unit, in `doc/design/level0-wiring.md`.
 */

/** The PLC's five cards, slot 1 to 5. */
export const CARD_KINDS = [
  'plc-power',
  'plc-cpu',
  'plc-input',
  'plc-output',
  'plc-analog',
] as const;
export type CardKind = (typeof CARD_KINDS)[number];
/** Presence and condition, apart from power: an isolated card is still ok. */
export type CardCondition = 'ok' | 'failed' | 'absent';

export const PLANT = {
  /** The supply: nominal phase-to-phase volts, the supply's impedance
   * (ohms, as volts lost an amp), how far a pair's voltage wanders an amp
   * of its current, and the control transformer's current across L1-L2. */
  nominalVolts: 480,
  supplyOhms: 0.1,
  fluctuationVoltsPerAmp: 0.02,
  controlTransformerAmps: 4,
  /** Lube oil, psi: running pressure, and the drive's permissive. */
  oilPressure: 45,
  oilOk: 25,
  /** Hydraulic pump, psi, and what the dingle arm needs. */
  hydraulicPressure: 2300,
  hydraulicOk: 1800,
  /** Panendermic fan, inches of water: LOW, HIGH, BOOST (in the red). */
  fanLow: 3.5,
  fanHigh: 6.2,
  fanBoost: 9.4,
  fanFlowOk: 2,
  /** The main drive: top speed, ramps (Hz a second), jog. */
  driveMaxHz: 60,
  driveAccel: 12,
  driveDecel: 8,
  jogHz: 5,
  jogSeconds: 1.5,
  /** The drive's heatsink, °C: alarm, trip, and cool enough to reset. */
  heatsinkWarn: 75,
  heatsinkTrip: 85,
  heatsinkReset: 70,
  /** The control section, °C: alarm, and too hot for the fourth dimension. */
  controlHot: 40,
  controlDerate: 45,
  /** Phase reference: lag at top speed, trim detent, lock window, degrees. */
  phaseLagAtMax: 20,
  trimStep: 5,
  trimCentre: 6,
  lockWindow: 5,
  /** The PLC's own boot, and its feed motor program in AUTO. */
  plcBoot: CONTROLLER_BOOT.seconds,
  feedCycle: 40,
  feedOn: 30,
  /** The cardinal grammeter: drift a second, alarm limits, CALIBRATE time. */
  gramPerDimension: 12.5,
  gramZeroRate: 0.8 / 60,
  gramSpanRate: 0.4 / 60,
  gramZeroAlarm: 4,
  gramSpanAlarm: 3,
  calibrateSeconds: 4,
} as const;

/** What the electrical components say, bridged in each change. */
export interface Electrical {
  /** The incoming isolator on: MAIN INCOMING live, the station battery charged. */
  incoming: boolean;
  /** The main disconnect closed too: the line-up's bus live. */
  mains: boolean;
  /** Each starter's contactor closed (its motor running). */
  lube: boolean;
  cooling: boolean;
  hydraulic: boolean;
  auxDrive: boolean;
  vent: boolean;
  mainMotor: boolean;
  feed: boolean;
  auxMotor: boolean;
  hydro: boolean;
  fan: boolean;
  /** Each control unit's own supply (breaker, control fuse and terminal). */
  control: boolean;
  /** The Encabulator Control unit's controller has finished booting. */
  controlBooted: boolean;
  phase: boolean;
  panMonitor: boolean;
  dingle: boolean;
  grammeter: boolean;
  /** Automation Control's cabinet supply, and its backplane bus running. */
  plcCabinet: boolean;
  backplane: boolean;
  /** The 24 VDC field supply in FIELD TERMINATIONS. */
  field: boolean;
  /** The drive's control supply, and its power stage and DC bus healthy. */
  vfdControl: boolean;
  vfdReady: boolean;
  driveIsolator: boolean;
  /** The PanelView's interface chassis (RU1) in and its supply terminal. */
  hmi: boolean;
  /**
   * The PLC's outputs reach the field through the remote I/O adapter (RU2)
   * and FIELD TERMINATIONS' output interposing relay; its inputs through
   * the input interposing relay.
   */
  outputLink: boolean;
  inputLink: boolean;
  /** Each PLC-linked unit's signal wiring (its X4 terminal, its K2 relay). */
  feedLink: boolean;
  hydraulicLink: boolean;
  driveLink: boolean;
  hydroLink: boolean;
  dingleLink: boolean;
  phaseLink: boolean;
  /** A door open on a live unit. */
  liveDoorOpen: boolean;
  /** A failed part still installed, powered or not. */
  failedInstalled: boolean;
}

export const ELECTRICAL_OFF: Electrical = {
  incoming: false,
  mains: false,
  lube: false,
  cooling: false,
  hydraulic: false,
  auxDrive: false,
  vent: false,
  mainMotor: false,
  feed: false,
  auxMotor: false,
  hydro: false,
  fan: false,
  control: false,
  controlBooted: false,
  phase: false,
  panMonitor: false,
  dingle: false,
  grammeter: false,
  plcCabinet: false,
  backplane: false,
  field: false,
  vfdControl: false,
  vfdReady: false,
  driveIsolator: false,
  hmi: false,
  outputLink: false,
  inputLink: false,
  feedLink: false,
  hydraulicLink: false,
  driveLink: false,
  hydroLink: false,
  dingleLink: false,
  phaseLink: false,
  liveDoorOpen: false,
  failedInstalled: false,
};

export type PlcStatus = 'off' | 'booting' | 'halted' | 'run';

/** One fault, as the terminal, the logs and the annunciator show it. */
export interface PlantFault {
  code: string;
  text: string;
  /** The annunciator window it lights, by its one-line legend. */
  window: string;
  /** Shown, but not a fault: the machine is still healthy with it. */
  advisory?: boolean;
}

/** The annunciator's windows, as `dressDoor` labels them, one line each. */
export const WINDOWS = [
  'BUS OVERVOLT',
  'GROUND FAULT',
  'PHASE LOSS',
  'BREAKER TRIP',
  'DINGLE ARM',
  'MODIAL HI',
  'BEARING TEMP',
  'LUBE LOW',
  'FAN FAIL',
  'GRAM-METER',
  'DOOR OPEN',
  'CONTROL CCT',
] as const;

/** Approach `target` with time constant `tau`, the same at any frame rate. */
const ease = (value: number, target: number, tau: number, dt: number) =>
  target + (value - target) * Math.exp(-dt / Math.max(1e-6, tau));
/** Move towards `target` at `rate` a second, no further. */
const ramp = (value: number, target: number, rate: number, dt: number) =>
  value < target
    ? Math.min(target, value + rate * dt)
    : Math.max(target, value - rate * dt);

const sameList = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export function createLevel0Plant(g: Graph = createGraph()) {
  // ---- Bridged from the electrical components ------------------------------
  const e = Object.fromEntries(
    Object.entries(ELECTRICAL_OFF).map(([key, initial]) => [
      key,
      g.input(`electrical.${key}`, initial, { where: 'electrical circuit' }),
    ]),
  ) as { [K in keyof Electrical]: Writable<boolean> };
  /**
   * Faults the components report themselves: a blown fuse, a tripped
   * breaker or overload, welded contacts, an open terminal, a withdrawn
   * chassis, a failed capacitor bank.
   */
  const components = g.input<readonly PlantFault[]>('components.faults', [], {
    where: 'component diagnostics',
    equals: ((a: readonly PlantFault[], b: readonly PlantFault[]) =>
      sameList(
        a.map((f) => f.code),
        b.map((f) => f.code),
      )) as never,
  });
  const card = Object.fromEntries(
    CARD_KINDS.map((kind) => [
      kind,
      g.input<CardCondition>(`card.${kind}`, 'ok', {
        where: 'backplane slot',
      }),
    ]),
  ) as Record<CardKind, Writable<CardCondition>>;

  // ---- Operator controls ---------------------------------------------------
  const control = {
    /** VFD-601 SPEED, detents 0 to 10. */
    driveSpeed: g.input('drive.speed', 0, { where: 'VFD-601 SPEED knob' }),
    /** The drive keypad's LOCAL (true) or REMOTE (PLC) control. */
    driveLocal: g.input('drive.local', true, {
      where: 'VFD-601 keypad ENTER',
    }),
    driveReverse: g.input('drive.reverse', false, {
      where: 'VFD-601 keypad REV',
    }),
    drivePage: g.input('drive.page', 0, {
      where: 'VFD-601 keypad UP, DOWN, SEL, ESC',
    }),
    /** LOW OFF HIGH: 0 LOW, 1 OFF, 2 HIGH. */
    fanMode: g.input('fan.mode', 1, { where: 'PANENDERMIC FAN selector' }),
    fanBoost: g.input('fan.boost', false, {
      where: 'PANENDERMIC FAN BOOST',
    }),
    /** HYDRAULIC PUMP key: 0 LOCAL, 1 OFF, 2 REMOTE. */
    hydraulicKey: g.input('hydraulic.key', 1, {
      where: 'HYDRAULIC PUMP LOCAL OFF REMOTE key',
    }),
    /** FEED MOTOR: 0 HAND, 1 OFF, 2 AUTO. */
    feedHoa: g.input('feed.hoa', 1, { where: 'FEED MOTOR HAND OFF AUTO' }),
    /** PHASE TRIM, detents 0 to 12, 5° each about the middle. */
    phaseTrim: g.input<number>('phase.trim', PLANT.trimCentre, {
      where: 'PHASE REFERENCE PHASE TRIM knob',
    }),
    /** ENCABULATOR SYSTEMS display: 0 TREND, 1 DIMENSIONALITY. */
    controlMode: g.input('control.mode', 0, {
      where: 'ENCABULATOR CONTROL DISPLAY selector',
    }),
    /** MODIAL INTERACTION chart drive: 0 STOP, 1 RUN. */
    chartRun: g.input('chart.run', 0, { where: 'MODIAL CHART selector' }),
    /** RECIPROCATING DINGLE ARM: 0 OFF, 1 ON. */
    dingleEnable: g.input('dingle.enable', 0, {
      where: 'DINGLE ARM selector',
    }),
    /** AUXILIARY DRIVE SPEED, detents 0 to 10. */
    auxSpeed: g.input('aux.speed', 0, { where: 'AUXILIARY DRIVE SPEED knob' }),
    /**
     * MAIN INCOMING's PHASE selector: which phase feeds the control
     * transformer, the supply of every lamp, controller and the PLC,
     * so that it can be moved to a sound phase if one fails. 0 L1 (across
     * L1-L2), 1 L2 (L2-L3), 2 L3 (L3-L1). No OFF: it is a supply selector.
     */
    controlPhase: g.input('incoming.controlPhase', 0, {
      where: 'MAIN INCOMING PHASE selector',
    }),
    /** The main disconnect's Kirk key, in and turned (true); it starts out. */
    kirk: g.input('main.kirk', false, { where: 'MAIN DISCONNECT Kirk key' }),
    /** The PanelView's page, 1 to 8. */
    terminalPage: g.input('terminal.page', 1, {
      where: 'AUTOMATION CONTROL PanelView keys',
    }),
  };

  // ---- States --------------------------------------------------------------
  const s = {
    clock: g.state('plant.clock', 0),
    oil: g.state('lube.pressure', 0, { note: 'psi' }),
    hydraulic: g.state('hydraulic.pressure', 0, { note: 'psi' }),
    flow: g.state('hydro.flow', 0, { note: 'share of rated flow' }),
    fan: g.state('fan.pressure', 0, { note: 'inWC' }),
    driveHz: g.state('drive.hz', 0),
    driveRun: g.state('drive.run', false, { note: 'local run command' }),
    jog: g.state('drive.jog', 0, { note: 'seconds of jog left' }),
    vfdFault: g.state<string | null>('drive.fault', null),
    heatsink: g.state('drive.heatsink', 25, { note: '°C' }),
    controlTemp: g.state('control.temperature', 24, { note: '°C' }),
    auxHz: g.state('aux.hz', 0),
    plcElapsed: g.state('plc.elapsed', 0),
    plcHalt: g.state<string | null>('plc.halt', null),
    plcScan: g.state('plc.scan', 0),
    dimension: g.state('dimension.progress', 0),
    dinglePhase: g.state('dingle.phase', 0),
    strokes: g.state('dingle.strokes', 0),
    semiboloids: g.state('semiboloid.count', 0),
    gramZero: g.state('gram.zero', 0),
    gramSpan: g.state('gram.span', 0),
    calibrating: g.state('gram.calibrating', 0),
    events: g.state<readonly string[]>('log.events', [], {
      equals: sameList as never,
    }),
  };

  // ---- Derived -------------------------------------------------------------
  const oilOk = g.derive('lube.ok', [s.oil], (p) => p >= PLANT.oilOk);
  const hydraulicOk = g.derive(
    'hydraulic.ok',
    [s.hydraulic],
    (p) => p >= PLANT.hydraulicOk,
  );
  const rackDiagnosis = g.derive(
    'plc.rack',
    [e.backplane, card['plc-power'], card['plc-cpu']],
    (bus, power, cpu) =>
      !bus ? 'E01' : power !== 'ok' ? 'E10' : cpu !== 'ok' ? 'E20' : null,
  );
  const plcStatus = g.output(
    'plc.status',
    [e.plcCabinet, s.plcElapsed, s.plcHalt],
    (cabinet, elapsed, halt): PlcStatus =>
      !cabinet
        ? 'off'
        : elapsed < PLANT.plcBoot
          ? 'booting'
          : halt
            ? 'halted'
            : 'run',
    { where: 'AUTOMATION CONTROL PanelView' },
  );
  const plcRun = g.derive('plc.run', [plcStatus], (st) => st === 'run');
  const plcInputs = g.derive(
    'plc.inputs',
    [plcRun, card['plc-input'], e.field, e.inputLink],
    (run, input, field, link) => run && input === 'ok' && field && link,
  );
  /** The output card's outputs, reaching the field through their links. */
  const plcOutputs = g.derive(
    'plc.outputs',
    [plcRun, card['plc-output'], e.field, e.outputLink],
    (run, output, field, link) => run && output === 'ok' && field && link,
  );
  const plcAnalog = g.derive(
    'plc.analog',
    [plcRun, card['plc-analog']],
    (run, analog) => run && analog === 'ok',
  );
  /** The PLC's program: the feed's AUTO cycle and its remote commands. */
  const feedAuto = g.derive(
    'plc.feedRun',
    [plcOutputs, plcInputs, e.feedLink, s.plcScan],
    (out, inp, link, scan) =>
      out && inp && link && scan % PLANT.feedCycle < PLANT.feedOn,
  );
  const feedDemand = g.output(
    'feed.demand',
    [control.feedHoa, feedAuto],
    (hoa, auto) => hoa === 0 || (hoa === 2 && auto),
    { where: 'FEED MOTOR starter' },
  );
  const hydraulicPermit = g.output(
    'hydraulic.permit',
    [
      control.hydraulicKey,
      plcOutputs,
      plcInputs,
      e.hydraulicLink,
      control.dingleEnable,
    ],
    (key, out, inp, link, arm) =>
      key === 0 || (key === 2 && out && inp && link && arm === 1),
    { where: 'HYDRAULIC PUMP starter' },
  );
  const driveRemote = g.derive(
    'plc.driveRun',
    [plcOutputs, plcInputs, e.driveLink, oilOk],
    (out, inp, link, oil) => out && inp && link && oil,
  );
  const driveCommand = g.derive(
    'drive.command',
    [control.driveLocal, s.driveRun, driveRemote],
    (local, run, remote) => (local ? run : remote),
  );
  const driveBlock = g.output(
    'drive.block',
    [e.vfdControl, e.vfdReady, e.driveIsolator, oilOk, s.vfdFault],
    (on, ready, isolator, oil, fault): string | null =>
      !on
        ? 'NO CONTROL POWER'
        : fault
          ? fault
          : !ready
            ? 'POWER STAGE'
            : !isolator
              ? 'ISOLATOR OPEN'
              : !oil
                ? 'NO LUBE PERMIT'
                : null,
    { where: 'VFD-601 keypad' },
  );
  // The reference lags the drive more the faster it turns, and the other
  // way when it runs in reverse.
  const phaseLag = g.derive(
    'phase.lag',
    [s.driveHz, control.driveReverse],
    (hz, reverse) =>
      (reverse ? -1 : 1) * (hz / PLANT.driveMaxHz) * PLANT.phaseLagAtMax,
  );
  const phaseTrimDegrees = g.output(
    'phase.trimDegrees',
    [control.phaseTrim],
    (trim) => (trim - PLANT.trimCentre) * PLANT.trimStep,
    { where: 'PHASE REFERENCE SCOPE' },
  );
  const phaseError = g.output(
    'phase.error',
    [phaseTrimDegrees, phaseLag],
    (trim, lag) => trim - lag,
    { where: 'PHASE REFERENCE SCOPE' },
  );
  const phaseLocked = g.output(
    'phase.locked',
    [e.phase, phaseError],
    (on, error) => on && Math.abs(error) <= PLANT.lockWindow,
    { where: 'PHASE REFERENCE SCOPE' },
  );
  const flowOk = g.output('hydro.flowOk', [s.flow], (f) => f >= 0.8, {
    where: 'HYDROCOPTIC PUMP FLOW OK lamp',
  });
  const stroking = g.derive(
    'dingle.stroking',
    [e.dingle, control.dingleEnable, hydraulicOk, plcOutputs, e.dingleLink],
    (on, arm, pressure, out, link) =>
      on && arm === 1 && pressure && out && link,
  );
  const conditions = g.derive(
    'dimension.conditions',
    [
      e.control,
      e.controlBooted,
      plcRun,
      s.driveHz,
      oilOk,
      phaseLocked,
      plcAnalog,
      e.phaseLink,
      s.controlTemp,
      flowOk,
      s.fan,
      stroking,
    ],
    (
      unit,
      booted,
      run,
      hz,
      oil,
      locked,
      analog,
      phaseLink,
      temperature,
      flow,
      fan,
      arm,
    ): DimensionConditions => ({
      control: unit && booted,
      automation: run,
      drive: hz >= PLANT.driveMaxHz * 0.4 && oil,
      phase: locked && analog && phaseLink && temperature < PLANT.controlDerate,
      flow: flow && fan >= PLANT.fanFlowOk,
      arm,
    }),
    {
      equals: ((a: DimensionConditions, b: DimensionConditions) =>
        Object.keys(a).every(
          (k) =>
            a[k as keyof DimensionConditions] ===
            b[k as keyof DimensionConditions],
        )) as never,
    },
  );
  const allowed = g.output(
    'dimension.allowed',
    [conditions],
    allowedDimension,
    {
      where: 'ENCABULATOR SYSTEMS display',
    },
  );
  const achieved = g.output(
    'dimension.achieved',
    [s.dimension],
    achievedDimension,
    { where: 'ENCABULATOR SYSTEMS display; PANENDERMIC MONITOR; grammeter' },
  );
  const coherence = g.output(
    'dimension.coherence',
    [s.dimension, phaseError, s.fan],
    (progress, error, fan) =>
      progress <= 0
        ? 0
        : Math.max(0, 1 - Math.abs(error) / 30) *
          (fan > PLANT.fanHigh + 1 ? 0.65 : 1),
    { where: 'ENCABULATOR SYSTEMS display' },
  );
  const gramReading = g.output(
    'gram.reading',
    [achieved, s.gramZero, s.gramSpan],
    (dim, zero, span) => dim * PLANT.gramPerDimension * (1 + span / 100) + zero,
    { where: 'CARDINAL GRAMMETER' },
  );
  const loadAmps = g.output(
    'supply.amps',
    [
      e.mains,
      e.lube,
      e.cooling,
      e.hydraulic,
      e.auxDrive,
      e.vent,
      e.mainMotor,
      e.feed,
      e.auxMotor,
      e.hydro,
      e.fan,
      s.driveHz,
      s.auxHz,
      s.fan,
    ],
    (
      mains,
      lube,
      cooling,
      hydraulic,
      auxDrive,
      vent,
      mainMotor,
      feed,
      auxMotor,
      hydro,
      fan,
      hz,
      auxHz,
      fanP,
    ) =>
      !mains
        ? 0
        : 4 +
          (lube ? 4 : 0) +
          (cooling ? 3 : 0) +
          (hydraulic ? 9 : 0) +
          (auxDrive ? 1.5 + auxHz * 0.12 : 0) +
          (vent ? 2 : 0) +
          (mainMotor ? 21 : 0) +
          (feed ? 8 : 0) +
          (auxMotor ? 12 : 0) +
          (hydro ? 7 : 0) +
          (fan ? 2 + fanP * 1.4 : 0) +
          (hz / PLANT.driveMaxHz) * 38,
    { where: 'MAIN DISCONNECT power monitor; MAIN INCOMING voltmeters' },
  );

  /** The Kirk key's interlock: the main disconnect closes only with it in. */
  const closePermit = g.output('main.closePermit', [control.kirk], (k) => k, {
    where: 'MAIN DISCONNECT handle latch',
  });
  /** What the grammeter's display shows: its reading, or CAL while calibrating. */
  const gramDisplay = g.output(
    'gram.display',
    [gramReading, s.calibrating],
    (reading, cal): string =>
      cal > 0 ? `CAL ${cal.toFixed(0)}` : `${reading.toFixed(1)} G`,
    { where: 'CARDINAL GRAMMETER' },
  );
  const semiboloidCount = g.output(
    'semiboloid.display',
    [s.semiboloids],
    (count) => Math.floor(count),
    { where: 'PANENDERMIC MONITOR SEMIBOLOID COUNT' },
  );
  const armPosition = g.output(
    'dingle.position',
    [s.dinglePhase, s.strokes],
    (phase, strokes) => ({
      stroke: 0.5 - 0.5 * Math.cos(phase * Math.PI * 2),
      strokes,
    }),
    {
      where: 'RECIPROCATING DINGLE ARM logger',
      equals: ((a: { stroke: number; strokes: number }, b: typeof a) =>
        a.stroke === b.stroke && a.strokes === b.strokes) as never,
    },
  );
  const eventLog = g.output('log.display', [s.events], (lines) => lines, {
    where: 'RECIPROCATING DINGLE ARM logger',
  });
  /**
   * The current in each line, L1, L2 and L3. The motors and drives are
   * balanced three-phase loads; the control transformer (lamps,
   * controllers, the PLC) is a single-phase load across the pair the PHASE
   * selector has chosen, so those two lines carry its current too.
   */
  const lineAmps = g.derive(
    'supply.lineAmps',
    [loadAmps, e.mains, control.controlPhase],
    (amps, mains, phase) => {
      const control = mains ? PLANT.controlTransformerAmps : 0;
      const balanced = Math.max(0, amps - control);
      return [0, 1, 2].map(
        (line) =>
          balanced + (line === phase || line === (phase + 1) % 3 ? control : 0),
      );
    },
    { equals: sameList as never },
  );
  /**
   * The phase-to-phase voltages, L1-L2, L2-L3 and L3-L1: the nominal
   * supply, sagging across the supply's impedance with the current in
   * each pair's two lines, and fluctuating gently, slowly and by an
   * amount that grows with that current. Without load all three read the
   * same steady nominal voltage; without the incoming supply, nothing.
   */
  const supplyVolts = g.output(
    'supply.volts',
    [e.incoming, lineAmps, s.clock],
    (incoming, [i1, i2, i3], t) => {
      if (!incoming) return [0, 0, 0];
      const pair = (a: number, b: number, k: number) => {
        const amps = (a + b) / 2;
        const wobble =
          Math.sin(t * (0.53 + k * 0.17) + k * 2.1) * 0.6 +
          Math.sin(t * (1.31 + k * 0.23) + k * 0.7) * 0.4;
        return (
          PLANT.nominalVolts -
          amps * PLANT.supplyOhms -
          amps * PLANT.fluctuationVoltsPerAmp * wobble
        );
      };
      return [pair(i1, i2, 0), pair(i2, i3, 1), pair(i3, i1, 2)];
    },
    {
      where: 'MAIN INCOMING voltmeters; MAIN DISCONNECT power monitor',
      equals: sameList as never,
    },
  );
  /**
   * What MAIN DISCONNECT's power monitor shows: the average phase-to-phase
   * voltage and line current and the total kW, from its own transformers.
   * Moving the control transformer between phases does not change it:
   * the same current is drawn, only from another pair.
   */
  const monitor = g.output(
    'supply.monitor',
    [e.incoming, loadAmps, e.mains, s.clock],
    (incoming, amps, mains, t) => {
      if (!incoming) return { volts: 0, amps: 0, kilowatts: 0 };
      const control = mains ? PLANT.controlTransformerAmps : 0;
      // The average line current: the control load is on two of three.
      const line = Math.max(0, amps - control) + (control * 2) / 3;
      const wobble = Math.sin(t * 0.61) * 0.6 + Math.sin(t * 1.43 + 1) * 0.4;
      const volts =
        PLANT.nominalVolts -
        line * PLANT.supplyOhms -
        line * PLANT.fluctuationVoltsPerAmp * wobble;
      return {
        volts,
        amps: line,
        kilowatts: (Math.sqrt(3) * volts * line * 0.86) / 1000,
      };
    },
    {
      where: 'MAIN DISCONNECT power monitor',
      equals: ((a: Record<string, number>, b: Record<string, number>) =>
        a.volts === b.volts && a.amps === b.amps) as never,
    },
  );
  /** What each display has been set to show: nothing else depends on it. */
  const displays = g.output(
    'display.selection',
    [
      control.drivePage,
      control.driveLocal,
      control.controlMode,
      control.chartRun,
      control.terminalPage,
    ],
    (drivePage, local, controlMode, chartRun, terminalPage) => ({
      drivePage,
      local,
      controlMode,
      chartRun,
      terminalPage,
    }),
    {
      where: 'VFD-601 keypad, ENCABULATOR SYSTEMS, chart, PanelView',
      equals: ((a: Record<string, unknown>, b: Record<string, unknown>) =>
        Object.keys(a).every((k) => a[k] === b[k])) as never,
    },
  );

  // ---- Faults --------------------------------------------------------------
  const io = g.derive(
    'plc.io',
    [
      plcRun,
      card['plc-input'],
      card['plc-output'],
      card['plc-analog'],
      e.field,
    ],
    (run, input, output, analog, field) => ({
      run,
      input,
      output,
      analog,
      field,
    }),
    {
      equals: ((a: Record<string, unknown>, b: Record<string, unknown>) =>
        Object.keys(a).every((k) => a[k] === b[k])) as never,
    },
  );
  /**
   * The PLC's own remote I/O paths, and the diagnostic each one's loss
   * raises. A unit's own signal terminal reports itself (its X4), and only
   * while the unit is supplied, as an isolated unit's silence is normal.
   */
  const links = g.derive(
    'plc.links',
    [e.outputLink, e.inputLink],
    (out, inp) =>
      [
        ['E61', 'REMOTE I/O OUTPUT', out],
        ['E62', 'REMOTE I/O INPUT', inp],
      ] as [string, string, boolean][],
    {
      equals: ((a: [string, string, boolean][], b: typeof a) =>
        a.every((link, i) => link[2] === b[i][2])) as never,
    },
  );
  const faults = g.output(
    'faults',
    [
      e.incoming,
      e.mains,
      e.plcCabinet,
      plcStatus,
      s.plcHalt,
      rackDiagnosis,
      card['plc-power'],
      io,
      s.vfdFault,
      s.heatsink,
      s.oil,
      e.vfdControl,
      e.cooling,
      s.driveHz,
      e.vent,
      e.control,
      s.controlTemp,
      control.fanMode,
      e.fan,
      phaseLocked,
      control.dingleEnable,
      stroking,
      e.grammeter,
      s.gramZero,
      s.gramSpan,
      components,
      e.liveDoorOpen,
      e.hmi,
      links,
    ],
    (
      incoming,
      mains,
      cabinet,
      status,
      halt,
      rack,
      powerCard,
      cards,
      vfdFault,
      heatsink,
      oil,
      vfdOn,
      cooling,
      hz,
      vent,
      controlOn,
      controlTemp,
      fanMode,
      fanRunning,
      locked,
      arm,
      arming,
      gramOn,
      zero,
      span,
      reported,
      door,
      hmi,
      linkStates,
    ) => {
      const list: PlantFault[] = [];
      const add = (fault: PlantFault) => list.push(fault);
      if (!incoming) return list;
      const RACK: Record<string, string> = {
        E01: 'BACKPLANE SUPPLY LOST',
        E10: 'RACK POWER FAIL SLOT 1',
        E20: 'PROCESSOR FAULT SLOT 2',
      };
      if (cabinet && (halt ?? (status !== 'booting' ? rack : null))) {
        const code = halt ?? rack!;
        add({ code, text: RACK[code], window: 'MODIAL HI' });
      }
      if (cabinet && powerCard === 'failed')
        add({
          code: 'E11',
          text: 'BETAFORM AMPLIFIER EARTH FAULT',
          window: 'GROUND FAULT',
        });
      if (cards.run) {
        if (cards.input !== 'ok')
          add({
            code: 'E31',
            text: `INPUT MODULE SLOT 3 ${cards.input === 'absent' ? 'MISSING' : 'FAULT'}`,
            window: 'MODIAL HI',
          });
        else if (!cards.field)
          add({
            code: 'E32',
            text: 'FIELD 24 VDC SUPPLY OFF',
            window: 'MODIAL HI',
          });
        if (cards.output !== 'ok')
          add({
            code: 'E41',
            text: `OUTPUT MODULE SLOT 4 ${cards.output === 'absent' ? 'MISSING' : 'FAULT'}`,
            window: 'MODIAL HI',
          });
        if (cards.analog !== 'ok')
          add({
            code: 'E51',
            text: `ANALOG MODULE SLOT 5 ${cards.analog === 'absent' ? 'MISSING' : 'FAULT'}`,
            window: 'MODIAL HI',
          });
      }
      if (vfdFault === 'F07')
        add({
          code: 'F07',
          text: 'VFD-601 DC BUS / POWER STAGE',
          window: 'BUS OVERVOLT',
        });
      if (vfdFault === 'F04')
        add({
          code: 'F04',
          text: 'VFD-601 HEATSINK OVERTEMP',
          window: 'BEARING TEMP',
        });
      else if (vfdOn && heatsink >= PLANT.heatsinkWarn)
        add({
          code: 'A09',
          text: 'VFD-601 HEATSINK HOT',
          window: 'BEARING TEMP',
        });
      if (mains && oil < PLANT.oilOk)
        add({ code: 'A01', text: 'LUBE OIL PRESSURE LOW', window: 'LUBE LOW' });
      if (vfdOn && hz > 1 && !cooling)
        add({ code: 'A02', text: 'DRIVE COOLING FAN OFF', window: 'FAN FAIL' });
      if (controlOn && !vent && controlTemp > PLANT.controlHot)
        add({
          code: 'A03',
          text: 'CONTROL SECTION HOT - VENT FAN',
          window: 'FAN FAIL',
        });
      if (mains && fanMode !== 1 && !fanRunning)
        add({
          code: 'A04',
          text: 'PANENDERMIC FAN NOT RUNNING',
          window: 'FAN FAIL',
        });
      if (hz > 5 && !locked)
        add({
          code: 'A05',
          text: 'PHASE REFERENCE NOT LOCKED',
          window: 'PHASE LOSS',
        });
      if (mains && arm === 1 && !arming)
        add({
          code: 'A06',
          text: 'DINGLE ARM NOT STROKING',
          window: 'DINGLE ARM',
        });
      if (
        gramOn &&
        (Math.abs(zero) > PLANT.gramZeroAlarm ||
          Math.abs(span) > PLANT.gramSpanAlarm)
      )
        add({
          code: 'A07',
          text: 'GRAMMETER OUT OF CALIBRATION',
          window: 'GRAM-METER',
        });
      for (const fault of reported) add(fault);
      if (cabinet && status !== 'off' && !hmi)
        add({
          code: 'E02',
          text: 'PANELVIEW INTERFACE LOST',
          window: 'CONTROL CCT',
        });
      if (cards.run)
        for (const [code, name, ok] of linkStates)
          if (!ok)
            add({ code, text: `${name} SIGNAL LOST`, window: 'CONTROL CCT' });
      if (door)
        add({
          code: 'D01',
          text: 'DOOR OPEN ON A LIVE UNIT',
          window: 'DOOR OPEN',
          advisory: true,
        });
      return list;
    },
    {
      where: 'annunciator, PanelView alarm page, stack light, logger',
      equals: ((a: PlantFault[], b: PlantFault[]) =>
        sameList(
          a.map((f) => f.code),
          b.map((f) => f.code),
        )) as never,
    },
  );
  const alarms = g.output(
    'annunciator.alarms',
    [faults],
    (list) => WINDOWS.map((w) => list.some((f) => f.window === w)),
    {
      where: 'DISTRIBUTION annunciator',
      equals: sameList as never,
    },
  );
  const healthy = g.output(
    'plant.healthy',
    [faults, e.failedInstalled],
    (list, failed) => !failed && list.every((f) => f.advisory),
    { where: 'random failure scheduler' },
  );
  const operating = g.output(
    'plant.operating',
    [e.mains, plcRun],
    (mains, run) => mains && run,
    { where: 'random failure scheduler' },
  );

  // ---- Actions -------------------------------------------------------------
  /** Automation Control's RESET: restart the PLC's boot, whatever it was doing. */
  const plcReset = g.action(
    'plc.resetAction',
    [e.plcCabinet],
    [s.plcElapsed, s.plcHalt],
    () => {
      if (!e.plcCabinet.peek()) return false;
      s.plcElapsed.set(0);
      s.plcHalt.set(null);
      return true;
    },
    'AUTOMATION CONTROL RESET',
  );
  const driveStart = g.action(
    'drive.startAction',
    [e.vfdControl, control.driveLocal],
    [s.driveRun],
    () => {
      if (!e.vfdControl.peek() || !control.driveLocal.peek()) return false;
      s.driveRun.set(true);
      return true;
    },
    'VFD-601 keypad START',
  );
  /** STOP stops the drive from either place, and resets a cleared fault. */
  const driveStop = g.action(
    'drive.stopAction',
    [e.vfdControl, e.vfdReady, s.heatsink],
    [s.driveRun, s.vfdFault],
    () => {
      if (!e.vfdControl.peek()) return false;
      s.driveRun.set(false);
      const fault = s.vfdFault.peek();
      if (
        (fault === 'F04' && s.heatsink.peek() < PLANT.heatsinkReset) ||
        (fault === 'F07' && e.vfdReady.peek())
      )
        s.vfdFault.set(null);
      return true;
    },
    'VFD-601 keypad STOP/RESET',
  );
  const driveJog = g.action(
    'drive.jogAction',
    [e.vfdControl, control.driveLocal, s.driveRun],
    [s.jog],
    () => {
      if (
        !e.vfdControl.peek() ||
        !control.driveLocal.peek() ||
        s.driveRun.peek()
      )
        return false;
      s.jog.set(PLANT.jogSeconds);
      return true;
    },
    'VFD-601 keypad JOG',
  );
  const gramZero = g.action(
    'gram.zeroAction',
    [e.grammeter],
    [s.gramZero],
    () => {
      if (!e.grammeter.peek()) return false;
      s.gramZero.set(0);
      return true;
    },
    'CARDINAL GRAMMETER ZERO',
  );
  const gramCalibrate = g.action(
    'gram.calibrateAction',
    [e.grammeter],
    [s.calibrating],
    () => {
      if (!e.grammeter.peek() || s.calibrating.peek() > 0) return false;
      s.calibrating.set(PLANT.calibrateSeconds);
      return true;
    },
    'CARDINAL GRAMMETER CALIBRATE',
  );
  const countReset = g.action(
    'semiboloid.reset',
    [e.panMonitor],
    [s.semiboloids],
    () => {
      if (!e.panMonitor.peek()) return false;
      s.semiboloids.set(0);
      return true;
    },
    'PANENDERMIC MONITOR COUNT RESET',
  );

  // ---- Processes -----------------------------------------------------------
  g.process('plant.clock', [], [s.clock], (dt) =>
    s.clock.set(s.clock.peek() + dt),
  );
  g.process(
    'fluids',
    [
      e.lube,
      e.hydraulic,
      e.hydro,
      e.fan,
      plcOutputs,
      e.hydroLink,
      control.fanMode,
      control.fanBoost,
    ],
    [s.oil, s.hydraulic, s.flow, s.fan],
    (dt) => {
      const oilTarget = e.lube.peek() ? PLANT.oilPressure : 0;
      s.oil.set(ease(s.oil.peek(), oilTarget, oilTarget ? 1.5 : 4, dt));
      const hydTarget = e.hydraulic.peek() ? PLANT.hydraulicPressure : 0;
      s.hydraulic.set(
        ease(s.hydraulic.peek(), hydTarget, hydTarget ? 2 : 5, dt),
      );
      // The Hydrocoptic Phase Regulator (the output card) opens the loop;
      // without it the pump only recirculates.
      const regulated = plcOutputs.peek() && e.hydroLink.peek();
      const flowTarget = e.hydro.peek() ? (regulated ? 1 : 0.3) : 0;
      s.flow.set(ease(s.flow.peek(), flowTarget, 3, dt));
      const mode = control.fanMode.peek();
      const fanTarget =
        e.fan.peek() && mode !== 1
          ? control.fanBoost.peek()
            ? PLANT.fanBoost
            : mode === 2
              ? PLANT.fanHigh
              : PLANT.fanLow
          : 0;
      s.fan.set(
        ease(s.fan.peek(), fanTarget, fanTarget > s.fan.peek() ? 2.5 : 4, dt),
      );
    },
  );
  g.process(
    'drive',
    [
      e.vfdControl,
      e.vfdReady,
      e.driveIsolator,
      e.cooling,
      oilOk,
      driveCommand,
      control.driveSpeed,
      s.jog,
      s.vfdFault,
      s.heatsink,
    ],
    [s.driveHz, s.jog, s.vfdFault, s.heatsink, s.driveRun],
    (dt) => {
      const on = e.vfdControl.peek();
      const ready = e.vfdReady.peek();
      let fault = s.vfdFault.peek();
      if (!on) {
        // A drive forgets its fault and its run command without power.
        fault = null;
        s.driveRun.set(false);
      } else if (!fault && !ready) fault = 'F07';
      else if (!fault && s.heatsink.peek() >= PLANT.heatsinkTrip) fault = 'F04';
      s.vfdFault.set(fault);
      const jog = Math.max(0, s.jog.peek() - dt);
      s.jog.set(jog);
      const command = driveCommand.peek();
      const enabled =
        on &&
        ready &&
        e.driveIsolator.peek() &&
        oilOk.peek() &&
        !fault &&
        (command || jog > 0);
      const target = !enabled
        ? 0
        : command
          ? (control.driveSpeed.peek() / 10) * PLANT.driveMaxHz
          : PLANT.jogHz;
      const hz = s.driveHz.peek();
      s.driveHz.set(
        ramp(
          hz,
          target,
          // A stop is a controlled ramp; without its power stage it coasts.
          target > hz ? PLANT.driveAccel : on && ready ? PLANT.driveDecel : 4,
          dt,
        ),
      );
      const load = s.driveHz.peek() / PLANT.driveMaxHz;
      const settle = 28 + load * (e.cooling.peek() ? 30 : 80);
      s.heatsink.set(ease(s.heatsink.peek(), settle, 40, dt));
    },
  );
  g.process(
    'auxiliary drive',
    [e.auxDrive, control.auxSpeed],
    [s.auxHz],
    (dt) =>
      s.auxHz.set(
        ramp(
          s.auxHz.peek(),
          e.auxDrive.peek() ? control.auxSpeed.peek() * 6 : 0,
          10,
          dt,
        ),
      ),
  );
  g.process('control section', [e.control, e.vent], [s.controlTemp], (dt) => {
    const settle = e.control.peek() ? (e.vent.peek() ? 27 : 52) : 22;
    s.controlTemp.set(ease(s.controlTemp.peek(), settle, 30, dt));
  });
  g.process(
    'plc',
    [e.plcCabinet, rackDiagnosis],
    [s.plcElapsed, s.plcHalt, s.plcScan],
    (dt) => {
      if (!e.plcCabinet.peek()) {
        // Unpowered, it forgets its fault; it boots again when power returns.
        s.plcElapsed.set(0);
        s.plcHalt.set(null);
        return;
      }
      s.plcElapsed.set(Math.min(PLANT.plcBoot, s.plcElapsed.peek() + dt));
      if (s.plcElapsed.peek() < PLANT.plcBoot) return;
      // Diagnosed at the end of its boot, or the moment the rack fails; a
      // halt is held until RESET or a power cycle.
      const diagnosis = rackDiagnosis.peek();
      if (diagnosis && !s.plcHalt.peek()) s.plcHalt.set(diagnosis);
      if (!s.plcHalt.peek()) s.plcScan.set(s.plcScan.peek() + dt);
    },
  );
  g.process('dimensionality', [e.control, allowed], [s.dimension], (dt) =>
    s.dimension.set(
      stepDimension(s.dimension.peek(), allowed.peek(), dt, e.control.peek()),
    ),
  );
  g.process('dingle arm', [stroking], [s.dinglePhase, s.strokes], (dt) => {
    if (!stroking.peek()) return;
    const next = s.dinglePhase.peek() + dt * 0.5;
    if (Math.floor(next) > Math.floor(s.dinglePhase.peek()))
      s.strokes.set(s.strokes.peek() + 1);
    s.dinglePhase.set(next);
  });
  g.process(
    'counters',
    [e.panMonitor, e.grammeter, e.mains, s.fan, achieved],
    [s.semiboloids, s.gramZero, s.gramSpan, s.calibrating],
    (dt) => {
      if (e.panMonitor.peek())
        s.semiboloids.set(
          (s.semiboloids.peek() + dt * s.fan.peek() * (1 + achieved.peek())) %
            10000,
        );
      if (e.grammeter.peek() && e.mains.peek()) {
        s.gramZero.set(s.gramZero.peek() + dt * PLANT.gramZeroRate);
        s.gramSpan.set(s.gramSpan.peek() + dt * PLANT.gramSpanRate);
      }
      const cal = s.calibrating.peek();
      if (cal > 0) {
        s.calibrating.set(Math.max(0, cal - dt));
        if (cal - dt <= 0) s.gramSpan.set(0);
      }
    },
  );
  let logged = { codes: [] as string[], status: 'off', achieved: 0 };
  g.process(
    'logger',
    [faults, plcStatus, achieved, s.clock],
    [s.events],
    () => {
      const stamp = (() => {
        const t = Math.floor(s.clock.peek()) + 8 * 3600;
        const two = (n: number) => String(n).padStart(2, '0');
        return `${two(Math.floor(t / 3600) % 24)}:${two(Math.floor(t / 60) % 60)}:${two(t % 60)}`;
      })();
      const lines: string[] = [];
      const codes = faults.peek().map((f) => f.code);
      for (const code of codes)
        if (!logged.codes.includes(code)) lines.push(`${stamp} ${code} IN`);
      for (const code of logged.codes)
        if (!codes.includes(code)) lines.push(`${stamp} ${code} CLEAR`);
      const status = plcStatus.peek();
      if (status !== logged.status)
        lines.push(`${stamp} PLC ${status.toUpperCase()}`);
      const dim = achieved.peek();
      if (dim !== logged.achieved)
        lines.push(
          `${stamp} DIMENSION ${dim} ${dim > logged.achieved ? 'BUILT' : 'LOST'}`,
        );
      logged = { codes, status, achieved: dim };
      if (lines.length) s.events.set([...s.events.peek(), ...lines].slice(-40));
    },
  );

  return {
    graph: g,
    electrical: e,
    cards: card,
    control,
    state: s,
    oilOk,
    hydraulicOk,
    plcStatus,
    plcRun,
    plcInputs,
    plcOutputs,
    plcAnalog,
    feedDemand,
    hydraulicPermit,
    driveCommand,
    driveBlock,
    phaseLag,
    phaseTrimDegrees,
    phaseError,
    phaseLocked,
    flowOk,
    stroking,
    conditions,
    allowed,
    achieved,
    coherence,
    gramReading,
    loadAmps,
    lineAmps,
    supplyVolts,
    monitor,
    displays,
    closePermit,
    gramDisplay,
    semiboloidCount,
    armPosition,
    eventLog,
    faults,
    alarms,
    healthy,
    operating,
    plcReset,
    driveStart,
    driveStop,
    driveJog,
    gramZero,
    gramCalibrate,
    countReset,
    /** Bridge the components' own fault reports in. */
    report(list: readonly PlantFault[]) {
      components.set(list);
    },
    /** Bridge the electrical components' states in. */
    sense(values: Partial<Electrical>) {
      for (const [key, value] of Object.entries(values))
        e[key as keyof Electrical].set(value);
    },
    senseCard(kind: CardKind, condition: CardCondition) {
      card[kind].set(condition);
    },
    /** Advance every process. */
    step(dt: number) {
      g.tick(dt);
    },
  };
}

export type Level0Plant = ReturnType<typeof createLevel0Plant>;
