import { expect, it } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { createMachinePower } from './machine-power';

it('starts dark, blinks on power-up, steadies, then coasts to silence', () => {
  const supply = signal(false);
  const power = createMachinePower(supply);
  power.step(1);
  expect(power.lit.value).toBe(false);
  expect(power.speed.value).toBe(0);
  supply.value = true;
  power.step(0.1);
  expect(power.lit.value).toBe(true);
  power.step(0.2);
  expect(power.lit.value).toBe(false);
  power.step(2.5);
  expect(power.lit.value).toBe(true);
  expect(power.speed.value).toBe(1);
  supply.value = false;
  expect(power.lit.value).toBe(false);
  power.step(2);
  expect(power.speed.value).toBeCloseTo(0.6);
  power.step(3);
  expect(power.speed.value).toBe(0);
  supply.value = true;
  power.step(0.01);
  power.step(0.2);
  expect(power.lit.value).toBe(false);
});
