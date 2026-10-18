import { Group } from 'three';
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
import { createLevel0Machine } from './level0-machine';

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
  const powerUp = () => {
    isolate(machine);
    breaker(UNITS.main).operate();
    breaker(UNITS.lube).operate();
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
  let leaf: Object3D | undefined;
  machine.mcc.group.traverse((o) => {
    if (
      o.name.startsWith('Section ') &&
      o.name.includes(label) &&
      (o.name.endsWith(' door') || o.name.endsWith(' cover'))
    )
      leaf = o;
  });
  const hinge = leaf!.parent!;
  const found: Object3D[] = [];
  for (const object of machine.mcc.parts.uses.keys()) {
    let o: Object3D | null = object;
    let excluded = false;
    while (o && o !== hinge) {
      if (/ latch$| back$/.test(o.name)) excluded = true;
      o = o.parent;
    }
    if (o === hinge && !excluded) found.push(object);
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
});
