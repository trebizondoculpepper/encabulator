import { Raycaster } from 'three';
import type { Color, Material, Mesh, Object3D } from 'three';
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
import {
  createScenarioSimulator,
  simulatorFootprint,
} from './scenario-simulator';
import { LEVEL0_MACHINE, LEVEL0_SCENARIOS } from '../game/level0-room-plan';
import { MCC_WIDTH } from '../scene/retro-encabulator-mcc';
import { createWarehouseTrainingRoom } from '../scene/warehouse-training-room';
import { createWarehouseFire } from '../toolkit/components/architectural/logic/warehouse-services';
import { ARCHITECTURAL_FITTINGS } from '../toolkit/components/architectural/logic/architectural-fittings';
import {
  SLOW_START_STEP_SECONDS,
  createLevel0Scenarios,
} from './level0-scenarios';
import { createLevel0Machine } from './level0-machine';
import { createLevel0Failures } from './level0-failures';
import { LEAK_SECONDS, createLevel0Symptoms } from './level0-symptoms';
import { NORMAL, strangeness } from '../game/level0-strangeness';

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
vi.setConfig({ testTimeout: 30_000 });

function sandbox() {
  const kit = createPanelKit();
  const machine = createLevel0Machine(kit, { random: () => 0.99 });
  const symptoms = createLevel0Symptoms(machine);
  const cheats = createLevel0Scenarios(machine, () => 0, symptoms);
  const panel = createScenarioSimulator(kit, cheats);
  const run = (seconds: number, dt = 0.1) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) {
      panel.update(dt);
      machine.update(dt);
      symptoms.update(dt);
    }
  };
  const dispose = () => {
    panel.dispose();
    machine.dispose();
    machine.mcc.parts.dispose();
    disposeKit(kit, machine.mcc.group);
  };
  return { machine, cheats, panel, symptoms, run, dispose };
}

/**
 * A use on the door's pull, found as the room finds it: walking up from
 * what was hit to the first thing with a use.
 */
function workDoor(panel: ReturnType<typeof createScenarioSimulator>) {
  let o: Object3D = panel.group.getObjectByName(
    'Scenario simulator door pull',
  )!;
  while (!panel.parts.uses.has(o)) o = o.parent!;
  panel.parts.uses.get(o)!();
}

/** The use of whatever is inside the part named `name` on the simulator. */
function useOf(
  panel: ReturnType<typeof createScenarioSimulator>,
  name: string,
) {
  for (const [object, use] of panel.parts.uses)
    for (let o: Object3D | null = object; o; o = o.parent)
      if (o.name === name) return use;
  throw new Error(`No ${name}`);
}

describe('the Hyperplasc Scenario Simulator', () => {
  it('opens by its handle, and its controls work only with the door open', () => {
    const { panel, run, dispose } = sandbox();
    const controls = panel.group.getObjectByName('Testing scenario controls')!;
    // Returning false is how a hidden part stops the raycaster.
    const takesClicks = () =>
      (controls.raycast as (...args: unknown[]) => unknown)(
        new Raycaster(),
        [],
      ) !== false;
    const handle = () => workDoor(panel);
    expect(panel.group.getObjectByName('Cabinet door lock')!.visible).toBe(
      false,
    );
    expect(takesClicks()).toBe(false);
    handle();
    run(0.1);
    expect(panel.open).toBe(true);
    expect(takesClicks()).toBe(true);
    // Shut again, its controls take no clicks once it has swung to.
    handle();
    run(3);
    expect(panel.open).toBe(false);
    expect(takesClicks()).toBe(false);
    dispose();
  });

  it("twinkles its units' status LEDs green and amber", () => {
    const { panel, run, dispose } = sandbox();
    const leds: Mesh[] = [];
    panel.group.traverse((o) => {
      if (o.name === 'Simulator status LED') leds.push(o as Mesh);
    });
    expect(leds.length).toBeGreaterThan(40);
    const colours = new Set<string>();
    let changes = 0;
    let before = leds.map((led) => led.material);
    for (let i = 0; i < 30; i++) {
      run(0.1);
      leds.forEach((led, k) => {
        if (led.material !== before[k]) changes++;
        const material = led.material as Material & { color?: Color };
        if (material.color) colours.add(material.color.getHexString());
      });
      before = leds.map((led) => led.material);
    }
    expect(changes).toBeGreaterThan(100);
    // The drives' own activity lights flicker too.
    const drives: Mesh[] = [];
    panel.group.traverse((o) => {
      if (o.name === 'Drive activity light') drives.push(o as Mesh);
    });
    expect(drives).toHaveLength(4);
    const seen = drives.map(() => new Set<unknown>());
    for (let i = 0; i < 20; i++) {
      run(0.1);
      drives.forEach((drive, k) => seen[k].add(drive.material));
    }
    for (const materials of seen) expect(materials.size).toBeGreaterThan(1);
    expect(colours).toContain('3dff6a');
    expect(colours).toContain('ffb21e');
    dispose();
  });

  it('brings the machine fully on, and fully off again, with its buttons', () => {
    const { machine, panel, run, dispose } = sandbox();
    workDoor(panel);
    run(0.5);
    useOf(panel, 'FULL ON states switch')();
    // Everything boots and builds: six dimensions take about a minute.
    run(60);
    const { plant } = machine;
    expect(machine.mcc.supply.value).toBe(true);
    expect(plant.plcStatus.value).toBe('run');
    expect(plant.state.driveHz.value).toBeCloseTo(PLANT.driveMaxHz, 3);
    expect(plant.phaseLocked.value).toBe(true);
    expect(plant.achieved.value).toBe(6);
    useOf(panel, 'FULL OFF states switch')();
    run(10);
    expect(machine.mcc.supply.value).toBe(false);
    expect(plant.electrical.mains.value).toBe(false);
    expect(plant.control.interlockKey.value).toBe(false);
    for (const [id, unit] of machine.mcc.circuits)
      if (id !== UNITS.incoming)
        expect(unit.breaker?.breaker?.position.value ?? 'off', id).toBe('off');
    dispose();
  });

  it('starts the machine a step at a time on SLOW START', () => {
    const { machine, cheats, run, dispose } = sandbox();
    cheats.slowStart();
    run(0.2);
    expect(machine.mcc.supply.value).toBe(true);
    expect(machine.plant.electrical.mains.value).toBe(false);
    run(SLOW_START_STEP_SECONDS * 2);
    expect(machine.plant.electrical.mains.value).toBe(true);
    expect(cheats.starting).toBe(true);
    run(SLOW_START_STEP_SECONDS * 40);
    expect(cheats.starting).toBe(false);
    expect(machine.plant.plcStatus.value).toBe('run');
    dispose();
  });

  it('clears every fault on RESET, keeping the switches where they are', () => {
    const { machine, cheats, run, dispose } = sandbox();
    cheats.fullOn();
    run(20);
    cheats.glitch();
    machine.inflict('card:plc-power');
    run(3);
    expect(machine.plant.healthy.value).toBe(false);
    cheats.reset();
    run(15);
    expect(machine.plant.faults.value.filter((f) => !f.advisory)).toEqual([]);
    expect(machine.plant.plcStatus.value).toBe('run');
    expect(machine.mcc.supply.value).toBe(true);
    dispose();
  });

  it('fails something real on GLITCH and KAPUT', () => {
    const { machine, cheats, run, dispose } = sandbox();
    cheats.fullOn();
    run(20);
    cheats.glitch();
    run(1);
    expect(machine.plant.healthy.value).toBe(false);
    cheats.reset();
    run(15);
    cheats.kaput();
    run(1);
    expect(machine.plant.plcStatus.value).toBe('halted');
    expect(machine.hazard().arcing).toBe(true);
    dispose();
  });

  it('starves the machine of lube from its FAULTS row, to a seizure and normality', () => {
    const { machine, panel, dispose } = sandbox();
    const failures = createLevel0Failures(createPanelKit(), machine);
    const step = (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        panel.update(0.5);
        machine.update(0.5);
        failures.update(0.5);
      }
    };
    useOf(panel, 'FULL ON states switch')();
    step(40);
    // Started all at once, the motor took a trace of wear as the oil came up.
    expect(machine.plant.strain.value).toBeLessThan(0.01);
    useOf(panel, 'OIL SEAL faults switch')();
    useOf(panel, 'PRESSURE SWITCH faults switch')();
    step(30);
    // Oil on the floor, spreading.
    expect(failures.spill.visible).toBe(true);
    const early = failures.spill.scale.x;
    let strange = 0;
    for (let t = 0; t < 400 && !machine.plant.brokenDown.value; t += 5) {
      step(5);
      strange = Math.max(
        strange,
        strangeness(machine.plant.strain.value, false).patterns,
      );
    }
    expect(failures.spill.scale.x).toBeGreaterThan(early);
    expect(strange).toBeGreaterThan(0.04);
    // The breakdown: seized, its overload and the main breaker tripped.
    expect(machine.plant.brokenDown.value).toBe(true);
    expect(machine.mcc.mainBreaker.position.value).toBe('tripped');
    expect(
      machine.mcc.circuits
        .get('section2.bucket1')!
        .devices.find((d) => d.kind === 'overload')!.faulted.value,
    ).toBe(true);
    expect(
      strangeness(machine.plant.strain.value, machine.plant.brokenDown.value),
    ).toEqual(NORMAL);
    // RESET: refilled, mopped up, the motor's bearings replaced.
    useOf(panel, 'RESET states switch')();
    step(1);
    expect(machine.plant.brokenDown.value).toBe(false);
    expect(failures.spill.visible).toBe(false);
    failures.dispose();
    dispose();
  });

  it('groups its switches as STATES, FAULTS and SYMPTOMS', () => {
    const { panel, dispose } = sandbox();
    for (const name of [
      'FULL OFF states switch',
      'SLOW START states switch',
      'OIL SEAL faults switch',
      'KAPUT faults switch',
      'OIL LEAK symptoms switch',
      'SMOKING symptoms switch',
      'DIMENSIONAL WARP symptoms switch',
      'HICCUP symptoms switch',
    ])
      expect(useOf(panel, name)).toBeTypeOf('function');
    dispose();
  });

  it('shows symptoms without their causes, and RESET puts them away', () => {
    const { machine, panel, symptoms, run, dispose } = sandbox();
    useOf(panel, 'FULL ON states switch')();
    run(30, 0.5);
    useOf(panel, 'OIL LEAK symptoms switch')();
    useOf(panel, 'SMOKING symptoms switch')();
    useOf(panel, 'DIMENSIONAL WARP symptoms switch')();
    run(LEAK_SECONDS, 0.5);
    // The oil spreads and the fire burns, but nothing is wrong underneath.
    expect(symptoms.spill).toBeCloseTo(1, 6);
    expect(machine.plant.spilled.value).toBe(0);
    expect(machine.plant.oilOk.value).toBe(true);
    expect(symptoms.burning).toBe(false);
    // Its smoke has cleared, leaving soot on the faces above.
    expect(symptoms.soot).toBeGreaterThan(0.3);
    // The warp built and has gone again of itself.
    expect(symptoms.strain).toBe(0);
    useOf(panel, 'SMOKING symptoms switch')();
    useOf(panel, 'DIMENSIONAL WARP symptoms switch')();
    run(10, 0.5);
    expect(symptoms.burning).toBe(true);
    expect(symptoms.strain).toBeGreaterThan(0.5);
    useOf(panel, 'RESET states switch')();
    expect(symptoms.spill).toBe(0);
    expect(symptoms.burning).toBe(false);
    expect(symptoms.soot).toBe(0);
    expect(symptoms.strain).toBe(0);
    dispose();
  });

  it('sets the whole building off from a call point by the fire exit', () => {
    const { machine, run, dispose } = sandbox();
    const kit = createPanelKit();
    const fire = createWarehouseFire(machine.plant.fire);
    const room = createWarehouseTrainingRoom(kit, false, { fire });
    /** Work the first fitting of this kind, as a click on it would. */
    const work = (title: string, n = 0) => {
      const uses = [...room.parts.uses].filter(([o]) => {
        for (let p: Object3D | null = o; p; p = p.parent)
          if (p.name === title) return true;
        return false;
      });
      uses[n][1]();
    };
    const heads = () =>
      room.fittings.filter((o) => o.name.includes('sprinkler'));
    expect(heads().length).toBeGreaterThan(0);
    work(ARCHITECTURAL_FITTINGS.callpoint.title);
    run(1, 0.5);
    const f = machine.plant.fire;
    expect(f.stage.value).toBe('evacuate');
    expect(f.sounding.value).toBe(true);
    expect(f.panelLamps.value.zone1).toBe(true);
    // The panel, with its key, silences it; RESET waits for the call point.
    f.panelKey.set(true);
    f.silence();
    expect(f.sounding.value).toBe(false);
    expect(f.reset()).toBe(false);
    room.parts.dispose();
    disposeKit(kit, room.group);
    dispose();
  });

  it('leaves room to walk between the simulator and the line-up', () => {
    const rack = simulatorFootprint(
      LEVEL0_SCENARIOS.x,
      LEVEL0_SCENARIOS.z,
      LEVEL0_SCENARIOS.yaw,
    );
    // The line-up's right-hand end, with the room's 0.1 m allowance.
    const end = LEVEL0_MACHINE.x + MCC_WIDTH / 2 + 0.1;
    expect(rack.minX - end).toBeGreaterThan(0.8);
  });

  it('drowns a live machine from its SPRINKLER fault: shorts, shutdown, secondary faults', () => {
    const { machine, panel, symptoms, dispose } = sandbox();
    const failures = createLevel0Failures(createPanelKit(), machine);
    const step = (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        panel.update(0.5);
        machine.update(0.5);
        symptoms.update(0.5);
        failures.update(0.5);
      }
    };
    useOf(panel, 'FULL ON states switch')();
    step(40);
    const faulted = () =>
      [...machine.mcc.circuits.values()].flatMap((u) =>
        u.devices.filter((d) => d.kind !== 'breaker' && d.faulted.value),
      ).length;
    const before = faulted();
    useOf(panel, 'SPRINKLER faults switch')();
    step(1);
    expect(machine.plant.fire.stage.value).toBe('evacuate');
    step(10);
    expect(machine.plant.drowned.value).toBe(true);
    expect(failures.flood.visible).toBe(true);
    // Total shutdown, and it will not stay on while shorted.
    expect(machine.mcc.mainBreaker.position.value).toBe('tripped');
    expect(machine.plant.electrical.mains.value).toBe(false);
    expect(faulted()).toBeGreaterThan(before);
    // DISTRIBUTION, better shielded, holds out about 20 s, sputters, dies.
    const distribution = machine.mcc.circuits.get('section1.bucket3')!;
    expect(distribution.powered.value).toBe(true);
    expect(machine.plant.distributionFate.value).toBe('holding');
    step(12);
    expect(machine.plant.distributionFate.value).toBe('sputtering');
    step(3);
    expect(machine.plant.distributionFate.value).toBe('dead');
    expect(distribution.powered.value).toBe(false);
    // RESET: dried out, repaired, the heads replaced.
    useOf(panel, 'RESET states switch')();
    step(1);
    expect(machine.plant.drowned.value).toBe(false);
    expect(machine.plant.fire.discharging.value).toBe(false);
    expect(machine.plant.distributionFate.value).toBe('holding');
    expect(distribution.powered.value).toBe(true);
    failures.dispose();
    dispose();
  });

  it('only shows the rain from its SPRINKLER symptom', () => {
    const { machine, panel, symptoms, run, dispose } = sandbox();
    useOf(panel, 'FULL ON states switch')();
    run(30, 0.5);
    useOf(panel, 'SPRINKLER symptoms switch')();
    run(20, 0.5);
    expect(symptoms.raining.value).toBe(true);
    expect(machine.plant.fire.discharging.value).toBe(false);
    expect(machine.plant.drowned.value).toBe(false);
    useOf(panel, 'RESET states switch')();
    expect(symptoms.raining.value).toBe(false);
    dispose();
  });

  it('runs a fire from its FAULTS switch to the alarm, the sprinklers and a ruined machine', () => {
    const { machine, panel, symptoms, dispose } = sandbox();
    const failures = createLevel0Failures(createPanelKit(), machine);
    const step = (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        panel.update(0.5);
        machine.update(0.5);
        symptoms.update(0.5);
        failures.update(0.5);
      }
    };
    useOf(panel, 'FULL ON states switch')();
    step(40);
    useOf(panel, 'FIRE faults switch')();
    step(15);
    const f = machine.plant.fire;
    // The smoke has set the detectors off: the alarm is investigating.
    expect(f.detector.value).toBe(true);
    expect(f.stage.value).toBe('alert');
    expect(failures.soot).toBeGreaterThan(0);
    // Left alone, the heat bursts the heads over the machine...
    step(50);
    expect(f.discharging.value).toBe(true);
    expect(f.stage.value).toBe('evacuate');
    // ...the water shorts the live bus, and the machine is ruined.
    step(10);
    expect(machine.plant.ruined.value).toBe(true);
    expect(machine.mcc.mainBreaker.position.value).toBe('tripped');
    expect(machine.plant.electrical.mains.value).toBe(false);
    failures.clean();
    useOf(panel, 'RESET states switch')();
    step(1);
    expect(machine.plant.ruined.value).toBe(false);
    expect(failures.soot).toBe(0);
    failures.dispose();
    dispose();
  });
});
