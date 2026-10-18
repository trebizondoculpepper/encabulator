import { describe, expect, it } from 'vite-plus/test';
import { BUILD_SECONDS } from './dimensionality';
import { PLANT, WINDOWS, createLevel0Plant } from './level0-plant';
import type { Electrical } from './level0-plant';

const RUNNING: Partial<Electrical> = {
  incoming: true,
  mains: true,
  lube: true,
  cooling: true,
  vent: true,
  control: true,
  controlBooted: true,
  phase: true,
  panMonitor: true,
  dingle: true,
  grammeter: true,
  plcCabinet: true,
  backplane: true,
  field: true,
  vfdControl: true,
  vfdReady: true,
  driveIsolator: true,
};

function plant(electrical: Partial<Electrical> = RUNNING) {
  const p = createLevel0Plant();
  p.sense(electrical);
  return p;
}
const run = (p: ReturnType<typeof plant>, seconds: number, dt = 0.1) => {
  for (let t = 0; t < seconds - 1e-9; t += dt) p.step(dt);
};
const codes = (p: ReturnType<typeof plant>) =>
  p.faults.value.map((f) => f.code);

describe('Level 0 process model', () => {
  it('boots Automation Control when its cabinet is powered, and stops it without', () => {
    const p = plant();
    expect(p.plcStatus.value).toBe('booting');
    run(p, PLANT.plcBoot + 0.2);
    expect(p.plcStatus.value).toBe('run');
    p.sense({ plcCabinet: false });
    p.step(0.1);
    expect(p.plcStatus.value).toBe('off');
    p.sense({ plcCabinet: true });
    p.step(0.1);
    expect(p.plcStatus.value).toBe('booting');
  });

  it('restarts the PLC on every powered RESET, healthy or mid-boot, and ignores it unpowered', () => {
    const p = plant();
    run(p, PLANT.plcBoot + 0.2);
    expect(p.plcReset()).toBe(true);
    expect(p.plcStatus.value).toBe('booting');
    run(p, 2);
    expect(p.plcReset()).toBe(true);
    expect(p.state.plcElapsed.value).toBe(0);
    // Its program stops while it reboots: the feed's AUTO cycle drops out.
    expect(p.feedDemand.value).toBe(false);
    p.sense({ plcCabinet: false });
    p.step(0.1);
    expect(p.plcReset()).toBe(false);
  });

  it('diagnoses a missing processor again after RESET instead of running', () => {
    const p = plant();
    p.senseCard('plc-cpu', 'absent');
    run(p, PLANT.plcBoot + 0.2);
    expect(p.plcStatus.value).toBe('halted');
    expect(codes(p)).toContain('E20');
    p.plcReset();
    run(p, PLANT.plcBoot + 0.2);
    expect(p.plcStatus.value).toBe('halted');
    // A healthy card put in does not clear the halt by itself...
    p.senseCard('plc-cpu', 'ok');
    run(p, 1);
    expect(p.plcStatus.value).toBe('halted');
    // ...a RESET, or a power cycle, does.
    p.plcReset();
    run(p, PLANT.plcBoot + 0.2);
    expect(p.plcStatus.value).toBe('run');
    expect(codes(p)).not.toContain('E20');
  });

  it('halts the moment its rack power card fails, raising an earth fault', () => {
    const p = plant();
    run(p, PLANT.plcBoot + 0.2);
    p.senseCard('plc-power', 'failed');
    p.step(0.1);
    expect(p.plcStatus.value).toBe('halted');
    expect(codes(p)).toEqual(expect.arrayContaining(['E10', 'E11']));
    expect(p.alarms.value[WINDOWS.indexOf('GROUND FAULT')]).toBe(true);
  });

  it('loses only what a missing I/O card carries', () => {
    const p = plant({ ...RUNNING, hydro: true });
    p.control.feedHoa.set(2);
    run(p, PLANT.plcBoot + 1);
    expect(p.feedDemand.value).toBe(true);
    p.senseCard('plc-output', 'absent');
    run(p, 10);
    expect(p.plcStatus.value).toBe('run');
    expect(codes(p)).toContain('E41');
    // The feed's AUTO cycle and the hydrocoptic regulator are outputs.
    expect(p.feedDemand.value).toBe(false);
    expect(p.state.flow.value).toBeLessThan(0.5);
    // HAND still runs the feed without the PLC.
    p.control.feedHoa.set(0);
    expect(p.feedDemand.value).toBe(true);
    p.senseCard('plc-output', 'ok');
    p.senseCard('plc-analog', 'failed');
    p.step(0.1);
    expect(codes(p)).toContain('E51');
    expect(codes(p)).not.toContain('E41');
  });

  it('needs lube oil pressure before the drive will run, and ramps to its SPEED', () => {
    const p = plant({ ...RUNNING, lube: false });
    run(p, PLANT.plcBoot + 1);
    expect(p.driveStart()).toBe(true);
    run(p, 3);
    expect(p.state.driveHz.value).toBe(0);
    expect(p.driveBlock.value).toBe('NO LUBE PERMIT');
    p.sense({ lube: true });
    p.control.driveSpeed.set(5);
    run(p, 10);
    expect(p.state.driveHz.value).toBeCloseTo(30, 5);
    p.driveStop();
    run(p, 5);
    expect(p.state.driveHz.value).toBe(0);
  });

  it('trips the drive on heatsink temperature without its cooling fan, and resets only once cool', () => {
    const p = plant({ ...RUNNING, cooling: false });
    p.control.driveSpeed.set(10);
    p.driveStart();
    let tripped = 0;
    for (let t = 0; t < 200 && !tripped; t += 0.5) {
      p.step(0.5);
      if (p.state.vfdFault.value) tripped = t;
    }
    expect(p.state.vfdFault.value).toBe('F04');
    expect(tripped).toBeGreaterThan(30);
    expect(tripped).toBeLessThan(120);
    p.driveStop();
    expect(p.state.vfdFault.value).toBe('F04');
    p.sense({ cooling: true });
    run(p, 120, 0.5);
    p.driveStop();
    expect(p.state.vfdFault.value).toBeNull();
  });

  it('takes the drive out of service when its power stage fails, until STOP resets it', () => {
    const p = plant();
    p.driveStart();
    run(p, 3);
    p.sense({ vfdReady: false });
    p.step(0.1);
    expect(p.state.vfdFault.value).toBe('F07');
    p.sense({ vfdReady: true });
    run(p, 12);
    expect(p.state.driveHz.value).toBe(0);
    p.driveStop();
    expect(p.state.vfdFault.value).toBeNull();
  });

  it('locks the phase reference only with the trim that matches the drive speed', () => {
    const p = plant();
    run(p, PLANT.plcBoot + 1);
    p.control.driveSpeed.set(10);
    p.driveStart();
    run(p, 8);
    expect(p.phaseLocked.value).toBe(false);
    expect(codes(p)).toContain('A05');
    // 20° of lag at full speed: four 5° detents of PHASE TRIM.
    p.control.phaseTrim.set(PLANT.trimCentre + 4);
    expect(p.phaseError.value).toBeCloseTo(0, 5);
    expect(p.phaseLocked.value).toBe(true);
    p.control.driveReverse.set(true);
    expect(p.phaseLocked.value).toBe(false);
  });

  it('builds dimensionality stage by stage and settles where a condition is missing', () => {
    const p = plant({ ...RUNNING, controlBooted: false });
    run(p, 10);
    expect(p.achieved.value).toBe(0);
    p.sense({ controlBooted: true });
    run(p, BUILD_SECONDS * 3);
    // Without the drive at speed it stops at two: the line and the square.
    expect(p.achieved.value).toBe(2);
    p.control.driveSpeed.set(10);
    p.control.phaseTrim.set(PLANT.trimCentre + 4);
    p.driveStart();
    run(p, BUILD_SECONDS * 3);
    expect(p.achieved.value).toBe(4);
    p.sense({ hydro: true, fan: true, hydraulic: true });
    p.control.fanMode.set(2);
    p.control.dingleEnable.set(1);
    run(p, BUILD_SECONDS * 4);
    expect(p.achieved.value).toBe(6);
    // Unlock the phase: it collapses to three.
    p.control.phaseTrim.set(PLANT.trimCentre);
    run(p, 3);
    expect(p.achieved.value).toBe(3);
    // Without the control unit's supply it is gone at once.
    p.sense({ control: false });
    p.step(0.1);
    expect(p.achieved.value).toBe(0);
  });

  it('drives the panendermic fan into the red on BOOST and to nothing OFF', () => {
    const p = plant({ ...RUNNING, fan: true });
    p.control.fanMode.set(0);
    run(p, 15);
    expect(p.state.fan.value).toBeCloseTo(PLANT.fanLow, 1);
    p.control.fanBoost.set(true);
    run(p, 15);
    expect(p.state.fan.value).toBeGreaterThan(9);
    p.control.fanMode.set(1);
    run(p, 30);
    expect(p.state.fan.value).toBeLessThan(0.1);
  });

  it('raises each annunciator window from its own cause', () => {
    const p = plant({ ...RUNNING, lube: false });
    p.step(0.1);
    const lit = () => WINDOWS.filter((_, i) => p.alarms.value[i]);
    expect(lit()).toEqual(['LUBE LOW']);
    p.sense({ lube: true, tripped: true, liveDoorOpen: true });
    run(p, 5);
    expect(lit()).toEqual(['BREAKER TRIP', 'DOOR OPEN']);
    // An open door is shown but is not a fault.
    p.sense({ tripped: false });
    p.step(0.1);
    expect(p.healthy.value).toBe(true);
  });

  it('drifts the grammeter out of calibration, and ZERO and CALIBRATE correct it', () => {
    const p = plant();
    run(p, 400, 1);
    expect(codes(p)).toContain('A07');
    expect(p.gramZero()).toBe(true);
    expect(p.gramCalibrate()).toBe(true);
    run(p, PLANT.calibrateSeconds + 0.5);
    expect(codes(p)).not.toContain('A07');
  });

  it('logs faults, PLC states and dimensions as they change', () => {
    const p = plant();
    run(p, PLANT.plcBoot + 0.5);
    expect(p.state.events.value.some((line) => line.endsWith('PLC RUN'))).toBe(
      true,
    );
    expect(
      p.state.events.value.some((line) => line.includes('DIMENSION 1 BUILT')),
    ).toBe(true);
  });

  it('has no control that reaches nothing in the graph', () => {
    const analysis = createLevel0Plant().graph.analyse();
    expect(analysis.unseenControls).toEqual([]);
    expect(analysis.constantOutputs).toEqual([]);
    expect(analysis.unwrittenStates).toEqual([]);
    expect(analysis.invisible).toEqual([]);
  });
});
