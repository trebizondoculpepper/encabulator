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
import { createCheatConsole } from './cheat-console';
import { SLOW_START_STEP_SECONDS, createLevel0Cheats } from './level0-cheats';
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
  const cheats = createLevel0Cheats(machine, () => 0);
  const panel = createCheatConsole(kit, cheats);
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

/** The use of whatever is inside the part named `name` on the console. */
function useOf(panel: ReturnType<typeof createCheatConsole>, name: string) {
  for (const [object, use] of panel.parts.uses)
    for (let o: Object3D | null = object; o; o = o.parent)
      if (o.name === name) return use;
  throw new Error(`No ${name}`);
}

describe('the cheat console', () => {
  it('is locked with its key in it, and hides its buttons until opened', () => {
    const { panel, run, dispose } = sandbox();
    const inside = panel.group.getObjectByName('Cheat console buttons')!;
    expect(inside.visible).toBe(false);
    // Locked: the latch refuses.
    useOf(panel, 'Cheat console door latch')();
    run(1);
    expect(panel.open).toBe(false);
    expect(inside.visible).toBe(false);
    // Turn the key, then the latch opens it.
    useOf(panel, 'Cheat console lock')();
    useOf(panel, 'Cheat console door latch')();
    run(0.1);
    expect(panel.open).toBe(true);
    expect(inside.visible).toBe(true);
    // Shut again, its inside is hidden once the door has swung to.
    useOf(panel, 'Cheat console door latch')();
    run(0.05);
    expect(inside.visible).toBe(true);
    run(2);
    expect(inside.visible).toBe(false);
    dispose();
  });

  it('brings the machine fully on, and fully off again, with its buttons', () => {
    const { machine, panel, run, dispose } = sandbox();
    panel.unlock();
    useOf(panel, 'Cheat console door latch')();
    run(0.5);
    useOf(panel, 'FULL ON push button')();
    run(40);
    const { plant } = machine;
    expect(machine.mcc.supply.value).toBe(true);
    expect(plant.plcStatus.value).toBe('run');
    expect(plant.state.driveHz.value).toBeCloseTo(PLANT.driveMaxHz, 3);
    expect(plant.phaseLocked.value).toBe(true);
    expect(plant.achieved.value).toBe(6);
    useOf(panel, 'FULL OFF push button')();
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
