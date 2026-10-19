import { describe, expect, it } from 'vite-plus/test';
import {
  BROWNOUT_BUILD,
  SURGE_SECONDS,
  BROWNOUT_CLEAR,
  OVERCAPACITY_AMPS,
  OVERCAPACITY_SECONDS,
  createBuildingSupply,
} from './building-supply';

const run = (
  supply: ReturnType<typeof createBuildingSupply>,
  seconds: number,
  amps: number,
) => {
  const volts: number[] = [];
  for (let t = 0; t < seconds; t += 0.05) volts.push(supply.step(0.05, amps));
  return volts;
};

describe("the building's supply under Level 0's machine", () => {
  it('holds steady with the machine off, and sags a little under load', () => {
    const supply = createBuildingSupply();
    expect(Math.min(...run(supply, 2, 0))).toBeCloseTo(1);
    run(supply, 5, 100);
    const loaded = run(supply, 1, 100);
    expect(loaded.at(-1)!).toBeLessThan(1);
    expect(loaded.at(-1)!).toBeGreaterThan(0.95);
  });

  it('dips as a motor starts, enough to put out some tubes, and recovers', () => {
    const supply = createBuildingSupply();
    run(supply, 1, 40);
    const start = supply.step(0.05, 61);
    expect(start).toBeLessThan(0.8);
    const after = run(supply, 1, 61);
    expect(after.at(-1)!).toBeGreaterThan(0.95);
  });

  it('browns out when run over capacity for long, and clears when the load comes down', () => {
    const supply = createBuildingSupply();
    run(supply, 1, OVERCAPACITY_AMPS + 5);
    run(supply, OVERCAPACITY_SECONDS - 5, OVERCAPACITY_AMPS + 5);
    expect(supply.brownout).toBe(0);
    const browning = run(supply, 10 + BROWNOUT_BUILD, OVERCAPACITY_AMPS + 5);
    expect(supply.brownout).toBe(1);
    const mean = browning.slice(-200).reduce((a, b) => a + b, 0) / 200;
    expect(mean).toBeLessThan(0.85);
    run(supply, BROWNOUT_CLEAR + 1, 100);
    expect(supply.brownout).toBe(0);
  });

  it('surges in a catastrophe, swings wildly and trips the lighting once', () => {
    const supply = createBuildingSupply();
    run(supply, 1, 100);
    supply.catastrophe();
    expect(supply.step(0.05, 100)).toBeGreaterThan(1.05);
    let trips = 0;
    const swings: number[] = [];
    for (let t = 0; t < SURGE_SECONDS + 1; t += 0.05) {
      swings.push(supply.step(0.05, 100));
      if (supply.trip()) trips++;
    }
    expect(trips).toBe(1);
    expect(Math.min(...swings)).toBeLessThan(0.6);
    expect(supply.surging).toBe(false);
    expect(swings.at(-1)!).toBeGreaterThan(0.95);
  });

  it('makes the lights strange as the strain grows, and not before', () => {
    const dips = (strain: number) => {
      const supply = createBuildingSupply();
      run(supply, 1, 60);
      let count = 0;
      for (let t = 0; t < 60; t += 0.05)
        if (supply.step(0.05, 60, strain) < 0.88) count++;
      return count;
    };
    expect(dips(0.1)).toBe(0);
    expect(dips(0.5)).toBeGreaterThan(0);
    expect(dips(0.9)).toBeGreaterThan(dips(0.5));
  });

  it('browns out on demand for a while, and clears', () => {
    const supply = createBuildingSupply();
    supply.brownoutFor(BROWNOUT_BUILD + 10);
    run(supply, BROWNOUT_BUILD + 5, 60);
    expect(supply.brownout).toBe(1);
    run(supply, 5 + BROWNOUT_CLEAR + 1, 60);
    expect(supply.brownout).toBe(0);
    supply.brownoutFor(60);
    run(supply, 10, 60);
    supply.clear();
    expect(supply.brownout).toBe(0);
  });
});
