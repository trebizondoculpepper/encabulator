import { createLevel0Failures } from './level0-failures';
import { createBbcComputer } from '../toolkit/components/industrial-control/logic/bbc-micro';
import { createLevel0Scenarios } from './level0-scenarios';
import {
  Box3,
  Group,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { PLANT } from '../game/level0-plant';
import { UNITS } from '../scene/level0-faces';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import type { PortableObject } from '../toolkit/controls/input/object-handling';
import { watchMerged } from '../toolkit/components/core/views/merge-static';
import { FAILURES } from '../game/machine-failure';
import { CARD_KINDS } from '../game/level0-plant';
import { createLevel0Machine } from './level0-machine';
import { MODULE_OF, UNIT_ROLES } from './level0-wiring';
import { SCAN_SECONDS_PER_WINDOW } from '../game/level0-status';
import { WINDOWS } from '../game/level0-plant';

beforeEach(() => {
  // Label and screen canvases are made, but nothing is drawn.
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
// Whole machines run for minutes of simulated time.
vi.setConfig({ testTimeout: 30_000 });

function sandbox() {
  const kit = createPanelKit();
  const machine = createLevel0Machine(kit, { random: () => 0 });
  const room = new Group();
  room.add(machine.mcc.group);
  const breaker = (id: string) =>
    machine.mcc.circuits.get(id)!.breaker!.breaker!;
  const run = (seconds: number, dt = 0.1) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) machine.update(dt);
  };
  /** The incoming isolator and the main disconnect on, and the lube pump. */
  /**
   * Start the machine by hand, as a player would: the isolator, the power interlock
   * key, the main disconnect, every unit's breaker but the hydrocoptic
   * pump's, START on each motor that has one, and its knobs and selectors
   * set to run.
   */
  const powerUp = () => {
    isolate(machine);
    const { control } = machine.plant;
    control.interlockKey.set(true);
    breaker(UNITS.main).operate();
    for (const [id, unit] of machine.mcc.circuits)
      if (
        ![UNITS.incoming, UNITS.main, UNITS.hydro].includes(id as never) &&
        unit.breaker?.breaker?.position.value === 'off'
      )
        unit.breaker.breaker.operate();
    for (const id of [UNITS.mainMotor, UNITS.cooling, UNITS.auxMotor])
      machine.mcc.circuits.get(id)!.start();
    control.feedHoa.set(2);
    control.hydraulicKey.set(2);
    control.driveSpeed.set(6);
    control.auxSpeed.set(5);
    control.chartRun.set(1);
    run(20);
  };
  const dispose = () => {
    machine.dispose();
    machine.mcc.parts.dispose();
    disposeKit(kit, machine.mcc.group);
  };
  return { machine, room, breaker, run, powerUp, dispose };
}

/** Turn the incoming isolator on, through its own handle. */
function isolate(machine: ReturnType<typeof createLevel0Machine>) {
  let handle: Object3D | undefined;
  machine.mcc.group.traverse((o) => {
    if (!handle && o.name === 'Incoming supply isolator') handle = o;
  });
  if (machine.mcc.supply.value) return;
  for (const [object, use] of machine.mcc.parts.uses) {
    let o: Object3D | null = object;
    while (o && o !== handle) o = o.parent;
    if (o) {
      use();
      if (machine.mcc.supply.value) return;
    }
  }
}

/** What the shared pickup does to a board it takes out of the machine. */
function pull(board: MachineDevice, room: Group) {
  const portable = board.object.userData.portable as PortableObject;
  expect(portable.component.canPickUp.value).toBe(true);
  portable.component.pickUp();
  portable.detach();
  room.attach(board.object);
}

/** The operator inputs on a unit's door, latches and back excluded. */
function inputsOn(
  machine: ReturnType<typeof createLevel0Machine>,
  label: string,
) {
  let hinge: Object3D | undefined;
  machine.mcc.group.traverse((o) => {
    if (
      o.name.startsWith('Section ') &&
      o.name.includes(label) &&
      (o.name.endsWith(' door hinge') || o.name.endsWith(' cover hinge'))
    )
      hinge = o;
  });
  const found: Object3D[] = [];
  for (const object of machine.mcc.parts.uses.keys()) {
    let o: Object3D | null = object;
    let excluded = false;
    while (o && o !== hinge) {
      if (/ latch$| back$/.test(o.name)) excluded = true;
      o = o.parent;
    }
    if (o === hinge! && !excluded) found.push(object);
  }
  return found;
}

describe('Level 0 machine wiring', () => {
  it('gives every functional unit at least one physical input on its own door', () => {
    const { machine, dispose } = sandbox();
    const units = [
      'MAIN INCOMING',
      'MAIN DISCONNECT',
      'DISTRIBUTION',
      'MAIN DRIVE MOTOR',
      'FEED MOTOR',
      'AUXILIARY MOTOR',
      'LUBE OIL PUMP',
      'COOLING FAN',
      'HYDRAULIC PUMP',
      'AUXILIARY DRIVE',
      'VENTILATION FAN',
      'ENCABULATOR CONTROL',
      'MODIAL INTERACTION',
      'PHASE REFERENCE',
      'PANENDERMIC MONITOR',
      'AUTOMATION CONTROL',
      'FIELD TERMINATIONS',
      'MAIN ENCABULATOR DRIVE',
      'DRIVE ISOLATOR',
      'RECIPROCATING DINGLE ARM',
      'HYDROCOPTIC PUMP',
      'PANENDERMIC FAN',
      'CARDINAL GRAMMETER',
    ];
    for (const unit of units)
      expect(inputsOn(machine, unit).length, unit).toBeGreaterThan(0);
    // The spare space is a blank plate, and needs none.
    expect(inputsOn(machine, 'SPARE SPACE')).toHaveLength(0);
    dispose();
  });

  it('starts a fresh room with every machine switch and selector off', () => {
    const { machine, run, dispose } = sandbox();
    const { plant, mcc } = machine;
    expect(mcc.supply.value).toBe(false);
    for (const [id, unit] of mcc.circuits) {
      const position = unit.breaker?.breaker?.position.value;
      // MAIN INCOMING's sealed breaker is protection, never operated.
      if (position)
        expect(position, id).toBe(id === UNITS.incoming ? 'on' : 'off');
    }
    const { control } = plant;
    expect(control.interlockKey.value).toBe(false);
    expect(control.feedHoa.value).toBe(1);
    expect(control.hydraulicKey.value).toBe(1);
    // PHASE has no OFF: it chooses the control supply's phase.
    expect(control.controlPhase.value).toBe(0);
    expect(control.fanMode.value).toBe(1);
    expect(control.fanBoost.value).toBe(false);
    expect(control.dingleEnable.value).toBe(0);
    expect(control.chartRun.value).toBe(0);
    expect(control.driveSpeed.value).toBe(0);
    expect(control.auxSpeed.value).toBe(0);
    // Released, healthy and silent.
    expect(control.driveLocal.value).toBe(true);
    for (const unit of mcc.circuits.values()) {
      expect(unit.emergency.value).toBe(false);
      expect(unit.running.value).toBe(false);
    }
    expect(
      mcc.components.some((d) => d.faulted.value && d.kind !== 'rack-unit'),
    ).toBe(false);
    run(5);
    expect(plant.plcStatus.value).toBe('off');
    expect(plant.loadAmps.value).toBe(0);
    dispose();
  });

  it('powers up only what each switch reaches, from the isolator to each module', () => {
    const { machine, breaker, run, dispose } = sandbox();
    const { plant, mcc } = machine;
    isolate(machine);
    run(1);
    // Incoming only: MAIN INCOMING's meters and the station battery.
    expect(mcc.circuits.get(UNITS.incoming)!.powered.value).toBe(true);
    expect(plant.electrical.mains.value).toBe(false);
    // Its lamp, fed from the incoming side, shows the interlock locked.
    const locked = mcc.group.getObjectByName('Power interlock locked lamp')!;
    const lamp = mcc.parts.uses.get(
      [...mcc.parts.uses.keys()].find((o) => {
        for (let x: Object3D | null = o; x; x = x.parent)
          if (x === locked) return true;
        return false;
      })!,
    );
    expect(lamp).toBeDefined();
    run(0.1);
    expect(interlockLampLit(machine)).toBe(true);
    // Locked, the main disconnect's door handle will not move: it shudders
    // against its stop instead.
    const doorHandle = within(machine, 'MAIN DISCONNECT', 'disconnect handle');
    let lever: Object3D = doorHandle;
    while (lever.name !== 'disconnect handle') lever = lever.parent!;
    mcc.parts.uses.get(doorHandle)!();
    run(0.05);
    expect(breaker(UNITS.main).position.value).toBe('off');
    expect(Math.abs(lever.children[0].rotation.z)).toBeGreaterThan(0);
    run(1);
    expect(lever.children[0].rotation.z).toBe(0);
    // The power interlock key out holds the main disconnect's handle open.
    const handle = mcc.circuits.get(UNITS.main)!.breaker!.handle!;
    expect(handle.operate()).toBe(false);
    expect(breaker(UNITS.main).position.value).toBe('off');
    plant.control.interlockKey.set(true);
    run(0.1);
    expect(interlockLampLit(machine)).toBe(false);
    expect(handle.operate()).toBe(true);
    run(1);
    expect(plant.electrical.mains.value).toBe(true);
    // Downstream of the disconnect, the monitor's current climbs as each
    // unit is energised: first only the control transformer.
    const amps = () => plant.monitor.value.amps;
    const idle = amps();
    expect(idle).toBeGreaterThan(0);
    expect(idle).toBeLessThan(0.5);
    // Each unit still waits for its own switch.
    expect(plant.plcStatus.value).toBe('off');
    expect(mcc.circuits.get(UNITS.lube)!.running.value).toBe(false);
    breaker(UNITS.automation).operate();
    run(0.2);
    expect(plant.plcStatus.value).toBe('booting');
    run(PLANT.plcBoot + 0.5);
    expect(plant.plcStatus.value).toBe('run');
    const withPlc = amps();
    expect(withPlc).toBeGreaterThan(idle);
    breaker(UNITS.lube).operate();
    run(5);
    expect(plant.oilOk.value).toBe(true);
    expect(amps()).toBeGreaterThan(withPlc + 3);
    // The main drive motor has power and oil, and waits for START.
    breaker(UNITS.mainMotor).operate();
    run(1);
    expect(mcc.circuits.get(UNITS.mainMotor)!.running.value).toBe(false);
    mcc.circuits.get(UNITS.mainMotor)!.start();
    run(1);
    expect(mcc.circuits.get(UNITS.mainMotor)!.running.value).toBe(true);
    // The hydraulic pump's key: OFF holds it, LOCAL runs it.
    breaker(UNITS.hydraulic).operate();
    run(1);
    expect(mcc.circuits.get(UNITS.hydraulic)!.running.value).toBe(false);
    plant.control.hydraulicKey.set(0);
    run(1);
    expect(mcc.circuits.get(UNITS.hydraulic)!.running.value).toBe(true);
    // The main disconnect's monitor reads the load, whatever PHASE is.
    const monitor = plant.monitor.value;
    expect(monitor.amps).toBeGreaterThan(0);
    plant.control.controlPhase.set(2);
    expect(plant.monitor.value).toEqual(monitor);
    dispose();
  });

  it('boots Automation Control and builds dimensions as the machine is started', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    expect(machine.mcc.supply.value).toBe(false);
    powerUp();
    expect(machine.mcc.supply.value).toBe(true);
    expect(machine.plant.plcStatus.value).toBe('run');
    expect(machine.plant.oilOk.value).toBe(true);
    // The control unit's screen has booted: the line and the square, no more.
    run(30);
    expect(machine.plant.achieved.value).toBe(2);
    machine.plant.control.driveSpeed.set(10);
    machine.plant.driveStart();
    run(20);
    expect(machine.plant.state.driveHz.value).toBeCloseTo(60, 3);
    expect(machine.plant.achieved.value).toBe(3);
    // PHASE TRIM, turned up through its detents with the shared use.
    const trim = inputsOn(machine, 'PHASE REFERENCE')[0];
    for (let i = 0; i < 4; i++) machine.mcc.parts.uses.get(trim)!(1);
    expect(machine.plant.phaseTrimDegrees.value).toBe(20);
    expect(machine.plant.phaseLocked.value).toBe(true);
    run(10);
    expect(machine.plant.achieved.value).toBe(4);
    dispose();
  });

  it('restarts Automation Control on every powered RESET press', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    const reset = inputsOn(machine, 'AUTOMATION CONTROL').find((o) => {
      for (let p: Object3D | null = o; p; p = p.parent)
        if (p.name === 'RESET push button') return true;
      return false;
    })!;
    machine.mcc.parts.uses.get(reset)!();
    run(0.2);
    expect(machine.plant.plcStatus.value).toBe('booting');
    run(1);
    machine.mcc.parts.uses.get(reset)!();
    run(0.2);
    expect(machine.plant.state.plcElapsed.value).toBeLessThan(0.5);
    run(PLANT.plcBoot + 0.5);
    expect(machine.plant.plcStatus.value).toBe('run');
    dispose();
  });

  it('isolates and removes a failed card, which stays failed when put back', () => {
    const { machine, room, breaker, powerUp, run, dispose } = sandbox();
    powerUp();
    const removed: MachineDevice[] = [];
    machine.onBoardRemoved((board) => removed.push(board));
    const power = machine.assembly.slots![0].occupant.value!;
    machine.inflict('card:plc-power');
    run(3);
    expect(machine.plant.plcStatus.value).toBe('halted');
    expect(machine.plant.faults.value.map((f) => f.code)).toEqual(
      expect.arrayContaining(['E10', 'E11']),
    );
    expect(machine.plant.healthy.value).toBe(false);
    expect(machine.hazard().arcing).toBe(true);
    expect(machine.hazard().smoke).toBeGreaterThan(0.3);
    // Live, it will not come out.
    expect(
      (power.object.userData.portable as PortableObject).component.canPickUp
        .value,
    ).toBe(false);
    breaker(UNITS.automation).operate();
    run(0.2);
    // Isolated, it stops arcing at once; its smoke drifts away slowly.
    expect(machine.hazard().arcing).toBe(false);
    const smoke = machine.hazard().smoke;
    run(3);
    expect(machine.hazard().smoke).toBeLessThan(smoke);
    expect(machine.hazard().smoke).toBeGreaterThan(0);
    pull(power, room);
    run(0.2);
    expect(removed).toEqual([power]);
    // A live cabinet refuses it.
    breaker(UNITS.automation).operate();
    expect(machine.reseat(power)).toBe(false);
    breaker(UNITS.automation).operate();
    expect(machine.reseat(power)).toBe(true);
    breaker(UNITS.automation).operate();
    run(PLANT.plcBoot + 1);
    expect(machine.plant.plcStatus.value).toBe('halted');
    expect(machine.hazard().arcing).toBe(true);
    dispose();
  });

  it('blows a control fuse, losing its unit, until the fuse is replaced', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    machine.plant.driveStart();
    run(10);
    expect(machine.plant.state.driveHz.value).toBeGreaterThan(30);
    machine.inflict(`fuse:${UNITS.lube}`);
    run(10);
    const codes = machine.plant.faults.value.map((f) => f.code);
    expect(codes).toContain('U31-F1');
    // No lube oil: the main drive motor drops out and the drive stops.
    expect(machine.plant.oilOk.value).toBe(false);
    expect(machine.mcc.circuits.get(UNITS.mainMotor)!.running.value).toBe(
      false,
    );
    expect(machine.plant.state.driveHz.value).toBe(0);
    expect(machine.plant.healthy.value).toBe(false);
    const fuse = machine.mcc.circuits
      .get(UNITS.lube)!
      .devices.find((d) => d.kind === 'fuse')!;
    // Its own part replaces it, worked inside the open bucket.
    [...fuse.uses.values()][0]();
    run(10);
    expect(machine.plant.oilOk.value).toBe(true);
    expect(machine.plant.faults.value.map((f) => f.code)).not.toContain(
      'U31-F1',
    );
    dispose();
  });

  it("carries each unit's run, indication and PLC signal on its own terminals", () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    const open = (id: string, n: number) => {
      const terminal = machine.mcc.circuits
        .get(id)!
        .devices.filter((d) => d.kind === 'terminal')[n - 1];
      [...terminal.uses.values()][0]();
    };
    const codes = () => machine.plant.faults.value.map((f) => f.code);
    // X2 is the cooling fan's run circuit: its contactor drops out.
    open(UNITS.cooling, 2);
    run(1);
    expect(machine.mcc.circuits.get(UNITS.cooling)!.running.value).toBe(false);
    expect(codes()).toContain('U32-X2');
    open(UNITS.cooling, 2);
    run(1);
    expect(machine.mcc.circuits.get(UNITS.cooling)!.running.value).toBe(true);
    // X4 is the hydrocoptic pump's signal from the PLC: its flow loses
    // regulation and the PLC reports the lost signal.
    machine.mcc.circuits.get(UNITS.hydro)!.breaker!.breaker!.operate();
    run(15);
    expect(machine.plant.flowOk.value).toBe(true);
    open(UNITS.hydro, 4);
    run(15);
    expect(machine.plant.flowOk.value).toBe(false);
    expect(codes()).toContain('U72-X4');
    // A spare terminal carries nothing.
    open(UNITS.hydro, 6);
    run(1);
    expect(codes().filter((c) => c.startsWith('U72'))).toEqual(['U72-X4']);
    // X2 and K1 enable a control unit: without it, no dimension at all.
    run(20);
    expect(machine.plant.achieved.value).toBeGreaterThan(0);
    open(UNITS.control, 2);
    run(1);
    expect(machine.plant.achieved.value).toBe(0);
    dispose();
  });

  it('carries the PLC outputs to the field through the remote I/O adapter', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    machine.plant.control.feedHoa.set(2);
    run(2);
    expect(machine.plant.feedDemand.value).toBe(true);
    const adapter = machine.mcc.circuits
      .get(UNITS.automation)!
      .devices.filter((d) => d.kind === 'rack-unit')[1];
    adapter.test();
    run(1);
    expect(machine.plant.feedDemand.value).toBe(false);
    expect(machine.plant.faults.value.map((f) => f.code)).toEqual(
      expect.arrayContaining(['U51-RU2', 'E61']),
    );
    adapter.repair();
    run(1);
    expect(machine.plant.feedDemand.value).toBe(true);
    dispose();
  });

  it('loses only an output card’s functions when it is pulled', () => {
    const { machine, room, breaker, powerUp, run, dispose } = sandbox();
    powerUp();
    breaker(UNITS.automation).operate();
    run(0.2);
    pull(machine.assembly.slots![3].occupant.value!, room);
    breaker(UNITS.automation).operate();
    run(PLANT.plcBoot + 1);
    expect(machine.plant.plcStatus.value).toBe('run');
    expect(machine.plant.faults.value.map((f) => f.code)).toContain('E41');
    expect(machine.plant.feedDemand.value).toBe(false);
    dispose();
  });

  it('fails one eligible part after a few minutes of healthy operation', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    run(200, 0.5);
    // With an injected random source of 0: the first eligible part, the
    // MAIN INCOMING unit's control fuse.
    expect(machine.scheduler.incident).toBe(`fuse:${UNITS.incoming}`);
    expect(machine.plant.faults.value.map((f) => f.code)).toContain('U11-F1');
    dispose();
  });

  it('stops the feed motor on its emergency stop until it is reset through OFF', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    const feed = machine.mcc.circuits.get(UNITS.feed)!;
    machine.plant.control.feedHoa.set(0);
    run(6);
    expect(feed.running.value).toBe(true);
    const display = machine.mcc.group.getObjectByName(
      `${UNITS.feed} soft starter display`,
    )!;
    expect(display.userData.shown.upToSpeed).toBe(true);
    const stop = within(machine, 'FEED MOTOR', 'EMERGENCY STOP');
    machine.mcc.parts.uses.get(stop)!();
    run(1);
    expect(feed.running.value).toBe(false);
    expect(display.userData.shown.run).toBe(false);
    // Pulled out, it stays stopped in HAND...
    machine.mcc.parts.uses.get(stop)!();
    run(1);
    expect(feed.running.value).toBe(false);
    // ...until HAND OFF AUTO goes through OFF.
    machine.plant.control.feedHoa.set(1);
    run(0.5);
    machine.plant.control.feedHoa.set(0);
    run(1);
    expect(feed.running.value).toBe(true);
    expect(display.userData.shown.run).toBe(true);
    dispose();
  });

  it('shows the auxiliary motor on its own soft starter display', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    const aux = machine.mcc.circuits.get(UNITS.auxMotor)!;
    const display = machine.mcc.group.getObjectByName(
      `${UNITS.auxMotor} soft starter display`,
    )!;
    expect(aux.running.value).toBe(true);
    expect(display.userData.shown.upToSpeed).toBe(true);
    const stop = within(machine, 'AUXILIARY MOTOR', 'EMERGENCY STOP');
    machine.mcc.parts.uses.get(stop)!();
    run(0.5);
    expect(aux.running.value).toBe(false);
    expect(display.userData.shown.run).toBe(false);
    run(5);
    expect(display.userData.shown.speed).toBe(0);
    // Released, it needs START.
    machine.mcc.parts.uses.get(stop)!();
    run(0.5);
    expect(aux.running.value).toBe(false);
    machine.mcc.parts.uses.get(
      within(machine, 'AUXILIARY MOTOR', 'START push button'),
    )!();
    run(1);
    expect(aux.running.value).toBe(true);
    expect(display.userData.shown.run).toBe(true);
    dispose();
  });
});

describe('Level 0 status annunciator', () => {
  /** The colour a window shows, through a second of flashing. */
  const seen = (
    machine: ReturnType<typeof createLevel0Machine>,
    window: string,
    run: (s: number, dt?: number) => void,
  ) => {
    const lens = machine.mcc.group.getObjectByName(`Status ${window}`)!;
    const colours = new Set<string | null>();
    for (let i = 0; i < 10; i++) {
      run(0.1);
      colours.add(lens.userData.shown as string | null);
    }
    return colours;
  };
  const GREEN = '#4dff6e';
  /** Long enough for the slow scanner to come round twice. */
  const SCAN = SCAN_SECONDS_PER_WINDOW * WINDOWS.length * 2 + 0.5;
  const RED = '#ff3b2a';

  it('shows LUBE red with the pump off, flashing green as pressure builds, then green', () => {
    const { machine, breaker, run, dispose } = sandbox();
    isolate(machine);
    breaker(UNITS.distribution).operate();
    machine.plant.control.interlockKey.set(true);
    breaker(UNITS.main).operate();
    // Every window waits for its first scan, then shows its module.
    run(SCAN);
    expect(seen(machine, 'LUBE', run)).toEqual(new Set([RED]));
    breaker(UNITS.lube).operate();
    // Recovering, it flashes green before it goes steady.
    const flashes = new Set<string | null>();
    for (let t = 0; t < SCAN; t += 1)
      for (const c of seen(machine, 'LUBE', run)) flashes.add(c);
    expect(flashes).toContain(null);
    expect(flashes).toContain(GREEN);
    run(SCAN);
    expect(machine.plant.oilOk.value).toBe(true);
    expect(seen(machine, 'LUBE', run)).toEqual(new Set([GREEN]));
    dispose();
  });

  it('has a window for every module, red when that module is switched off', () => {
    const { machine, breaker, powerUp, run, dispose } = sandbox();
    expect(Object.keys(MODULE_OF).sort()).toEqual(
      Object.keys(UNIT_ROLES).sort(),
    );
    powerUp();
    machine.plant.control.fanMode.set(2);
    machine.plant.control.dingleEnable.set(1);
    // A stopped drive is off: start it, and lock the phase reference to it.
    machine.plant.driveStart();
    machine.plant.control.phaseTrim.set(PLANT.trimCentre + 2);
    breaker(UNITS.hydro).operate();
    run(20 + SCAN);
    const colour = (window: string) => seen(machine, window, run);
    // A running machine: every module green.
    for (const [, window] of Object.entries(MODULE_OF))
      expect(colour(window), window).toEqual(new Set([GREEN]));
    // Each module switched off at its own breaker shows red on its window.
    for (const [id, window] of Object.entries(MODULE_OF)) {
      if (id === UNITS.incoming || id === UNITS.main) continue;
      breaker(id).operate();
      run(SCAN / 2);
      expect(colour(window), window).toContain(
        id === UNITS.distribution ? null : RED,
      );
      if (id === UNITS.distribution)
        expect(machine.mcc.diagnosticEndpoint.value).toBe(false);
      breaker(id).operate();
    }
    dispose();
  });

  it("shows a component's failure on its own module's window", () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    run(SCAN);
    expect(seen(machine, 'COOLING', run)).toEqual(new Set([GREEN]));
    machine.inflict(`fuse:${UNITS.cooling}`);
    run(SCAN / 2);
    expect(seen(machine, 'COOLING', run)).toEqual(new Set([RED]));
    expect(
      machine.plant.faults.value.find((f) => f.code === 'U32-F1')!.window,
    ).toBe('COOLING');
    dispose();
  });

  it('shows a soft-started motor green only once it is up to speed, at about 24 A', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    powerUp();
    machine.plant.control.feedHoa.set(1);
    run(SCAN);
    expect(seen(machine, 'M-102', run)).toEqual(new Set([RED]));
    machine.plant.control.feedHoa.set(0);
    // Ramping: on but starting, until the motor is up to speed.
    const feedWindow = () =>
      machine.plant.windowStates.value.find((w) => w.window === 'M-102')!;
    let samples = 0;
    while (machine.plant.state.feedSpeed.value < 1) {
      run(0.1);
      if (machine.plant.state.feedSpeed.value >= 1) break;
      expect(feedWindow().on).toBe(true);
      expect(feedWindow().starting).toBe(true);
      samples++;
    }
    expect(samples).toBeGreaterThan(30);
    run(1);
    expect(feedWindow().starting).toBe(false);
    run(SCAN);
    expect(machine.plant.state.feedSpeed.value).toBe(1);
    expect(seen(machine, 'M-102', run)).toEqual(new Set([GREEN]));
    // Each soft-started motor draws 24 A up to speed.
    const before = machine.plant.loadAmps.value;
    machine.plant.control.feedHoa.set(1);
    run(5);
    // 24 A, and its contactor coil.
    expect(before - machine.plant.loadAmps.value).toBeCloseTo(24, 0);
    dispose();
  });

  it('is dark without power and flashes a critical failure red until ACK', () => {
    const { machine, powerUp, run, dispose } = sandbox();
    expect(seen(machine, 'PLC', run)).toEqual(new Set([null]));
    powerUp();
    run(SCAN);
    expect(seen(machine, 'PLC', run)).toEqual(new Set([GREEN]));
    machine.inflict('card:plc-power');
    run(SCAN / 2);
    expect(seen(machine, 'PLC', run)).toEqual(new Set([RED, null]));
    const ack = within(machine, 'DISTRIBUTION', 'ACK push button');
    machine.mcc.parts.uses.get(ack)!();
    run(SCAN / 2);
    expect(seen(machine, 'PLC', run)).toEqual(new Set([RED]));
    dispose();
  });
});

describe('Level 0 machine merging', () => {
  it('merges only meshes that nothing changes afterwards', () => {
    const { machine, room, breaker, powerUp, dispose } = sandbox();
    const { mcc } = machine;
    expect(mcc.merged.length).toBeGreaterThan(500);
    const watch = watchMerged(mcc.merged);
    const step = (seconds: number) => {
      for (let t = 0; t < seconds - 1e-9; t += 0.1) {
        machine.update(0.1);
        watch.check();
      }
    };
    powerUp();
    step(30);
    mcc.openAll(true);
    step(2);
    // Every input, both ways, and every protective device and card failed.
    for (const use of mcc.parts.uses.values()) {
      use(1);
      step(0.3);
      use(-1);
      step(0.3);
    }
    mcc.openAll(true);
    for (const kind of CARD_KINDS) machine.inflict(`card:${kind}`);
    for (const [, unit] of mcc.circuits)
      for (const device of unit.devices) device.test();
    step(10);
    // Every board out of its isolated cabinet and back in.
    for (const id of [UNITS.automation, UNITS.vfd])
      if (breaker(id).closed.value) breaker(id).operate();
    step(1);
    const boards = [
      ...machine.assembly.slots!.map((slot) => slot.occupant.value!),
      machine.capacitors,
    ];
    for (const board of boards) pull(board, room);
    step(2);
    for (const board of boards) machine.reseat(board);
    step(2);
    powerUp();
    for (const failure of FAILURES) {
      mcc.recover();
      powerUp();
      mcc.fail(failure.id);
      step(failure.seconds + 5);
    }
    mcc.recover();
    mcc.openAll(false);
    step(30);
    expect(
      watch.changed().map((mesh) => mesh.userData.mergedFrom as string),
    ).toEqual([]);
    dispose();
  }, 120_000);
});

/** The input on a unit's door inside the part named `part`. */
function within(
  machine: ReturnType<typeof createLevel0Machine>,
  unit: string,
  part: string,
) {
  return inputsOn(machine, unit).find((object) => {
    for (let o: Object3D | null = object; o; o = o.parent)
      if (o.name === part) return true;
    return false;
  })!;
}

/** Whether the power interlock key's locked lamp is lit. */
function interlockLampLit(machine: ReturnType<typeof createLevel0Machine>) {
  return machine.mcc.group.getObjectByName('Power interlock locked lamp')!
    .userData.lit as boolean;
}

it('announces readiness only after full operation, never at a settled partial startup', () => {
  const { machine, powerUp, run, dispose } = sandbox();
  const bbc = createBbcComputer(machine.diagnostics);
  bbc.power.flip();
  powerUp();
  run(40);
  expect(machine.plant.achieved.value).toBeLessThan(6);
  expect(machine.diagnostics.steady!.value).toBe(false);
  expect(machine.mcc.steady.value).toBe(false);
  expect(bbc.fanfare.value).toBe(0);
  const scenarios = createLevel0Scenarios(machine);
  scenarios.fullOn();
  run(60);
  expect(machine.plant.achieved.value).toBe(6);
  expect(machine.plant.steady.value).toBe(true);
  expect(machine.mcc.steady.value).toBe(true);
  expect(bbc.fanfare.value).toBe(1);
  run(10);
  expect(bbc.fanfare.value).toBe(1);
  bbc.dispose();
  dispose();
});

it('warns BEWARE once when a unit fails after the steady state, however many follow', () => {
  const { machine, run, dispose } = sandbox();
  const bbc = createBbcComputer(machine.diagnostics);
  bbc.power.flip();
  const both = (seconds: number) => {
    run(seconds);
    bbc.step(seconds);
  };
  createLevel0Scenarios(machine).fullOn();
  both(100);
  expect(bbc.fanfare.value).toBe(1);
  expect(bbc.beware.value).toBe(0);
  // A fuse blows: its unit fails, and others fall with it.
  machine.inflict(`fuse:${UNITS.lube}`);
  both(2);
  expect(machine.diagnostics.units!.value.LUBE).toBe('failed');
  expect(bbc.beware.value).toBe(1);
  // Another, straight after: within 30 s, it stays quiet.
  machine.inflict(`fuse:${UNITS.cooling}`);
  both(2);
  expect(machine.diagnostics.units!.value.COOLING).toBe('failed');
  expect(bbc.beware.value).toBe(1);
  // Failures that only stand do not sound it again.
  both(40);
  expect(bbc.beware.value).toBe(1);
  bbc.dispose();
  dispose();
});

it('lets a front click reach every VFD keypad key and its speed knob', () => {
  const { machine, dispose } = sandbox();
  machine.mcc.group.updateMatrixWorld(true);
  const targets = inputsOn(machine, 'MAIN ENCABULATOR');
  expect(targets.length).toBeGreaterThan(8);
  for (const target of targets) {
    const centre = new Box3().setFromObject(target).getCenter(new Vector3());
    const ray = new Raycaster(
      centre.clone().add(new Vector3(-0.7, 0.6, 1)),
      new Vector3(0.7, -0.6, -1).normalize(),
    );
    ray.camera = new PerspectiveCamera();
    const hit = ray.intersectObject(machine.mcc.group, true)[0];
    let reached: Object3D | null = hit?.object ?? null;
    while (reached && reached !== target) reached = reached.parent;
    expect(
      reached,
      `target ${target.name}; hit ${hit?.object.name}; parent ${hit?.object.parent?.name}`,
    ).toBe(target);
  }
  dispose();
});

it('works the VFD speed ring and keypad edges through actual front hits', () => {
  const { machine, powerUp, dispose } = sandbox();
  const failures = createLevel0Failures(createPanelKit(), machine);
  powerUp();
  machine.plant.control.driveSpeed.set(0);
  machine.plant.control.driveLocal.set(true);
  machine.mcc.group.updateMatrixWorld(true);
  const targets = inputsOn(machine, 'MAIN ENCABULATOR');
  const knob = targets.find(
    (target) => target.parent?.name === 'potentiometer',
  )!;
  const key = targets.find(
    (target) => target.name === 'Key I' || target.getObjectByName('Key I'),
  )!;
  const click = (point: Vector3, direction = 1) => {
    const ray = new Raycaster(
      point.clone().add(new Vector3(0, 0, 1)),
      new Vector3(0, 0, -1),
    );
    const camera = new PerspectiveCamera(55, 1, 0.01, 100);
    camera.position.copy(point).add(new Vector3(0, 0.2, 1));
    camera.lookAt(point);
    camera.updateMatrixWorld(true);
    ray.setFromCamera(new Vector2(), camera);
    const hit = ray.intersectObject(machine.mcc.group, true)[0];
    let object: Object3D | null = hit?.object ?? null;
    while (object && !machine.mcc.parts.uses.has(object))
      object = object.parent;
    expect(object, `No use for hit ${hit?.object.name}`).not.toBeNull();
    machine.mcc.parts.uses.get(object!)!(direction);
  };
  // The visible outer ring, beyond the turning cap itself.
  click(knob.localToWorld(new Vector3(0.019, 0, 0)));
  expect(machine.plant.control.driveSpeed.value).toBe(1);
  // The black edge of START's key, immediately beside the green cap.
  click(key.localToWorld(new Vector3(0.0075, 0, 0)));
  expect(machine.plant.state.driveRun.value).toBe(true);
  failures.dispose();
  dispose();
});
