import { computed } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import {
  createHourMeter,
  createLedPushbutton,
  createMomentary,
  createMushroomStop,
  createPilotLight,
  createSelector,
} from '../game/world/components';
import {
  createDrive,
  driveDisplay,
  driveRpm,
  pressDriveKey,
  stepDrive,
} from '../game/drive-keypad';
import type { DriveKey } from '../game/drive-keypad';
import {
  createTerminal,
  pressTerminalKey,
  terminalLines,
} from '../game/operator-terminal';
import {
  createMicroLabel,
  createSevenSegment,
} from '../scene/eighties-controls';
import type { PanelKit } from '../scene/eighties-controls';
import {
  createLegendPlate,
  createLeverSelector,
  createMushroomHead,
  createPilotLamp,
  createPotentiometer,
  createPushButton,
} from '../scene/industrial-controls';
import type { OperatorColour } from '../scene/industrial-controls';
import {
  createDriveKeypad,
  createHourMeterView,
  createMessageDisplay,
  createOperatorTerminal,
  createStackLight,
} from '../scene/industrial-displays';
import { createPanelMeter } from '../scene/panel-instruments';
import { createPartSoundHub } from './part-sound-hub';
import { createPs1Material } from './ps1-material';

/** What a board or pedestal gives the room. */
export interface TestFitting {
  group: Group;
  /** What a click on each part does; `direction` is -1 or 1 for knobs. */
  uses: Map<Object3D, (direction?: number) => void>;
  onSound: ReturnType<typeof createPartSoundHub>['onSound'];
  onHeld: ReturnType<typeof createPartSoundHub>['onHeld'];
  update(seconds: number, delta: number, reducedMotion: boolean): void;
  dispose(): void;
}

/**
 * A grey board on a stand with a title, built in metres, its parts at
 * `scale` times life size. Returns helpers to place parts and captions.
 */
export function createBoard(
  kit: PanelKit,
  {
    title,
    width,
    height,
    scale,
    captionScale = 1,
  }: {
    title: string;
    width: number;
    height: number;
    scale: number;
    captionScale?: number;
  },
) {
  const group = new Group();
  const backing = createPs1Material({ color: '#b9bcb5' });
  kit.materials.push(backing);
  const plate = new Mesh(
    new BoxGeometry(width * scale, height * scale, 0.02),
    backing,
  );
  plate.position.z = -0.01;
  group.add(plate);
  const parts = new Group();
  parts.scale.setScalar(scale);
  group.add(parts);
  const heading = createMicroLabel(kit, title, {
    height: 0.016,
    ink: '#23241f',
  });
  heading.position.set(0, height / 2 - 0.022, 0.0006);
  parts.add(heading);
  return {
    group,
    parts,
    at(part: Object3D, x: number, y: number) {
      part.position.set(x, y, 0);
      parts.add(part);
      return part;
    },
    caption(text: string, x: number, y: number, size = 0.0055) {
      const label = createMicroLabel(kit, text, {
        height: size * captionScale,
        ink: '#2b2a25',
      });
      label.position.set(x, y, 0.0005);
      parts.add(label);
    },
  };
}

/** The common plumbing of a fitting: its parts' sounds, uses and steps. */
export function fittingParts() {
  const hub = createPartSoundHub();
  const uses = new Map<Object3D, (direction?: number) => void>();
  const updates: ((delta: number) => void)[] = [];
  const steps: ((seconds: number) => void)[] = [];
  return { hub, uses, updates, steps };
}

/**
 * The CONTROLS board: one of each kind of 30 mm pilot device, three times
 * life size, each with its legend plate above and what it is below. Every
 * one is a component; the log names each as it is worked.
 */
export function createControlsBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'CONTROLS',
    width: 1.0,
    height: 0.46,
    scale: 3,
  });
  const { hub, uses, updates } = fittingParts();
  const row1 = 0.1;
  const row2 = -0.09;
  const device = (
    legend: string,
    what: string,
    x: number,
    y: number,
    view: Object3D,
    yellow = false,
  ) => {
    board.at(view, x, y);
    const plate = createLegendPlate(kit, legend, {
      yellow,
      width: Math.max(0.05, legend.length * 0.0042 + 0.012),
    });
    board.at(plate, x, y + 0.042);
    board.caption(what, x, y - 0.045, 0.0045);
  };

  const buttons: [string, OperatorColour, 'flush' | 'extended', string][] = [
    ['START', 'green', 'flush', 'PUSH BUTTON, FLUSH'],
    ['STOP', 'red', 'extended', 'PUSH BUTTON, EXTENDED'],
    ['JOG', 'black', 'flush', 'PUSH BUTTON, FLUSH'],
    ['RESET', 'blue', 'flush', 'PUSH BUTTON, FLUSH'],
  ];
  buttons.forEach(([legend, colour, head, what], i) => {
    const view = createPushButton(kit, colour, { head });
    const x = -0.4 + i * 0.12;
    device(legend, what, x, row1, view.group);
    const part = createMomentary();
    view.group.name = `${legend} push button`;
    hub.add(part, view.group, 'button', () => view.press());
    uses.set(view.cap, () => part.press());
    updates.push(view.update);
  });
  // An illuminated push-on, push-off button.
  {
    const view = createPushButton(kit, 'amber', { head: 'illuminated' });
    device('PUMP ON', 'ILLUMINATED, PUSH ON/OFF', 0.08, row1, view.group);
    const part = createLedPushbutton();
    view.group.name = 'PUMP ON illuminated push button';
    hub.add(part, view.group, 'button', () => view.press());
    uses.set(view.cap, () => part.press());
    updates.push((delta) => {
      view.setLit(part.lit.value);
      view.update(delta);
    });
  }
  {
    const view = createMushroomHead(kit);
    device(
      'EMERGENCY STOP',
      'MUSHROOM, PUSH-PULL',
      0.22,
      row1,
      view.group,
      true,
    );
    const part = createMushroomStop();
    view.group.name = 'EMERGENCY STOP';
    hub.add(part, view.group, 'mushroom');
    uses.set(view.head, () => part.operate());
    updates.push((delta) => {
      view.set(part.pushed.value);
      view.update(delta);
    });
  }
  {
    const view = createPilotLamp(kit, 'red');
    device('RUNNING', 'PILOT LIGHT, PUSH TO TEST', 0.37, row1, view.group);
    const part = createPilotLight();
    view.group.name = 'RUNNING pilot light';
    hub.add(part, view.group, 'button', () => view.press());
    uses.set(view.lens, () => part.press());
    updates.push((delta) => {
      part.step(delta);
      view.set(part.lit.value);
      view.update(delta);
    });
  }

  const selectors: [string, string, 2 | 3, boolean, number][] = [
    ['HAND  OFF  AUTO', 'SELECTOR, 3 POSITION', 3, false, 1],
    ['OFF   ON', 'SELECTOR, 2 POSITION', 2, false, 0],
    ['OFF   ON', 'KEY SELECTOR', 2, true, 0],
  ];
  selectors.forEach(([legend, what, positions, key, initial], i) => {
    const view = createLeverSelector(kit, positions, { key });
    const x = -0.4 + i * 0.14;
    device(legend, what, x, row2, view.group);
    const part = createSelector({ positions, initial });
    view.group.name = `${what.toLowerCase()} ${legend.replace(/ +/g, '-')}`;
    hub.add(part, view.group, key ? 'key-switch' : 'selector');
    uses.set(view.knob, (direction = 1) => part.turn(direction));
    updates.push((delta) => {
      view.set(part.position.value);
      view.update(delta);
    });
  });
  {
    const view = createPotentiometer(kit);
    device('SPEED', 'POTENTIOMETER', 0.04, row2, view.group);
    const part = createSelector({ positions: 11, initial: 3 });
    view.group.name = 'SPEED potentiometer';
    hub.add(part, view.group, 'knob');
    uses.set(view.knob, (direction = 1) => part.turn(direction));
    updates.push((delta) => {
      view.set(part.share.value);
      view.update(delta);
    });
  }
  board.caption(
    'Click the left half of a knob to turn it down, the right half to turn it up.',
    0.2,
    -0.2,
    0.0045,
  );

  return {
    group: board.group,
    uses,
    onSound: hub.onSound,
    onHeld: hub.onHeld,
    update(_seconds, delta) {
      for (const step of updates) step(delta);
    },
    dispose: () => hub.dispose(),
  };
}

/** The plant messages the message display steps through. */
const MESSAGES: [string, string][] = [
  ['CONVEYOR M1', 'RUNNING'],
  ['LINE 2 STOPPED', 'OPERATOR REQUEST'],
  ['LUBE PRESSURE LOW', 'PUMP 3'],
  ['MOTOR M4 OVERLOAD', 'RESET AT UNIT 2C'],
  ['SHIFT 2', 'GOOD MORNING'],
];

/**
 * The DISPLAYS board: one of each kind of indicator and display, twice
 * life size, each driven by test controls under it, so every reading on
 * it is a value someone set. A BOARD POWER selector feeds them all.
 */
export function createDisplaysBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'DISPLAYS',
    width: 1.6,
    height: 0.62,
    scale: 2,
    captionScale: 1.5,
  });
  const { hub, uses, updates, steps } = fittingParts();
  const small = (part: Object3D) => {
    part.scale.setScalar(0.8);
    return part;
  };
  /** A lever selector as a test control, at 0.6 life size, with its legend. */
  const lever = (
    legend: string,
    positions: 2 | 3,
    x: number,
    y: number,
    initial = 0,
    name = legend,
  ) => {
    const view = createLeverSelector(kit, positions);
    board.at(small(view.group), x, y);
    const plate = createLegendPlate(kit, legend, {
      width: 0.045,
      height: 0.011,
    });
    board.at(small(plate), x, y + 0.026);
    const part = createSelector({ positions, initial });
    view.group.name = name;
    hub.add(part, view.group, 'selector');
    uses.set(view.knob, (direction = 1) => part.turn(direction));
    updates.push((delta) => {
      view.set(part.position.value);
      view.update(delta);
    });
    return part;
  };
  /** A potentiometer as a test control, with its legend. */
  const pot = (
    legend: string,
    x: number,
    y: number,
    positions = 11,
    name = legend,
  ) => {
    const view = createPotentiometer(kit);
    board.at(small(view.group), x, y);
    const plate = createLegendPlate(kit, legend, {
      width: 0.05,
      height: 0.011,
    });
    board.at(small(plate), x, y + 0.028);
    const part = createSelector({ positions });
    view.group.name = name;
    hub.add(part, view.group, 'knob');
    uses.set(view.knob, (direction = 1) => part.turn(direction));
    updates.push((delta) => {
      view.set(part.share.value);
      view.update(delta);
    });
    return part;
  };
  const button = (
    legend: string,
    colour: OperatorColour,
    x: number,
    y: number,
    action: () => void,
  ) => {
    const view = createPushButton(kit, colour);
    board.at(small(view.group), x, y);
    const plate = createLegendPlate(kit, legend, {
      width: 0.045,
      height: 0.011,
    });
    board.at(small(plate), x, y + 0.026);
    const part = createMomentary({ action });
    view.group.name = `${legend} push button`;
    hub.add(part, view.group, 'button', () => view.press());
    uses.set(view.cap, () => part.press());
    updates.push(view.update);
  };

  const powerSelector = lever(
    'BOARD POWER',
    2,
    -0.72,
    0.2,
    1,
    'BOARD POWER selector',
  );
  const power = computed(() => powerSelector.position.value === 1);

  // The message display, stepped by NEXT.
  const message = createMessageDisplay(kit);
  board.at(message.group, -0.47, 0.19);
  board.caption('MESSAGE DISPLAY, VACUUM FLUORESCENT', -0.47, 0.13);
  let shown = 0;
  button(
    'NEXT',
    'black',
    -0.47,
    0.07,
    () => (shown = (shown + 1) % MESSAGES.length),
  );
  updates.push(() => message.show(MESSAGES[shown], power.value));

  // The stack light on its bracket, and its mode.
  const stack = createStackLight(kit);
  board.at(stack.group, -0.2, 0.06);
  board.caption('STACK LIGHT', -0.2, 0.03);
  const mode = createSelector({ positions: 4 });
  {
    const view = createPotentiometer(kit);
    board.at(small(view.group), -0.2, -0.02);
    board.caption('OFF  RUN  WARN  FAULT', -0.2, -0.05, 0.0035);
    view.group.name = 'STACK LIGHT mode selector';
    hub.add(mode, view.group, 'selector');
    uses.set(view.knob, (direction = 1) => mode.turn(direction));
    updates.push((delta) => {
      view.set(mode.share.value);
      view.update(delta);
      const m = mode.position.value;
      stack.set(
        power.value ? [m === 3, m === 2, m === 1] : [false, false, false],
      );
    });
  }

  // The operator terminal: its keys are momentary components.
  const terminal = createOperatorTerminal(kit);
  board.at(terminal.group, 0.15, 0.16);
  board.caption('OPERATOR TERMINAL', 0.15, 0.06);
  const program = createTerminal();
  terminal.functionKeys.forEach((key, i) => {
    const part = createMomentary({
      power,
      action: () => pressTerminalKey(program, `F${i + 1}`),
    });
    key.cap.name = key.group.name = `terminal F${i + 1}`;
    hub.add(part, key.group, 'key', () => key.press());
    uses.set(key.cap, () => part.press());
  });
  const keyLegends = [
    '7',
    '8',
    '9',
    '4',
    '5',
    '6',
    '1',
    '2',
    '3',
    '0',
    '.',
    '↵',
  ];
  terminal.keypad.forEach((key, i) => {
    const part = createMomentary({
      power,
      action: () => pressTerminalKey(program, keyLegends[i]),
    });
    key.cap.name = key.group.name = `terminal key ${keyLegends[i]}`;
    hub.add(part, key.group, 'key', () => key.press());
    uses.set(key.cap, () => part.press());
  });
  updates.push(terminal.update);

  // The drive keypad and its drive; the terminal's MAIN screen shows its speed.
  const keypad = createDriveKeypad(kit);
  board.at(keypad.group, 0.5, 0.17);
  board.caption('DRIVE KEYPAD (HIM)', 0.5, 0.1);
  const drive = createDrive();
  for (const [name, key] of Object.entries(keypad.keys)) {
    const part = createMomentary({
      power,
      action: () => pressDriveKey(drive, name as DriveKey),
    });
    key.cap.name = key.group.name = `drive keypad ${name}`;
    hub.add(part, key.group, 'key', () => key.press());
    uses.set(key.cap, () => part.press());
  }
  updates.push((delta) => {
    if (!power.value) drive.running = drive.jogging = false;
    stepDrive(drive, delta);
    keypad.show(driveDisplay(drive), power.value);
    keypad.update(delta);
    terminal.draw(
      power.value
        ? (c, w) => {
            const lines = terminalLines(program, driveRpm(drive));
            c.fillRect(0, 0, w, 18);
            c.fillStyle = '#26476e';
            c.fillText(lines[0], 6, 3);
            c.fillStyle = '#e6eef4';
            lines
              .slice(1)
              .forEach((line, i) => c.fillText(line, 6, 24 + i * 16));
          }
        : null,
    );
  });

  // Pilot lights, each driven by a lever under it.
  const lamps: [string, OperatorColour][] = [
    ['RUN', 'red'],
    ['OFF', 'green'],
    ['OVERLOAD', 'amber'],
    ['POWER', 'white'],
  ];
  lamps.forEach(([legend, colour], i) => {
    const x = -0.72 + i * 0.075;
    const view = createPilotLamp(kit, colour);
    board.at(small(view.group), x, -0.12);
    const plate = createLegendPlate(kit, legend, {
      width: 0.045,
      height: 0.011,
    });
    board.at(small(plate), x, -0.094);
    const drive = lever(
      'DRIVE',
      2,
      x,
      -0.2,
      0,
      `${legend} lamp drive selector`,
    );
    const part = createPilotLight({
      power,
      drive: computed(() => drive.position.value === 1),
    });
    view.group.name = `${legend} pilot light`;
    hub.add(part, view.group, 'button', () => view.press());
    uses.set(view.lens, () => part.press());
    steps.push(part.step);
    updates.push((delta) => {
      view.set(part.lit.value);
      view.update(delta);
    });
  });
  board.caption('PILOT LIGHTS, PUSH TO TEST', -0.61, -0.25);

  // The switchboard meters, each with its test knob.
  const ammeter = createPanelMeter(kit, 'A  AC', {
    width: 0.09,
    scaleMax: 50,
    redFrom: 0.85,
  });
  board.at(ammeter.group, -0.33, -0.12);
  const amps = pot('TEST AMPS', -0.33, -0.21, 11, 'TEST AMPS potentiometer');
  updates.push((delta) => {
    ammeter.set(power.value ? amps.share.value : 0);
    ammeter.update(delta);
  });
  board.caption('AMMETER 0-50 A', -0.33, -0.25);
  const voltmeter = createPanelMeter(kit, 'V  AC', {
    width: 0.09,
    scaleMax: 600,
    redFrom: 0.9,
  });
  board.at(voltmeter.group, -0.19, -0.12);
  const volts = pot('TEST VOLTS', -0.19, -0.21, 13, 'TEST VOLTS potentiometer');
  updates.push((delta) => {
    voltmeter.set(power.value ? volts.share.value : 0);
    voltmeter.update(delta);
  });
  board.caption('VOLTMETER 0-600 V', -0.19, -0.25);

  // A digital panel meter, red LEDs, showing the drive's speed.
  const dpm = createSevenSegment(kit, 4, { digitHeight: 0.016 });
  board.at(dpm.group, -0.03, -0.12);
  updates.push(() =>
    dpm.show(power.value ? String(Math.round(driveRpm(drive))) : ''),
  );
  board.caption('DIGITAL PANEL METER: DRIVE RPM', -0.03, -0.155, 0.0045);

  // The hour meter, its RUN and a fast-forward for checking it.
  const hourView = createHourMeterView(kit);
  board.at(hourView.group, 0.13, -0.12);
  const run = lever('RUN', 2, 0.1, -0.2, 0, 'HOUR METER RUN selector');
  const fast = lever('×360', 2, 0.16, -0.2, 0, 'HOUR METER fast selector');
  const hours = createHourMeter({
    running: computed(() => power.value && run.position.value === 1),
    initial: 4211.3,
  });
  steps.push((s) => hours.step(fast.position.value === 1 ? s * 360 : s));
  updates.push(() => hourView.show(hours.hours.value));
  board.caption('HOUR METER', 0.13, -0.25);

  return {
    group: board.group,
    uses,
    onSound: hub.onSound,
    onHeld: hub.onHeld,
    update(_seconds, delta) {
      for (const step of steps) step(delta);
      for (const update of updates) update(delta);
    },
    dispose: () => hub.dispose(),
  };
}
