import { describe, it, expect } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { createLevel0Plant, ELECTRICAL_OFF } from './level0-plant';
import {
  diagnosticPage,
  level0Diagnostics,
  narrativeDiagnostics,
} from './bbc-machine-diagnostics';

const fixture = () => {
  const plant = createLevel0Plant();
  const online = signal(true);
  const supplies = Object.fromEntries(
    [
      'CONTROL',
      'PLC',
      'FIELD',
      'LUBE',
      'COOLING',
      'PHASE',
      'ISOLATOR',
      'VFD',
    ].map((id) => [id, signal(true)]),
  );
  const terminal = level0Diagnostics(plant, online, supplies);
  const text = () => terminal.lines.value.map(([s]) => s).join(' ');
  return { plant, supplies, terminal, text };
};

describe('read-only machine diagnostics', () => {
  it('suppresses downstream faults behind the key, bus and individual supply prerequisites', () => {
    const { plant, supplies, text } = fixture();
    plant.sense({ incoming: true });
    expect(text()).toContain('key IN');
    expect(plant.control.interlockKey.value).toBe(false);
    plant.control.interlockKey.set(true);
    expect(text()).toContain('MAIN DISCONNECT to ON');
    plant.sense({ mains: true });
    supplies.CONTROL.value = false;
    expect(text()).toContain('internal isolator ON');
    supplies.CONTROL.value = true;
    expect(text()).toContain('LUBE OIL PUMP');
  });

  it('identifies actual card/slot and isolates before replacement; only then recommends reset', () => {
    const { plant, text } = fixture();
    plant.sense({
      incoming: true,
      mains: true,
      plcCabinet: true,
      backplane: true,
    });
    plant.senseCard('plc-input', 'absent');
    expect(text()).toContain('SLOT 3');
    expect(text()).toContain('PLYNOST MODULATION RECTIFIER');
    expect(text()).toContain('Switch OFF');
    plant.sense({ plcCabinet: false });
    expect(text()).toContain('Repair/reseat slot 3');
    plant.senseCard('plc-input', 'ok');
    plant.sense({ plcCabinet: true });
    plant.state.plcHalt.set('E31');
    expect(text()).toContain('RESET REQUIRED');
    expect(plant.state.plcHalt.value).toBe('E31');
  });

  it('distinguishes a running pump ramp from a failed component', () => {
    const { plant, text } = fixture();
    plant.sense({ incoming: true, mains: true, lube: true });
    expect(text()).toContain('pressure building');
    expect(text()).not.toContain('FAULT DETECTED');
    expect(plant.state.oil.value).toBe(0);
  });

  it('reports nominal from the existing healthy/operating outputs without requiring maximum knobs', () => {
    const { plant, text } = fixture();
    plant.sense(
      Object.fromEntries(Object.keys(ELECTRICAL_OFF).map((key) => [key, true])),
    );
    plant.sense({
      liveDoorOpen: false,
      failedInstalled: false,
      hydro: false,
      dingle: false,
    });
    plant.state.plcElapsed.set(30);
    plant.state.oil.set(45);
    plant.state.driveHz.set(30);
    plant.control.phaseTrim.set(8);
    plant.control.fanMode.set(2);
    expect(plant.healthy.value).toBe(true);
    expect(plant.operating.value).toBe(true);
    expect(text()).toContain('STEADY / NOMINAL');
    expect(plant.control.driveSpeed.value).toBe(0);
  });

  it('fits 40x25 and never hides the leading action behind a cascade', () => {
    const rows = diagnosticPage(
      'AUTOMATION CONTROL: FAULT DETECTED',
      'SLOT 2: MODIAL INTERACTION CONTROLLER FAILED',
      'Switch OFF the internal AUTOMATION CONTROL isolator before touching cards.',
    );
    expect(rows.length + 3).toBeLessThanOrEqual(25);
    expect(rows.every(([line]) => line.length <= 40)).toBe(true);
    expect(rows.some(([s]) => s.includes('touching cards.'))).toBe(true);
  });

  it('limits narrative advice to actual supply/failure telemetry', () => {
    const online = signal(true),
      mains = signal(false),
      key = signal(0),
      fault = signal(false);
    const link = narrativeDiagnostics(online, mains, key, fault);
    expect(link.lines.value.flat().join(' ')).toContain('key IN');
    mains.value = true;
    expect(link.lines.value.flat().join(' ')).toContain('TRAINING MONITOR');
    fault.value = true;
    expect(link.lines.value.flat().join(' ')).toContain('FAULT DETECTED');
  });
});
