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
import { createScenarioSimulator } from './scenario-simulator';
import {
  SLOW_START_STEP_SECONDS,
  createLevel0Scenarios,
} from './level0-scenarios';
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
vi.setConfig({ testTimeout: 30_000 });

function sandbox() {
  const kit = createPanelKit();
  const machine = createLevel0Machine(kit, { random: () => 0.99 });
  const cheats = createLevel0Scenarios(machine, () => 0);
  const panel = createScenarioSimulator(kit, cheats);
  const run = (seconds: number, dt = 0.1) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) {
      panel.update(dt);
      machine.update(dt);
    }
  };
  const dispose = () => {
    panel.dispose();
    machine.dispose();
    machine.mcc.parts.dispose();
    disposeKit(kit, machine.mcc.group);
  };
  return { machine, cheats, panel, run, dispose };
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
    expect(colours).toContain('3dff6a');
    expect(colours).toContain('ffb21e');
    dispose();
  });

  it('brings the machine fully on, and fully off again, with its buttons', () => {
    const { machine, panel, run, dispose } = sandbox();
    workDoor(panel);
    run(0.5);
    useOf(panel, 'FULL ON scenario switch')();
    // Everything boots and builds: six dimensions take about a minute.
    run(60);
    const { plant } = machine;
    expect(machine.mcc.supply.value).toBe(true);
    expect(plant.plcStatus.value).toBe('run');
    expect(plant.state.driveHz.value).toBeCloseTo(PLANT.driveMaxHz, 3);
    expect(plant.phaseLocked.value).toBe(true);
    expect(plant.achieved.value).toBe(6);
    useOf(panel, 'FULL OFF scenario switch')();
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
});
