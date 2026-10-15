import { describe, expect, it } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import {
  createCapacitor,
  createContactor,
  createFuse,
  createHourMeter,
  createMushroomStop,
  createOperatingHandle,
  createOverloadRelay,
  createPilotLight,
} from './components';
import type { PartEvent } from './components';

function heard(part: { onEvent(l: (e: PartEvent) => void): unknown }) {
  const events: PartEvent[] = [];
  part.onEvent((e) => events.push(e));
  return events;
}
const run = (step: (s: number) => void, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) step(0.05);
};

describe('an operating handle', () => {
  it('throws ON and OFF, and must be reset through OFF after a trip', () => {
    const h = createOperatingHandle();
    const events = heard(h);
    h.operate();
    expect(h.position.value).toBe('on');
    h.trip();
    expect(h.position.value).toBe('tripped');
    h.operate();
    expect(h.position.value).toBe('off');
    expect(events).toEqual(['on', 'trip', 'off']);
  });

  it('will not move padlocked', () => {
    const h = createOperatingHandle({ latch: signal(true) });
    const events = heard(h);
    expect(h.operate()).toBe(false);
    expect(events).toEqual(['refused']);
  });

  it('sounds its trip when the world trips it', () => {
    const position = signal<'off' | 'on' | 'tripped'>('on');
    const h = createOperatingHandle({
      bound: {
        get value() {
          return position.value;
        },
        set: (p) => (position.value = p),
      },
    });
    const events = heard(h);
    position.value = 'tripped';
    expect(events).toEqual(['trip']);
  });
});

describe('a mushroom stop', () => {
  it('stays in when struck and comes out when pulled', () => {
    const m = createMushroomStop();
    const events = heard(m);
    m.operate();
    expect(m.pushed.value).toBe(true);
    m.operate();
    expect(m.pushed.value).toBe(false);
    expect(events).toEqual(['press', 'release']);
  });
});

describe('a pilot light', () => {
  it('lights from its drive while powered, and briefly when tested', () => {
    const power = signal(true);
    const drive = signal(false);
    const p = createPilotLight({ power, drive });
    expect(p.lit.value).toBe(false);
    p.press();
    expect(p.lit.value).toBe(true);
    run(p.step, 1);
    expect(p.lit.value).toBe(false);
    drive.value = true;
    expect(p.lit.value).toBe(true);
    power.value = false;
    expect(p.lit.value).toBe(false);
  });

  it('stays dark with a burnt-out bulb, test or no test', () => {
    const p = createPilotLight({ drive: signal(true) });
    p.burnOut();
    p.press();
    expect(p.lit.value).toBe(false);
    p.replace();
    expect(p.lit.value).toBe(true);
  });
});

describe('a contactor', () => {
  it('pulls in and drops out with its coil, sounding each', () => {
    const coil = signal(false);
    const c = createContactor({ coil });
    const events = heard(c);
    coil.value = true;
    expect(c.closed.value).toBe(true);
    coil.value = false;
    expect(c.closed.value).toBe(false);
    expect(events).toEqual(['pull-in', 'drop-out']);
  });

  it('stays closed with its contacts welded and its coil dead', () => {
    const coil = signal(true);
    const c = createContactor({ coil });
    c.weld();
    coil.value = false;
    expect(c.closed.value).toBe(true);
    c.repair();
    expect(c.closed.value).toBe(false);
  });
});

describe('an overload relay', () => {
  it('carries its setting indefinitely', () => {
    const current = signal(3);
    const o = createOverloadRelay({ current, settings: [3], initial: 0 });
    run(o.step, 2000);
    expect(o.tripped.value).toBe(false);
  });

  it('trips on six times its setting within its class, and opens its contact', () => {
    const current = signal(18);
    const o = createOverloadRelay({ current, settings: [3], initial: 0 });
    const events = heard(o);
    run(o.step, 10);
    expect(o.tripped.value).toBe(true);
    expect(o.contactClosed.value).toBe(false);
    expect(events).toEqual(['trip']);
  });

  it('will not reset until it has cooled', () => {
    const current = signal(18);
    const o = createOverloadRelay({ current, settings: [3], initial: 0 });
    run(o.step, 12);
    current.value = 0;
    expect(o.reset()).toBe(false);
    run(o.step, 600);
    expect(o.reset()).toBe(true);
    expect(o.tripped.value).toBe(false);
  });

  it('trips at once on TEST', () => {
    const o = createOverloadRelay({ current: signal(0) });
    o.test();
    expect(o.tripped.value).toBe(true);
  });

  it('turns its dial through its settings', () => {
    const o = createOverloadRelay({
      current: signal(0),
      settings: [1, 2, 3],
      initial: 0,
    });
    o.dial.turn(1);
    expect(o.setting.value).toBe(2);
  });
});

describe('a fuse', () => {
  it('carries its rating, blows above it, and is replaced', () => {
    const current = signal(2);
    const f = createFuse({ current, rating: 2 });
    const events = heard(f);
    run(f.step, 60);
    expect(f.blown.value).toBe(false);
    current.value = 4;
    run(f.step, 0.5);
    expect(f.blown.value).toBe(true);
    current.value = 0;
    f.replace();
    expect(f.whole.value).toBe(true);
    expect(events).toEqual(['blow', 'press']);
  });
});

describe('an electrolytic capacitor', () => {
  it('lasts at its rating', () => {
    const c = createCapacitor({ voltage: signal(400), rated: 400 });
    run(c.step, 600);
    expect(c.health.value).toBe('good');
  });

  it('bulges and then vents, smoking, held well over its rating', () => {
    const c = createCapacitor({ voltage: signal(480), rated: 400 });
    const events = heard(c);
    run(c.step, 20);
    expect(c.health.value).toBe('vented');
    expect(c.working.value).toBe(false);
    expect(c.smoke.value).toBeGreaterThan(0.5);
    expect(events).toEqual(['bulge', 'vent']);
    run(c.step, 40);
    expect(c.smoke.value).toBe(0);
    c.replace();
    expect(c.health.value).toBe('good');
  });
});

describe('an hour meter', () => {
  it('counts only while its terminals are live', () => {
    const running = signal(true);
    const m = createHourMeter({ running, initial: 100 });
    run(m.step, 360);
    expect(m.hours.value).toBeCloseTo(100.1, 2);
    running.value = false;
    run(m.step, 360);
    expect(m.hours.value).toBeCloseTo(100.1, 2);
  });
});
