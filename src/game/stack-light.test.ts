import { describe, expect, it } from 'vite-plus/test';
import { BEACON_FLASH_HZ, stackLightAt } from './stack-light';

const normal = {
  powered: true,
  battery: true,
  fault: false,
  restarting: false,
  booting: false,
};
const over = (state: typeof normal) =>
  Array.from({ length: 40 }, (_, i) => stackLightAt(state, i / 20));

describe('the stack light', () => {
  it('burns green, steady, in normal running', () => {
    expect(over(normal).every((t) => t.join() === 'false,false,true')).toBe(
      true,
    );
  });

  it('burns amber, steady, while booting or restarting', () => {
    for (const state of [
      { ...normal, booting: true },
      { ...normal, fault: true, restarting: true },
    ])
      expect(over(state).every((t) => t.join() === 'false,true,false')).toBe(
        true,
      );
  });

  it('flashes red alone in a fault, even once the breaker has tripped', () => {
    for (const state of [
      { ...normal, fault: true },
      { ...normal, fault: true, booting: true },
      { ...normal, fault: true, powered: false },
    ]) {
      const tiers = over(state);
      expect(tiers.every(([, amber, green]) => !amber && !green)).toBe(true);
      expect(tiers.some(([red]) => red)).toBe(true);
      expect(tiers.some(([red]) => !red)).toBe(true);
    }
    expect(stackLightAt({ ...normal, fault: true }, 0)[0]).toBe(true);
    expect(
      stackLightAt({ ...normal, fault: true }, 1 / (BEACON_FLASH_HZ * 2))[0],
    ).toBe(false);
  });

  it('is dark without power, and in a fault without its battery', () => {
    expect(stackLightAt({ ...normal, powered: false }, 0)).toEqual([
      false,
      false,
      false,
    ]);
    expect(
      stackLightAt(
        { ...normal, fault: true, powered: false, battery: false },
        0,
      ),
    ).toEqual([false, false, false]);
  });
});
