import type { Object3D } from 'three';
import { PLANT } from '../game/level0-plant';
import { UNITS } from '../scene/level0-faces';
import type { createLevel0Machine } from './level0-machine';

type Level0Machine = ReturnType<typeof createLevel0Machine>;

/** Starters with their own START button. */
const STARTED = [UNITS.mainMotor, UNITS.cooling, UNITS.auxMotor];
/** Seconds between the steps of a slow start. */
export const SLOW_START_STEP_SECONDS = 2.5;

/**
 * The testing scenarios the Hyperplasc Scenario Simulator sets Level 0's
 * machine to. Each works the
 * machine's own switches, selectors and actions, as a player would, so
 * every boot, ramp, interlock and status light follows on as usual.
 *
 * - FULL OFF: everything off, as a fresh room starts.
 * - FULL ON: everything on and running at once.
 * - RESET: every fault cleared, switch positions kept.
 * - SLOW START: FULL ON a step at a time, a unit every few seconds.
 * - HICCUP, GLITCH, KAPUT: failures (to be modelled in the plant next).
 * - FAULTS: causes, whose symptoms follow: OIL SEAL, PRESSURE SWITCH.
 */
export function createLevel0Scenarios(
  machine: Level0Machine,
  random: () => number = Math.random,
) {
  const { mcc, plant } = machine;
  const { control } = plant;
  const circuit = (id: string) => mcc.circuits.get(id)!;
  const breaker = (id: string) => circuit(id).breaker?.breaker;
  /** Work the incoming isolator's own handle until it is where we want. */
  const isolator = (on: boolean) => {
    if (mcc.supply.value === on) return;
    const handle = mcc.group.getObjectByName('INCOMING ISOLATOR handle');
    for (const [object, use] of mcc.parts.uses) {
      let o: Object3D | null = object;
      while (o && o !== handle) o = o.parent;
      if (!o) continue;
      use();
      if (mcc.supply.value === on) return;
    }
  };
  const close = (id: string) => {
    const b = breaker(id);
    if (b && b.position.value !== 'on') {
      if (b.position.value === 'tripped') b.operate();
      b.operate();
    }
  };
  const open = (id: string) => {
    const b = breaker(id);
    if (b && b.position.value === 'on') b.operate();
  };
  /** The units in the line-up's order, MAIN INCOMING's sealed one excepted. */
  const units = [...mcc.circuits.keys()].filter(
    (id) => id !== UNITS.incoming && id !== UNITS.main,
  );
  const runSettings = () => {
    control.feedHoa.set(2);
    control.hydraulicKey.set(2);
    control.fanMode.set(2);
    control.dingleEnable.set(1);
    control.chartRun.set(1);
    control.driveSpeed.set(10);
    control.auxSpeed.set(5);
    // Locked to the drive at full speed: 20° of lag, four detents.
    control.phaseTrim.set(PLANT.trimCentre + 4);
  };
  /** Every step of starting the machine, in order. */
  const steps = (): (() => void)[] => [
    () => isolator(true),
    () => control.interlockKey.set(true),
    () => close(UNITS.main),
    ...units.map((id) => () => close(id)),
    ...STARTED.map((id) => () => circuit(id).start()),
    runSettings,
    () => plant.driveStart(),
  ];
  let queue: (() => void)[] = [];
  let wait = 0;

  const fullOff = () => {
    queue = [];
    plant.driveStop();
    for (const id of STARTED) circuit(id).stop();
    for (const id of units) open(id);
    open(UNITS.main);
    control.interlockKey.set(false);
    isolator(false);
    control.feedHoa.set(1);
    control.hydraulicKey.set(1);
    control.fanMode.set(1);
    control.fanBoost.set(false);
    control.dingleEnable.set(0);
    control.chartRun.set(0);
    control.driveSpeed.set(0);
    control.auxSpeed.set(0);
    control.phaseTrim.set(PLANT.trimCentre);
  };
  const fullOn = () => {
    queue = [];
    for (const step of steps()) step();
  };
  /** Clear every fault, leaving the switches where they are. */
  const reset = () => {
    for (const unit of mcc.circuits.values())
      for (const device of unit.devices) {
        if (device.kind === 'breaker') {
          // A tripped breaker goes back to where it was: on.
          if (device.breaker?.position.value === 'tripped') {
            device.breaker.operate();
            device.breaker.operate();
          }
        } else if (device.faulted.value) device.repair();
      }
    for (const slot of machine.assembly.slots!) {
      const card = slot.occupant.value;
      if (card?.service?.failed.value) card.repair();
    }
    mcc.recover();
    plant.clearFaults();
    plant.plcReset();
  };
  const slowStart = () => {
    queue = steps();
    wait = 0;
  };
  return {
    fullOff,
    fullOn,
    reset,
    slowStart,
    /**
     * FAULTS, each a cause whose symptoms follow: the lube pump's shaft
     * seal fails (a leak, a spill, falling pressure); the low-pressure
     * switch sticks (no protection). Both together starve the motors.
     */
    sealFailure: () => plant.sealFailure(),
    switchStuck: () => plant.switchStuck(),
    /** A brief stumble that recovers by itself. */
    hiccup: () => mcc.fail('hiccup'),
    /** A real component fault: a fuse blows or an overload trips. */
    glitch: () => {
      const eligible = machine.eligible();
      if (eligible.length)
        machine.inflict(eligible[Math.floor(random() * eligible.length)]);
    },
    /** The rack's power card fails, sparking and smoking, the PLC halts. */
    kaput: () => machine.inflict('card:plc-power'),
    /** Whether a slow start is still going. */
    get starting() {
      return queue.length > 0;
    },
    /** Advance a slow start. */
    update(delta: number) {
      if (!queue.length) return;
      wait -= delta;
      if (wait > 0) return;
      queue.shift()!();
      wait = SLOW_START_STEP_SECONDS;
    },
  };
}

export type Level0Scenarios = ReturnType<typeof createLevel0Scenarios>;
