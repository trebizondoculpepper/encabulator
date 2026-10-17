import { expect, it } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { createScreenBoot } from './screen-boot';

it('scrolls diagnostics for 15 seconds and restarts when its supply is interrupted', () => {
  const supply = signal(false);
  const boot = createScreenBoot(supply, 'TEST CRT');
  boot.step(30);
  expect(boot.booting).toBe(false);
  supply.value = true;
  expect(boot.booting).toBe(true);
  const first = boot.lines();
  boot.step(7);
  expect(boot.lines()).not.toEqual(first);
  expect(boot.lines(2, 16)).toHaveLength(2);
  expect(boot.lines(2, 16).every((line) => line.length <= 16)).toBe(true);
  boot.step(7.99);
  expect(boot.booting).toBe(true);
  boot.step(0.01);
  expect(boot.booting).toBe(false);
  supply.value = false;
  boot.step(0.1);
  supply.value = true;
  expect(boot.booting).toBe(true);
  expect(boot.lines()).toEqual(first);
});
