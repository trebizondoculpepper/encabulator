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
  hmi: true,
  outputLink: true,
  inputLink: true,
  feedLink: true,
  hydraulicLink: true,
  driveLink: true,
  hydroLink: true,
  dingleLink: true,
  phaseLink: true,
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
    expect(p.alarms.value[WINDOWS.indexOf('SAFETY')]).toBe(true);
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
    expect(lit()).toEqual(['LUBE']);
    p.sense({ lube: true, liveDoorOpen: true });
    p.report([{ code: 'U31-F1', text: 'CONTROL FUSE BLOWN', window: 'LUBE' }]);
    run(p, 5);
    expect(lit()).toEqual(['LUBE', 'SAFETY']);
    // An open door is shown but is not a fault.
    p.report([]);
    p.step(0.1);
    expect(p.healthy.value).toBe(true);
  });

  it('loses a PLC-linked function, with its own diagnostic, when its signal wiring is open', () => {
    const p = plant({ ...RUNNING, hydro: true });
    p.control.feedHoa.set(2);
    run(p, PLANT.plcBoot + 1);
    expect(p.feedDemand.value).toBe(true);
    p.sense({ feedLink: false, hydroLink: false });
    run(p, 10);
    expect(p.feedDemand.value).toBe(false);
    expect(p.state.flow.value).toBeLessThan(0.5);
    // The remote I/O adapter carries every output to the field.
    p.sense({ feedLink: true, hydroLink: true, outputLink: false });
    run(p, 1);
    expect(p.feedDemand.value).toBe(false);
    expect(codes(p)).toContain('E61');
    expect(p.alarms.value[WINDOWS.indexOf('FIELD')]).toBe(true);
    // Without its interface chassis the PanelView loses the PLC.
    p.sense({ hmi: false });
    p.step(0.1);
    expect(codes(p)).toContain('E02');
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

  describe('supply voltage', () => {
    const spread = (v: readonly number[]) => Math.max(...v) - Math.min(...v);
    /** The lowest and highest each pair reads over a minute. */
    const watch = (p: ReturnType<typeof plant>) => {
      const low = [Infinity, Infinity, Infinity];
      const high = [-Infinity, -Infinity, -Infinity];
      for (let t = 0; t < 60; t += 0.25) {
        p.step(0.25);
        p.supplyVolts.value.forEach((v, k) => {
          low[k] = Math.min(low[k], v);
          high[k] = Math.max(high[k], v);
        });
      }
      return { low, high };
    };

    it('reads nothing without the incoming supply', () => {
      const p = plant({});
      p.step(1);
      expect(p.supplyVolts.value).toEqual([0, 0, 0]);
    });

    it('reads the same steady nominal voltage on every pair with the main disconnect open', () => {
      const p = plant({ incoming: true });
      const { low, high } = watch(p);
      expect(low).toEqual([480, 480, 480]);
      expect(high).toEqual([480, 480, 480]);
    });

    it('sags and gently fluctuates under load, more under more load, and recovers without it', () => {
      const light = plant({
        ...RUNNING,
        lube: false,
        cooling: false,
        vent: false,
      });
      const heavy = plant({
        ...RUNNING,
        mainMotor: true,
        feed: true,
        auxMotor: true,
        hydraulic: true,
        hydro: true,
        fan: true,
      });
      // Each with the control circuits of its energised units.
      light.senseControlAmps(4);
      heavy.senseControlAmps(4);
      heavy.control.driveSpeed.set(10);
      heavy.driveStart();
      run(heavy, 10);
      const l = watch(light);
      const h = watch(heavy);
      for (let k = 0; k < 3; k++) {
        expect(l.high[k]).toBeLessThan(480);
        expect(h.high[k]).toBeLessThan(l.low[k]);
        // Bounded and readable: within a few volts of its sag.
        expect(h.high[k] - h.low[k]).toBeGreaterThan(l.high[k] - l.low[k]);
        expect(h.high[k] - h.low[k]).toBeLessThan(6);
        expect(h.low[k]).toBeGreaterThan(460);
      }
      // A step of a quarter second moves it smoothly, not in jumps.
      let previous = heavy.supplyVolts.value;
      for (let i = 0; i < 40; i++) {
        heavy.step(0.25);
        heavy.supplyVolts.value.forEach((v, k) =>
          expect(Math.abs(v - previous[k])).toBeLessThan(1),
        );
        previous = heavy.supplyVolts.value;
      }
      // The control transformer across L1-L2 loads that pair more: lower
      // in the middle of its fluctuation.
      const middle = (k: number) => (h.low[k] + h.high[k]) / 2;
      expect(middle(0)).toBeLessThan(middle(1));
      expect(heavy.lineAmps.value[0]).toBeGreaterThan(heavy.lineAmps.value[2]);
      heavy.sense({ mains: false });
      heavy.step(0.25);
      expect(heavy.supplyVolts.value).toEqual([480, 480, 480]);
      expect(spread(heavy.supplyVolts.value)).toBe(0);
    });

    it('moves the control supply between phases without changing the main disconnect monitor', () => {
      const p = plant({ ...RUNNING, mainMotor: true, feed: true });
      p.senseControlAmps(4);
      run(p, 5);
      const monitor = p.monitor.value;
      const sums: number[][] = [];
      for (const phase of [0, 1, 2]) {
        p.control.controlPhase.set(phase);
        expect(p.monitor.value).toEqual(monitor);
        const lines = p.lineAmps.value;
        // The control load is on the selected phase and the next.
        const pair = [phase, (phase + 1) % 3];
        const other = [0, 1, 2].find((k) => !pair.includes(k))!;
        expect(lines[pair[0]]).toBe(lines[pair[1]]);
        expect(lines[pair[0]] - lines[other]).toBeCloseTo(4, 9);
        sums.push(lines);
      }
      // The same current, drawn from another pair.
      const total = (l: number[]) => l[0] + l[1] + l[2];
      expect(total(sums[1])).toBeCloseTo(total(sums[0]), 9);
      expect(total(sums[2])).toBeCloseTo(total(sums[0]), 9);
    });

    it('sags the voltmeter of the pair feeding the control supply', () => {
      const p = plant({ ...RUNNING });
      p.senseControlAmps(4);
      const middle = (phase: number) => {
        p.control.controlPhase.set(phase);
        let sum = [0, 0, 0];
        for (let i = 0; i < 400; i++) {
          p.step(0.25);
          sum = sum.map((v, k) => v + p.supplyVolts.value[k]);
        }
        return sum.map((v) => v / 400);
      };
      for (const phase of [0, 1, 2]) {
        const volts = middle(phase);
        expect(Math.min(...volts)).toBe(volts[phase]);
      }
    });
  });

  describe('main disconnect monitor', () => {
    it('reads no current with the disconnect open, and power as volts times amps', () => {
      const p = plant({ incoming: true });
      p.step(0.25);
      expect(p.monitor.value.amps).toBe(0);
      expect(p.monitor.value.kilowatts).toBe(0);
      p.sense({ ...RUNNING, mainMotor: true });
      p.senseControlAmps(3);
      run(p, 3, 0.25);
      const { volts, amps, kilowatts } = p.monitor.value;
      expect(amps).toBeGreaterThan(20);
      expect(kilowatts).toBeCloseTo((volts * amps) / 1000, 9);
    });

    it('climbs as each unit is switched on', () => {
      const p = plant({ incoming: true, mains: true });
      const readings: number[] = [];
      const read = () => {
        p.step(0.25);
        readings.push(p.monitor.value.amps);
      };
      p.senseControlAmps(0.2);
      read();
      p.senseControlAmps(1.4);
      read();
      p.sense({ lube: true });
      read();
      p.sense({ mainMotor: true });
      read();
      for (let i = 1; i < readings.length; i++)
        expect(readings[i]).toBeGreaterThan(readings[i - 1]);
    });
  });

  describe('lube starvation', () => {
    // The oil up first, then the motors started, as the permits require.
    const running = () => {
      const p = plant(RUNNING);
      run(p, 10, 0.5);
      p.sense({ mainMotor: true });
      p.control.driveSpeed.set(10);
      p.driveStart();
      run(p, 10, 0.5);
      return p;
    };

    it('leaks the oil away while the stuck switch keeps reporting healthy pressure', () => {
      const p = running();
      expect(p.state.oil.value).toBeCloseTo(PLANT.oilPressure, 0);
      p.lubeStarvation();
      // Drained, and the last of the pressure bled away.
      run(p, PLANT.leakSeconds + 15, 0.5);
      expect(p.state.oilLevel.value).toBeCloseTo(0, 6);
      expect(p.spilled.value).toBeCloseTo(1, 6);
      expect(p.state.oil.value).toBeLessThan(1);
      // The switch says all is well: the motors run on.
      expect(p.oilOk.value).toBe(true);
      expect(p.state.driveHz.value).toBeGreaterThan(50);
    });

    it('wears the bearings, grinding, hot, then seized: the breakdown', () => {
      const p = running();
      p.lubeStarvation();
      const codes = () => p.faults.value.map((f) => f.code);
      let worn = false;
      let hot = false;
      for (let t = 0; t < 400 && !p.brokenDown.value; t += 0.5) {
        p.step(0.5);
        worn ||= codes().includes('A10');
        hot ||= codes().includes('A11');
        expect(p.strain.value).toBeLessThanOrEqual(1);
      }
      expect(worn && hot).toBe(true);
      expect(p.brokenDown.value).toBe(true);
      expect(p.state.seized.value).toBe('M-101');
      expect(codes()).toContain('S01');
      expect(p.strain.value).toBe(1);
      // A worn bearing draws more current.
      expect(p.loadAmps.value).toBeGreaterThan(PLANT.wornAmps);
    });

    it('wears nothing while the oil is up', () => {
      const p = running();
      run(p, 300, 1);
      expect(p.strain.value).toBe(0);
    });

    it('is put right by RESET: refilled, freed and the bearings replaced', () => {
      const p = running();
      p.lubeStarvation();
      run(p, 300, 1);
      expect(p.brokenDown.value).toBe(true);
      p.clearFaults();
      expect(p.state.oilLevel.value).toBe(1);
      expect(p.state.oilSwitchStuck.value).toBe(false);
      expect(p.strain.value).toBe(0);
      expect(p.brokenDown.value).toBe(false);
    });
  });
});
