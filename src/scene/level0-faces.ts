import { computed } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { CARD_KINDS, PLANT, WINDOWS } from '../game/level0-plant';
import type { Level0Plant } from '../game/level0-plant';
import { STAGE_NAMES } from '../game/dimensionality';
import type { Readable } from '../toolkit/components/core/logic/world/components';
import { createAnnunciator } from '../toolkit/components/industrial-control/logic/annunciator';
import { createSoftStarter as createSoftStarterLogic } from '../toolkit/components/industrial-control/logic/soft-starter';
import { controllerBootLines } from '../toolkit/components/industrial-control/logic/screen-boot';
import { cardDesignation } from '../toolkit/components/industrial-control/logic/machine-components';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import { postBeep } from '../toolkit/components/sound/audio/boot-beep';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import {
  disconnectHandle,
  driveKeypad,
  keySwitch,
  ledPushbutton,
  mushroomStop,
  operatorTerminal,
  pilotLight,
  potentiometer,
  pushButton,
  pushbuttonStation,
  selector,
} from '../toolkit/components/core/parts/parts';
import type { OperatorColour } from '../toolkit/components/industrial-control/views/industrial-controls';
import {
  createAnnunciatorPanel,
  createChartRecorder,
  createLcdMonitor,
  createPowerMonitor,
  createSoftStarter,
} from '../toolkit/components/industrial-control/views/cabinet-fittings';
import {
  createBarGraph,
  createSevenSegment,
} from '../toolkit/components/core/views/eighties-controls';
import { createHourMeterView } from '../toolkit/components/industrial-control/views/industrial-displays';
import {
  createCharacterLcd,
  createJewelLamp,
  createLedMatrix,
  createPanelMeter,
  createRoundGauge,
} from '../toolkit/components/industrial-control/views/panel-instruments';
import { drawBootScreen } from '../toolkit/components/industrial-control/views/boot-screen';
import type { DoorKit, Face, MccView } from './retro-encabulator-mcc';
import {
  drawDimensionality,
  drawDriveMimic,
  drawEventLog,
} from './level0-pictures';

/** Bucket ids by role, as `src/scene/retro-encabulator-mcc.ts` numbers them. */
export const UNITS = {
  incoming: 'section1.bucket1',
  main: 'section1.bucket2',
  distribution: 'section1.bucket3',
  mainMotor: 'section2.bucket1',
  feed: 'section2.bucket2',
  auxMotor: 'section2.bucket3',
  lube: 'section3.bucket1',
  cooling: 'section3.bucket2',
  hydraulic: 'section3.bucket3',
  auxDrive: 'section3.bucket4',
  vent: 'section3.bucket5',
  spare: 'section3.bucket6',
  control: 'section4.bucket1',
  modial: 'section4.bucket2',
  phase: 'section4.bucket3',
  panMonitor: 'section4.bucket4',
  automation: 'section5.bucket1',
  field: 'section5.bucket2',
  vfd: 'section6.bucket1',
  driveIsolator: 'section6.bucket2',
  dingle: 'section7.bucket1',
  hydro: 'section7.bucket2',
  fan: 'section7.bucket3',
  grammeter: 'section7.bucket4',
} as const;

/** The PanelView's pages, by function key. */
export const TERMINAL_PAGES = [
  'STATUS',
  'ALARMS',
  'I/O RACK',
  'DRIVE',
  'PUMPS',
  'COOLING',
  'DIMENSION',
  'EVENTS',
] as const;

/** The drive keypad's display pages, UP and DOWN between them. */
const DRIVE_PAGES = ['STATUS', 'CURRENT', 'HEATSINK', 'PERMITS', 'FAULT'];

const fixed = (n: number, digits = 1) => n.toFixed(digits);

/**
 * Level 0's door fittings: for every functional unit of the line-up, its
 * physical inputs, its displays and their labels, all bound to the
 * process model. Passed to `createRetroEncabulatorMcc` as `dress`; units
 * left to the line-up's own fittings (the spare space) return false.
 */
export function createLevel0Dresser(
  plant: Level0Plant,
  machine: ReadonlySignal<MccView | null>,
  /** Each unit's internal circuits: its door's indication supply (X3). */
  wiring: (bucket: string) => {
    indication: Readable<boolean>;
    run: Readable<boolean>;
  },
) {
  const p = plant;
  /** The PLC backplane assembly, once the line-up is built. */
  const assembly = computed(
    () =>
      machine.value?.circuits
        .get(UNITS.automation)
        ?.devices.find((device) => device.kind === 'backplane') ?? null,
  );
  return (face: Face, bucket: string, given: DoorKit): boolean => {
    // The door's lamps and displays are fed through the unit's X3.
    const indication = wiring(bucket).indication;
    const door: DoorKit = {
      ...given,
      lit: computed(() => given.lit.value && indication.value),
    };
    const {
      kit,
      cx,
      top,
      width,
      height,
      lit,
      circuit,
      every,
      put,
      place,
      caption,
      legend,
      handle,
    } = door;
    /** A pilot light lit by `drive` on the unit's own supply, labelled. */
    const lamp = (
      colour: OperatorColour,
      x: number,
      y: number,
      drive: Readable<boolean>,
      label: string,
      scale = 0.8,
      w = 0.05,
    ) => {
      place(pilotLight(kit, { colour, drive, power: lit }), x, y, scale);
      legend(label, x, y + 0.03, w);
    };
    const button = (
      colour: OperatorColour,
      label: string,
      x: number,
      y: number,
      action: () => void,
    ) =>
      place(
        pushButton(kit, { colour, legend: label, action, power: lit }),
        x,
        y,
        0.9,
      );
    const latchSide = width - 0.042;
    // A small bucket's breaker is worked by an illuminated rocker on its
    // door, lit while the breaker is closed.
    const smallHandle = () => {
      place(
        disconnectHandle(kit, {
          style: 'rocker',
          shared: circuit.breaker!.handle,
          name: `${bucket} power rocker`,
        }),
        latchSide - 0.03,
        -0.03,
      );
      caption('POWER\nI / O', latchSide - 0.03, 0.01);
    };

    switch (face) {
      case 'meters': {
        // Phase-to-phase voltage, sagging a little under load.
        for (const [k, pair] of ['L1-L2', 'L2-L3', 'L3-L1'].entries()) {
          const view = createPanelMeter(kit, `V  ${pair}`, {
            width: 0.075,
            scaleMax: 600,
          });
          put(view.group, cx - 0.16 + k * 0.09, -0.02);
          every((delta) => {
            view.set(
              lit.value ? (480 - p.loadAmps.value * 0.06 - k * 0.8) / 600 : 0,
            );
            view.update(delta);
          });
        }
        caption('LINE VOLTS', cx - 0.07, -0.085);
        place(
          selector(kit, { positions: 3, bound: p.control.ammeterPhase }),
          cx + 0.13,
          -0.03,
          0.9,
        );
        legend('AMMETER PHASE', cx + 0.13, 0.005, 0.075);
        caption('L1   L2   L3', cx + 0.13, -0.07);
        return true;
      }
      case 'main': {
        handle('red', 1.3, latchSide - 0.05, 0.02);
        caption('MAIN DISCONNECT\nON / OFF', latchSide - 0.05, 0.15, 0.006);
        const monitor = createPowerMonitor(kit);
        put(monitor.group, cx - 0.1, top - 0.08);
        caption(
          'SUPPLY: VOLTS, AMPS (SELECTED PHASE), KW',
          cx - 0.1,
          top - 0.145,
        );
        every(() => {
          const volts = 480 - p.loadAmps.value * 0.06;
          const amps = p.phaseAmps.value;
          monitor.show(
            volts,
            amps,
            (Math.sqrt(3) * volts * p.loadAmps.value * 0.86) / 1000,
            lit.value,
          );
        });
        // The Kirk key: trapped while the disconnect is closed, and with it
        // turned out the disconnect cannot be closed.
        const breaker = circuit.breaker!.breaker!;
        place(
          keySwitch(kit, {
            bound: p.control.kirk,
            latch: breaker.closed,
          }),
          cx - 0.1,
          top - 0.36,
          1.2,
        );
        caption(
          'KIRK KEY INTERLOCK\nIN = CLOSE PERMITTED',
          cx - 0.1,
          top - 0.42,
        );
        door.louvres(0.3, 0.1, cx - 0.04, -height / 2 + 0.09);
        return true;
      }
      case 'annunciator': {
        const labels = WINDOWS.map((w) =>
          w === 'GRAM-METER' ? 'GRAM-\nMETER' : w.replace(' ', '\n'),
        );
        const panel = createAnnunciatorPanel(kit, labels, {
          columns: 4,
          cell: 0.07,
        });
        put(panel.group, cx - 0.02, top - 0.1);
        caption('FAULT ANNUNCIATOR', cx - 0.02, top - 0.005);
        // Sequence M: an acknowledged window stays lit until RESET once
        // its fault has cleared, so the operator can see what tripped.
        const alarms = createAnnunciator(labels.length, { manualReset: true });
        let testUntil = 0;
        let now = 0;
        // On the station battery, charged from the incoming side.
        const shows = computed(() => machine.value?.supply.value ?? false);
        every((_, clock) => {
          now = clock;
          alarms.sense(p.alarms.value);
          alarms.test = clock < testUntil;
          panel.set(alarms.lit(clock).map((on) => shows.value && on));
        });
        const powered = shows;
        place(
          pushButton(kit, {
            colour: 'black',
            legend: 'TEST',
            power: powered,
            action: () => (testUntil = now + 2),
          }),
          cx - 0.12,
          top - 0.3,
          0.9,
        );
        place(
          pushButton(kit, {
            colour: 'amber',
            legend: 'ACK',
            power: powered,
            action: () => alarms.acknowledge(),
          }),
          cx - 0.02,
          top - 0.3,
          0.9,
        );
        place(
          pushButton(kit, {
            colour: 'blue',
            legend: 'RESET',
            power: powered,
            action: () => alarms.reset(),
          }),
          cx + 0.08,
          top - 0.3,
          0.9,
        );
        caption(
          'LAMP TEST · ACKNOWLEDGE · RESET CLEARED',
          cx - 0.02,
          top - 0.355,
        );
        const hours = createHourMeterView(kit);
        put(hours.group, cx - 0.02, top - 0.45);
        caption('BUS HOURS RUN', cx - 0.02, top - 0.49);
        let hoursRun = 61842.7;
        every((delta) => {
          if (p.electrical.mains.value) hoursRun += delta / 3600;
          hours.show(hoursRun);
        });
        door.louvres(0.3, 0.08, cx - 0.02, -height / 2 + 0.08);
        return true;
      }
      case 'film': {
        // The main drive motor's own starter: START, STOP, and RESET for its
        // overload relay once it has cooled.
        const overload = circuit.devices.find((d) => d.kind === 'overload');
        place(
          pushbuttonStation(kit, {
            buttons: [
              { colour: 'green', legend: 'START', action: circuit.start },
              { colour: 'red', legend: 'STOP', action: circuit.stop },
              {
                colour: 'black',
                legend: 'O/L RESET',
                action: () => overload?.repair(),
              },
            ],
          }),
          cx - 0.06,
          0.04,
        );
        handle('black', 0.9, undefined, 0.04);
        // A row of lamps under the station, clear of the handle.
        lamp('green', cx - 0.12, -0.13, circuit.running, 'RUN');
        lamp(
          'amber',
          cx - 0.06,
          -0.13,
          computed(() => !p.oilOk.value),
          'NO LUBE',
        );
        lamp(
          'red',
          cx,
          -0.13,
          computed(() => overload?.faulted.value ?? false),
          'O/L TRIP',
        );
        const hours = createHourMeterView(kit);
        put(hours.group, cx - 0.06, -0.22);
        caption('MOTOR HOURS RUN', cx - 0.06, -0.26);
        let run = 23117.4;
        every((delta) => {
          if (circuit.running.value) run += delta / 3600;
          hours.show(run);
        });
        return true;
      }
      case 'smc': {
        const starter = createSoftStarter(kit);
        put(starter.group, cx - 0.045, top - 0.06, 0.95);
        caption('SOFT STARTER', cx - 0.045, top - 0.14);
        place(
          selector(kit, { positions: 3, bound: p.control.feedHoa }),
          cx - 0.09,
          -0.05,
          0.9,
        );
        legend('HAND OFF AUTO', cx - 0.09, -0.02, 0.07);
        caption('AUTO: PLC CYCLE', cx - 0.09, -0.09);
        const softStart = createSoftStarterLogic();
        every((delta) => {
          if (p.feedDemand.value) circuit.start();
          else circuit.stop();
          const on = circuit.running.value && lit.value;
          starter.set(softStart.step(delta, on, false));
        });
        lamp('green', cx + 0.0, -0.05, circuit.running, 'RUN', 0.9, 0.04);
        handle('black', 0.8, undefined, -0.05);
        door.louvres(0.24, 0.07, cx - 0.03, -height / 2 + 0.07);
        return true;
      }
      case 'estop': {
        const stop = place(
          mushroomStop(kit, { bound: circuit.emergency }),
          cx - 0.07,
          top - 0.06,
        );
        // Released, it does not restart the motor by itself: START does.
        let wasPushed = false;
        every(() => {
          if (stop.pushed.value && !wasPushed) circuit.stop();
          wasPushed = stop.pushed.value;
        });
        button('green', 'START', cx + 0.05, top - 0.06, circuit.start);
        const meter = createPanelMeter(kit, 'A  AC', {
          width: 0.075,
          scaleMax: 50,
        });
        put(meter.group, cx - 0.07, -0.06);
        caption('MOTOR CURRENT', cx - 0.07, -0.115);
        every((delta, clock) => {
          meter.set(
            circuit.running.value ? (12 + Math.sin(clock * 1.3) * 0.4) / 50 : 0,
          );
          meter.update(delta);
        });
        lamp('green', cx - 0.11, -0.2, circuit.running, 'RUN');
        lamp(
          'red',
          cx - 0.03,
          -0.2,
          computed(() => !circuit.running.value),
          'STOPPED',
        );
        handle('black', 0.85, undefined, 0.02);
        return true;
      }
      case 'small-lamps': {
        lamp(
          'red',
          cx - 0.12,
          -0.05,
          computed(() => !circuit.running.value),
          'STOPPED',
        );
        lamp('green', cx - 0.05, -0.05, circuit.running, 'RUN');
        if (bucket === UNITS.lube) {
          lamp('amber', cx + 0.03, -0.05, p.oilOk, 'OIL PRESS');
        }
        smallHandle();
        return true;
      }
      case 'small-station': {
        place(
          pushbuttonStation(kit, {
            buttons: [
              { colour: 'green', legend: 'START', action: circuit.start },
              { colour: 'red', legend: 'STOP', action: circuit.stop },
            ],
          }),
          cx - 0.07,
          -0.03,
          0.85,
        );
        lamp('green', cx + 0.03, -0.05, circuit.running, 'RUN');
        smallHandle();
        return true;
      }
      case 'small-key': {
        place(
          selector(kit, {
            positions: 2,
            key: true,
            bound: p.control.hydraulicKey,
          }),
          cx - 0.11,
          -0.04,
          0.8,
        );
        legend('LOCAL REMOTE', cx - 0.11, -0.01, 0.06);
        caption('REMOTE: RUNS FOR ARM', cx - 0.11, -0.08);
        lamp('amber', cx - 0.02, -0.05, circuit.running, 'RUN');
        lamp('green', cx + 0.05, -0.05, p.hydraulicOk, 'PRESSURE');
        smallHandle();
        return true;
      }
      case 'small-lcd': {
        const lcd = createCharacterLcd(kit, {
          columns: 16,
          rows: 2,
          cell: 0.0042,
        });
        put(lcd.group, cx - 0.06, -0.03);
        caption('OUTPUT FREQUENCY', cx - 0.06, -0.075);
        const boot = door.screenBoot('AUX DRIVE', lcd.group);
        every(() =>
          lcd.show(
            boot.booting
              ? boot.lines(2, 16)
              : [
                  'M-204  AUX DRIVE',
                  `${fixed(p.state.auxHz.value).padStart(4)} HZ  ${circuit.running.value ? 'RUN' : 'STOP'}`,
                ],
            lit.value,
          ),
        );
        place(
          potentiometer(kit, { steps: 10, bound: p.control.auxSpeed }),
          cx + 0.05,
          -0.04,
          0.7,
        );
        legend('SPEED', cx + 0.05, -0.01, 0.04);
        caption('0-60 HZ', cx + 0.05, -0.075);
        smallHandle();
        return true;
      }
      case 'lcd-trend':
      case 'lcd-vector':
      case 'lcd-log': {
        const titles = {
          'lcd-trend': 'ENCABULATOR SYSTEMS',
          'lcd-vector': 'PHASE REFERENCE SCOPE',
          'lcd-log': 'DINGLE ARM LOGGER',
        } as const;
        const view = createLcdMonitor(kit, {
          width: 0.3,
          mode: face === 'lcd-vector' ? 'vector' : 'trend',
          seed: door.seed,
          title: titles[face],
        });
        put(view.group, cx - 0.005, -0.035);
        const boot = door.screenBoot(titles[face], view.group);
        door.ready(boot.ready);
        const below = -0.205;
        if (face === 'lcd-trend') {
          // The Encabulator Control unit can only encabulate once booted.
          every(() => p.sense({ controlBooted: boot.ready.value }));
          place(
            selector(kit, { positions: 2, bound: p.control.controlMode }),
            cx + 0.1,
            below,
            0.75,
          );
          caption('DISPLAY\nTREND | DIMENSIONALITY', cx - 0.03, below);
        } else if (face === 'lcd-vector') {
          place(
            potentiometer(kit, { steps: 12, bound: p.control.phaseTrim }),
            cx + 0.1,
            below,
            0.75,
          );
          caption('PHASE TRIM\n-30° ... +30°, 5° A STEP', cx - 0.03, below);
        } else {
          place(
            selector(kit, { positions: 2, bound: p.control.dingleEnable }),
            cx + 0.1,
            below,
            0.75,
          );
          caption('DINGLE ARM\nOFF | ON', cx - 0.03, below);
        }
        const dimension = (
          c: CanvasRenderingContext2D,
          w: number,
          h: number,
          t: number,
        ) =>
          drawDimensionality(c, w, h, t, {
            progress: p.state.dimension.value,
            achieved: p.achieved.value,
            allowed: p.allowed.value,
            coherence: p.coherence.value,
            conditions: p.conditions.value,
          });
        const events = (
          c: CanvasRenderingContext2D,
          w: number,
          h: number,
          t: number,
        ) =>
          drawEventLog(c, w, h, t, {
            enabled: p.control.dingleEnable.value === 1,
            stroking: p.stroking.value,
            stroke: p.armPosition.value.stroke,
            strokes: p.armPosition.value.strokes,
            events: p.eventLog.value,
          });
        let slip = 0;
        every((delta) => {
          view.setOn(lit.value);
          view.setBoot(boot.booting ? boot.lines() : null);
          if (face === 'lcd-trend') {
            const dims = p.control.controlMode.value === 1;
            view.setPicture(dims ? dimension : null);
            view.setSignals({
              trend: [
                p.state.driveHz.value / PLANT.driveMaxHz,
                p.state.fan.value / 10,
                p.state.dimension.value / 6,
              ],
              caption: `VFD ${fixed(p.state.driveHz.value)} HZ  FAN ${fixed(p.state.fan.value)}  DIM ${p.achieved.value}`,
            });
          } else if (face === 'lcd-vector') {
            // A locked reference holds its figure still; out of lock it
            // slips, faster the further out it is.
            const error = p.phaseError.value;
            if (!p.phaseLocked.value) slip += delta * error * 0.05;
            view.setSignals({
              vectorPhase: (error * Math.PI) / 180 + slip,
              vectorGain: 0.4 + 0.6 * Math.min(1, p.state.driveHz.value / 30),
              caption: `TRIM ${p.phaseTrimDegrees.value >= 0 ? '+' : ''}${p.phaseTrimDegrees.value}  LAG ${fixed(p.phaseLag.value)}  ${p.phaseLocked.value ? 'LOCK' : 'SLIP'}`,
            });
          } else view.setPicture(events);
          view.update(delta);
        });
        return true;
      }
      case 'chart': {
        const chart = createChartRecorder(kit, { title: 'MODIAL INTERACTION' });
        put(chart.group, cx - 0.07, -0.02);
        caption(
          'RED DIMENSION · BLUE LUBE PSI · GREEN HEATSINK',
          cx - 0.07,
          -0.165,
        );
        every((delta) => {
          if (!lit.value || p.control.chartRun.value === 0) return;
          chart.set([
            p.state.dimension.value / 6,
            p.state.oil.value / 60,
            p.state.heatsink.value / 120,
          ]);
          chart.update(delta);
        });
        for (const [y, k] of [
          [0.08, 1],
          [-0.09, 2],
        ] as const) {
          const gauge = createRoundGauge(kit, {
            radius: 0.035,
            label: k === 1 ? 'PSI' : '°F',
            scaleMax: k === 1 ? 150 : 300,
          });
          put(gauge.group, cx + 0.105, y);
          caption(k === 1 ? 'LUBE OIL' : 'VFD HEATSINK', cx + 0.105, y - 0.048);
          every((delta) => {
            gauge.set(
              lit.value
                ? k === 1
                  ? p.state.oil.value / 150
                  : ((p.state.heatsink.value * 9) / 5 + 32) / 300
                : 0,
            );
            gauge.update(delta);
          });
        }
        place(
          selector(kit, { positions: 2, bound: p.control.chartRun }),
          cx + 0.04,
          -0.205,
          0.7,
        );
        caption('CHART DRIVE\nSTOP | RUN', cx - 0.06, -0.205);
        return true;
      }
      case 'bars': {
        const bars: [string, () => number][] = [
          ['FAN', () => p.state.fan.value / 10],
          ['FLOW', () => p.state.flow.value],
          ['HYD', () => p.state.hydraulic.value / 3000],
          ['DIM', () => p.state.dimension.value / 6],
        ];
        bars.forEach(([label, read], k) => {
          const bar = createBarGraph(kit, 14, { pitch: 0.0075, width: 0.012 });
          put(bar.group, cx - 0.14 + k * 0.03, -0.04);
          caption(label, cx - 0.14 + k * 0.03, -0.105);
          every(() => bar.set(lit.value ? read() : 0));
        });
        const digits = createSevenSegment(kit, 4, { digitHeight: 0.02 });
        put(digits.group, cx + 0.06, 0.06);
        every(() =>
          digits.show(lit.value ? String(p.semiboloidCount.value) : ''),
        );
        caption('SEMIBOLOID COUNT', cx + 0.06, 0.03);
        const matrix = createLedMatrix(kit, {
          columns: 20,
          rows: 7,
          pitch: 0.0055,
        });
        put(matrix.group, cx + 0.06, -0.06);
        caption('SEMIBOLOID PHASE', cx + 0.06, -0.093);
        let wave = 0;
        every((delta) => {
          wave += delta * (1 + p.state.fan.value);
          const error = p.phaseError.value;
          const amplitude = Math.min(3, p.state.fan.value / 2);
          matrix.draw(
            (col, row) =>
              lit.value &&
              amplitude > 0.05 &&
              Math.abs(
                row -
                  3 -
                  amplitude *
                    Math.sin(
                      col * 0.5 -
                        wave +
                        (p.phaseLocked.value
                          ? 0
                          : error * 0.2 * Math.sin(wave * 3)),
                    ),
              ) < 0.6,
          );
        });
        button('black', 'COUNT RESET', cx + 0.06, -0.17, () => p.countReset());
        return true;
      }
      case 'plc':
        dressAutomation(door, p, assembly);
        return true;
      case 'terminations': {
        door.louvres(0.42, 0.18, cx, -0.12);
        caption('WARNING\nMULTIPLE SOURCES OF SUPPLY', cx - 0.08, 0.1, 0.008);
        // Its supply is switched by the isolator inside.
        lamp(
          'green',
          cx + 0.1,
          0.08,
          wiring(bucket).run,
          '24 VDC ON',
          0.8,
          0.06,
        );
        return true;
      }
      case 'drive':
        dressDrive(door, p);
        return true;
      case 'isolator': {
        handle('red', 1.1, latchSide - 0.045, 0.0);
        caption('DRIVE ISOLATOR\nON / OFF', latchSide - 0.045, 0.12);
        const meter = createPanelMeter(kit, 'A  AC', {
          width: 0.075,
          scaleMax: 200,
        });
        put(meter.group, cx - 0.1, 0.06);
        caption('DRIVE MOTOR CURRENT', cx - 0.1, 0.005);
        every((delta) => {
          meter.set(
            lit.value
              ? ((p.state.driveHz.value / PLANT.driveMaxHz) * 76) / 200
              : 0,
          );
          meter.update(delta);
        });
        lamp('green', cx - 0.14, -0.1, circuit.powered, 'CLOSED');
        lamp(
          'amber',
          cx - 0.06,
          -0.1,
          computed(() => p.state.vfdFault.value !== null),
          'VFD FAULT',
        );
        return true;
      }
      case 'matrix': {
        const matrix = createLedMatrix(kit, {
          columns: 24,
          rows: 7,
          pitch: 0.005,
        });
        put(matrix.group, cx - 0.05, 0.05);
        caption('HYDROCOPTIC FLOW PULSE', cx - 0.05, 0.015);
        let pulse = 0;
        every((delta) => {
          pulse += delta * 8 * p.state.flow.value;
          matrix.draw(
            (col, row) =>
              lit.value &&
              p.state.flow.value > 0.02 &&
              (col + Math.floor(pulse)) % 6 < 3 === (row % 2 === 0),
          );
        });
        lamp('blue', cx - 0.1, -0.1, circuit.running, 'RUN');
        lamp('white', cx - 0.03, -0.1, p.flowOk, 'FLOW OK');
        // Switched by the isolator inside: no handle on the door.
        return true;
      }
      case 'fan': {
        const gauge = createRoundGauge(kit, {
          radius: 0.05,
          label: 'IN WC',
          scaleMax: 10,
        });
        gauge.group.name = 'Panendermic fan pressure gauge';
        put(gauge.group, cx - 0.08, 0.0);
        caption('FAN PRESSURE', cx - 0.08, -0.065);
        every((delta) => {
          gauge.set(lit.value ? p.state.fan.value / 10 : 0);
          gauge.update(delta);
        });
        const hours = createHourMeterView(kit);
        put(hours.group, cx + 0.06, 0.03);
        caption('FAN HOURS RUN', cx + 0.06, -0.005);
        let run = 8812.2;
        every((delta) => {
          if (p.state.fan.value > 0.5) run += delta / 3600;
          hours.show(run);
        });
        place(
          selector(kit, { positions: 3, bound: p.control.fanMode }),
          cx + 0.06,
          -0.1,
          0.85,
        );
        legend('LOW OFF HIGH', cx + 0.06, -0.07, 0.065);
        place(
          ledPushbutton(kit, {
            colour: 'blue',
            legend: 'BOOST',
            power: lit,
            bound: p.control.fanBoost,
          }),
          cx - 0.08,
          -0.13,
          0.9,
        );
        return true;
      }
      case 'grammeter': {
        const lcd = createCharacterLcd(kit, {
          columns: 16,
          rows: 2,
          cell: 0.0042,
        });
        put(lcd.group, cx - 0.08, 0.0);
        caption('CARDINAL GRAMMAGE', cx - 0.08, -0.045);
        every(() =>
          lcd.show(
            [
              `GRAM ${p.gramDisplay.value.padStart(10)}`,
              `Z${p.state.gramZero.value >= 0 ? '+' : ''}${fixed(p.state.gramZero.value)} S${p.state.gramSpan.value >= 0 ? '+' : ''}${fixed(p.state.gramSpan.value)}%`,
            ],
            lit.value,
          ),
        );
        place(
          pushbuttonStation(kit, {
            buttons: [
              {
                colour: 'yellow',
                legend: 'CALIBRATE',
                action: () => p.gramCalibrate(),
              },
              { colour: 'black', legend: 'ZERO', action: () => p.gramZero() },
            ],
            power: lit,
          }),
          cx + 0.075,
          0.0,
          0.8,
        );
        return true;
      }
      default:
        return false;
    }
  };
}

/** Automation Control: the PanelView, its pages, RESET and status lamps. */
function dressAutomation(
  door: DoorKit,
  p: Level0Plant,
  assembly: ReadonlySignal<MachineDevice | null>,
) {
  const { kit, cx, height, lit, circuit, every, place, caption, legend } = door;
  let entry = '';
  const terminalPart = place(
    operatorTerminal(kit, {
      power: lit,
      onKey: (key) => {
        if (key.startsWith('F'))
          p.control.terminalPage.set(Number(key.slice(1)));
        else if (key === '.') entry = '';
        else if (key === '↵') {
          const page = Number(entry);
          if (page >= 1 && page <= TERMINAL_PAGES.length)
            p.control.terminalPage.set(page);
          entry = '';
        } else entry = (entry + key).slice(-1);
      },
    }),
    cx,
    height * 0.2,
  );
  const terminal = terminalPart.view;
  caption(
    'PANELVIEW 1000   F1-F8 PAGES · 1-8 ↵ GO TO PAGE',
    cx,
    height * 0.2 - 0.1,
  );
  let wasRunning = false;
  every(() => {
    const status = p.plcStatus.value;
    if (status === 'run' && !wasRunning)
      partAudio.play(postBeep, terminalPart.object);
    wasRunning = status === 'run';
    if (!lit.value) {
      terminal.draw(null);
      return;
    }
    if (status === 'booting') {
      terminal.draw((c, w, h) =>
        drawBootScreen(
          c,
          w,
          h,
          controllerBootLines('AUTOMATION CONTROL', p.state.plcElapsed.value),
        ),
      );
      return;
    }
    if (!p.electrical.hmi.value) {
      // Its interface chassis (RU1) out, or its X2 open: no data.
      terminal.draw((c, w) => {
        c.font = '12px "Courier New", monospace';
        c.fillStyle = '#e6eef4';
        c.fillRect(0, 0, w, 16);
        c.fillStyle = '#26476e';
        c.fillText('COMMUNICATION LOST', 4, 12);
        c.fillStyle = '#e6eef4';
        c.fillText('NO RESPONSE FROM PLC', 4, 40);
        c.fillText('CHECK INTERFACE CHASSIS RU1', 4, 58);
      });
      return;
    }
    const page = p.control.terminalPage.value;
    terminal.draw((c, w) => {
      c.font = '12px "Courier New", monospace';
      c.fillStyle = '#e6eef4';
      c.fillRect(0, 0, w, 16);
      c.fillStyle = '#26476e';
      c.fillText(
        `${page} ${TERMINAL_PAGES[page - 1]}  PLC ${status.toUpperCase()}`,
        4,
        12,
      );
      c.fillStyle = '#e6eef4';
      const lines = terminalLines(p, page, assembly.value);
      lines
        .slice(0, 6)
        .forEach((line, i) => c.fillText(line.slice(0, 38), 4, 32 + i * 15));
      c.fillText(entry ? `GO TO PAGE ${entry}_` : 'F1..F8 SELECT PAGE', 4, 122);
    });
  });
  // RESET restarts Automation Control's boot whenever its cabinet has
  // power, healthy or not, booted or still booting.
  place(
    pushButton(kit, {
      colour: 'blue',
      legend: 'RESET',
      power: circuit.powered,
      action: () => p.plcReset(),
    }),
    cx + 0.24,
    height * 0.2 - 0.13,
    0.9,
  );
  caption('PLC RESTART', cx + 0.24, height * 0.2 - 0.18);
  const status = (
    colour: OperatorColour,
    y: number,
    on: Readable<boolean>,
    text: string,
  ) => {
    place(
      pilotLight(kit, { colour, drive: on, power: lit }),
      cx + 0.24,
      y,
      0.8,
    );
    legend(text, cx + 0.24, y + 0.03, 0.06);
  };
  status(
    'green',
    height * 0.2 + 0.07,
    computed(() => p.plcStatus.value === 'run'),
    'PLC RUN',
  );
  status(
    'red',
    height * 0.2 - 0.03,
    computed(
      () =>
        p.plcStatus.value === 'halted' ||
        p.faults.value.some((f) => f.code.startsWith('E')),
    ),
    'PLC FAULT',
  );
  caption('VIEWING WINDOW: I/O RACK', cx, -height * 0.23 + height * 0.23);
}

/** Lines for one PanelView page. */
export function terminalLines(
  p: Level0Plant,
  page: number,
  assembly: MachineDevice | null,
): string[] {
  const analog = (value: number, digits = 1) =>
    p.plcAnalog.value ? value.toFixed(digits) : '----';
  switch (page) {
    case 1:
      return [
        `DIMENSION ${p.achieved.value}D ${STAGE_NAMES[p.achieved.value]}`,
        `DRIVE ${p.state.driveHz.value.toFixed(1)} HZ ${p.control.driveLocal.value ? 'LOCAL' : 'REMOTE'}`,
        `LUBE OIL ${analog(p.state.oil.value, 0)} PSI`,
        `FAN ${analog(p.state.fan.value)} INWC`,
        `FEED ${p.feedDemand.value ? 'RUN' : 'STOP'}  ARM ${p.stroking.value ? 'STROKE' : 'IDLE'}`,
        `FAULTS ${p.faults.value.filter((f) => !f.advisory).length}`,
      ];
    case 2: {
      const list = p.faults.value;
      return list.length
        ? list.map((f) => `${f.code} ${f.text}`)
        : ['NO ACTIVE ALARMS'];
    }
    case 3:
      return [
        `BUS ${p.electrical.backplane.value ? 'OK' : 'OFF'}  FIELD 24V ${p.electrical.field.value ? 'OK' : 'OFF'}`,
        ...CARD_KINDS.map((kind, i) => {
          const name = cardDesignation(kind)!.name.toUpperCase().slice(0, 22);
          const seated = assembly?.slots?.[i].occupant.value;
          return `${i + 1} ${name} ${seated ? p.cards[kind].value.toUpperCase() : 'EMPTY'}`;
        }),
      ];
    case 4:
      return [
        `SPEED ${p.state.driveHz.value.toFixed(1)} HZ SET ${p.control.driveSpeed.value * 6}`,
        `SOURCE ${p.control.driveLocal.value ? 'LOCAL KEYPAD' : 'REMOTE PLC'}`,
        `HOLD ${p.driveBlock.value ?? 'NONE'}`,
        `HEATSINK ${analog(p.state.heatsink.value, 0)} C`,
        `PHASE ERR ${analog(p.phaseError.value)} DEG`,
      ];
    case 5:
      return [
        `LUBE OIL ${analog(p.state.oil.value, 0)} PSI ${p.oilOk.value ? 'OK' : 'LOW'}`,
        `HYDRAULIC ${analog(p.state.hydraulic.value, 0)} PSI`,
        `HYDRO FLOW ${analog(p.state.flow.value * 100, 0)}%`,
        `FEED HOA ${['HAND', 'OFF', 'AUTO'][p.control.feedHoa.value]} ${p.feedDemand.value ? 'RUN' : 'STOP'}`,
        `HYD KEY ${p.control.hydraulicKey.value ? 'REMOTE' : 'LOCAL'}`,
      ];
    case 6:
      return [
        `VFD HEATSINK ${analog(p.state.heatsink.value, 0)} C`,
        `CONTROL SECT ${analog(p.state.controlTemp.value, 0)} C`,
        `COOLING FAN ${p.electrical.cooling.value ? 'RUN' : 'OFF'}`,
        `VENT FAN ${p.electrical.vent.value ? 'RUN' : 'OFF'}`,
      ];
    case 7: {
      const c = p.conditions.value;
      return [
        `ACHIEVED ${p.achieved.value}D  ALLOWED ${p.allowed.value}D`,
        `1 CONTROL ${c.control ? 'OK' : '--'}  2 PLC ${c.automation ? 'OK' : '--'}`,
        `3 DRIVE ${c.drive ? 'OK' : '--'}  4 PHASE ${c.phase ? 'OK' : '--'}`,
        `5 FLOW ${c.flow ? 'OK' : '--'}  6 ARM ${c.arm ? 'OK' : '--'}`,
        `COHERENCE ${(p.coherence.value * 100).toFixed(0)}%`,
      ];
    }
    default:
      return p.eventLog.value.slice(-6);
  }
}

/** VFD-601: its process mimic, keypad, SPEED knob and lamps. */
function dressDrive(door: DoorKit, p: Level0Plant) {
  const { kit, cx, height, lit, every, put, place, caption, legend } = door;
  const view = createLcdMonitor(kit, {
    width: 0.34,
    mode: 'mimic',
    seed: door.seed,
    title: 'VFD-601 PROCESS',
  });
  put(view.group, cx - 0.005, height / 2 - 0.27);
  const boot = door.screenBoot('VFD-601 PROCESS', view.group);
  door.ready(boot.ready);
  const picture = (
    c: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
  ) =>
    drawDriveMimic(c, w, h, t, {
      hz: p.state.driveHz.value,
      setpoint: p.control.driveSpeed.value * 6,
      amps: (p.state.driveHz.value / PLANT.driveMaxHz) * 76,
      heatsink: p.state.heatsink.value,
      local: p.control.driveLocal.value,
      reverse: p.control.driveReverse.value,
      block: p.driveBlock.value,
      oilOk: p.oilOk.value,
      isolator: p.electrical.driveIsolator.value,
      cooling: p.electrical.cooling.value,
    });
  view.setPicture(picture);
  every((delta) => {
    view.setOn(lit.value);
    view.setBoot(boot.booting ? boot.lines() : null);
    view.update(delta);
  });
  const page = p.control.drivePage;
  const keypadPart = place(
    driveKeypad(kit, {
      power: lit,
      onKey: (key) => {
        switch (key) {
          case 'start':
            p.driveStart();
            break;
          case 'stop':
            p.driveStop();
            break;
          case 'jog':
            p.driveJog();
            break;
          case 'reverse':
            if (p.control.driveLocal.value)
              p.control.driveReverse.set(!p.control.driveReverse.value);
            break;
          case 'up':
            page.set((page.value + 1) % DRIVE_PAGES.length);
            break;
          case 'down':
            page.set(
              (page.value + DRIVE_PAGES.length - 1) % DRIVE_PAGES.length,
            );
            break;
          case 'sel':
            page.set((page.value + 1) % DRIVE_PAGES.length);
            break;
          case 'esc':
            page.set(0);
            break;
          case 'enter':
            // LOCAL (the keypad) or REMOTE (Automation Control); the change
            // stops a running drive, as a real one does.
            p.driveStop();
            p.control.driveLocal.set(!p.control.driveLocal.value);
            break;
        }
      },
    }),
    cx - 0.1,
    0.02,
  );
  caption('START STOP/RESET JOG REV\nENTER: LOCAL/REMOTE', cx - 0.1, -0.075);
  const keypad = keypadPart.view;
  const boot2 = door.screenBoot('VFD-601 HIM', keypadPart.object);
  every(() => {
    const hz = p.state.driveHz.value;
    const lines = (() => {
      switch (DRIVE_PAGES[page.value]) {
        case 'CURRENT':
          return ['OUTPUT CURRENT', `${((hz / 60) * 76).toFixed(1)} A`];
        case 'HEATSINK':
          return ['HEATSINK TEMP', `${p.state.heatsink.value.toFixed(0)} C`];
        case 'PERMITS':
          return [
            `LUBE ${p.oilOk.value ? 'OK' : 'NO'} ISO ${p.electrical.driveIsolator.value ? 'OK' : 'NO'}`,
            `SRC ${p.control.driveLocal.value ? 'LOCAL' : 'REMOTE'}`,
          ];
        case 'FAULT':
          return ['LAST FAULT', p.state.vfdFault.value ?? 'NONE'];
        default:
          return [
            `VFD-601 ${p.driveBlock.value ? 'HOLD' : hz > 0.5 ? 'RUNNING' : 'READY'}`,
            `${((hz / 60) * 1750).toFixed(0)} RPM ${p.control.driveReverse.value ? 'REV' : 'FWD'}`,
          ];
      }
    })();
    keypad.show(boot2.booting ? boot2.lines(2, 16) : lines, lit.value);
  });
  place(
    potentiometer(kit, { steps: 10, bound: p.control.driveSpeed }),
    cx + 0.07,
    0.04,
    0.9,
  );
  legend('SPEED', cx + 0.07, 0.07);
  caption('0-60 HZ', cx + 0.07, 0.0);
  for (const [colour, dx, label, on] of [
    ['#3dff5a', 0.05, 'RUN', computed(() => p.state.driveHz.value > 0.5)],
    ['#ffb01a', 0.09, 'FAULT', computed(() => p.state.vfdFault.value !== null)],
  ] as const) {
    const jewel = createJewelLamp(kit, colour, { on: false });
    put(jewel.group, cx + dx, -0.04);
    caption(label, cx + dx, -0.065);
    every(() => jewel.set(lit.value && on.value));
  }
  door.louvres(0.36, 0.34, cx - 0.01, -height / 2 + 0.24);
}

/** Every bucket's sound, held while its machine runs, by the model. */
export function level0Tones(
  plant: Level0Plant,
  running: (id: string) => Readable<boolean>,
) {
  const p = plant;
  return {
    toneEnabled: {
      [UNITS.lube]: running(UNITS.lube),
      [UNITS.hydro]: running(UNITS.hydro),
      [UNITS.fan]: computed(() => p.state.fan.value > 0.15),
    },
    toneRate: {
      [UNITS.fan]: computed(
        () => 0.45 + (0.55 * p.state.fan.value) / PLANT.fanHigh,
      ),
      [UNITS.vfd]: computed(
        () => 0.6 + (0.4 * p.state.driveHz.value) / PLANT.driveMaxHz,
      ),
    },
    driveTrain: {
      running: computed(() => p.state.driveHz.value > 0.3),
      rate: computed(
        () => 0.3 + (0.7 * p.state.driveHz.value) / PLANT.driveMaxHz,
      ),
    },
  };
}
