import { describe, expect, it } from 'vite-plus/test';
import {
  createStatusScanner,
  statusColour,
  statusLight,
  worstSeverity,
} from './level0-status';

const ok = {
  powered: true,
  on: true,
  starting: false,
  worst: null,
  acknowledged: false,
};

describe('Level 0 status lights', () => {
  it('is dark without power, whatever is wrong', () => {
    expect(statusLight({ ...ok, powered: false, worst: 'critical' })).toBe(
      'off',
    );
  });

  it('flashes green while starting, then shows green', () => {
    expect(statusLight({ ...ok, starting: true })).toBe('green-flash');
    expect(statusLight(ok)).toBe('green');
  });

  it('shows the worst fault: amber, red, flashing red until acknowledged', () => {
    expect(statusLight({ ...ok, worst: 'warning' })).toBe('amber');
    expect(statusLight({ ...ok, worst: 'failure', starting: true })).toBe(
      'red',
    );
    expect(statusLight({ ...ok, worst: 'critical' })).toBe('red-flash');
    expect(statusLight({ ...ok, worst: 'critical', acknowledged: true })).toBe(
      'red',
    );
    expect(worstSeverity(['warning', 'critical', 'failure'])).toBe('critical');
    expect(worstSeverity([])).toBeNull();
  });

  it('flashes on and off, and holds steady colours', () => {
    expect(statusColour('green-flash', 0)).toBe('green');
    expect(statusColour('green-flash', 0.25)).toBeNull();
    expect(statusColour('red-flash', 0.3)).toBeNull();
    expect(statusColour('amber', 0.3)).toBe('amber');
    expect(statusColour('off', 0)).toBeNull();
  });
});

describe('the slow status scanner', () => {
  it('waits, flashing green, for each window\'s first scan', () => {
    const scanner = createStatusScanner(3, { secondsPerWindow: 1 });
    expect(scanner.step(0.1, true, ['red', 'green', 'amber'])).toEqual([
      'green-flash',
      'green-flash',
      'green-flash',
    ]);
    // One window a second, in turn.
    expect(scanner.step(1, true, ['red', 'green', 'amber'])).toEqual([
      'red',
      'green-flash',
      'green-flash',
    ]);
    expect(scanner.step(2, true, ['red', 'green', 'amber'])).toEqual([
      'red',
      'green',
      'amber',
    ]);
  });

  it('recovers from red through flashing green, one scan at a time', () => {
    const scanner = createStatusScanner(2, { secondsPerWindow: 1 });
    scanner.step(2.1, true, ['red', 'green']);
    expect(scanner.shown[0]).toBe('red');
    // Well again, but shown only as its turn comes...
    scanner.step(0.5, true, ['green', 'green']);
    expect(scanner.shown[0]).toBe('red');
    // ...first flashing green, verifying...
    scanner.step(1, true, ['green', 'green']);
    expect(scanner.shown[0]).toBe('green-flash');
    // ...then steady green a scan later.
    scanner.step(2, true, ['green', 'green']);
    expect(scanner.shown[0]).toBe('green');
  });

  it('shows a failure at its next scan, and nothing without power', () => {
    const scanner = createStatusScanner(2, { secondsPerWindow: 1 });
    scanner.step(2.1, true, ['green', 'green']);
    scanner.step(0.5, true, ['red-flash', 'green']);
    expect(scanner.shown[0]).toBe('green');
    scanner.step(2, true, ['red-flash', 'green']);
    expect(scanner.shown[0]).toBe('red-flash');
    expect(scanner.step(0.1, false, ['red', 'red'])).toEqual(['off', 'off']);
  });
});
