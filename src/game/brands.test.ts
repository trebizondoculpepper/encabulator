import { describe, expect, it } from 'vite-plus/test';
import { BRANDS } from './brands';

describe('the brands', () => {
  it('are sixteen companies, each with an id and name of its own', () => {
    expect(BRANDS).toHaveLength(16);
    expect(new Set(BRANDS.map((b) => b.id)).size).toBe(16);
    expect(new Set(BRANDS.map((b) => b.name)).size).toBe(16);
  });

  it('keep the companies the two games have already named', () => {
    const names = BRANDS.map((b) => b.name);
    for (const name of [
      'Neumann Dynamik',
      'Volt Xoccula',
      'Bonk Industries',
      'Wonshou Labs',
      'Trager-Feinstein Laboratory',
      'Synclex',
      'Gorskiy',
      'Pepperdyne',
      'Voltara',
      'Fankel',
    ])
      expect(names).toContain(name);
  });

  it('give each brand its own logo and three colours', () => {
    expect(new Set(BRANDS.map((b) => b.mark)).size).toBe(16);
    for (const brand of BRANDS) {
      expect(brand.colours).toHaveLength(3);
      for (const colour of brand.colours)
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(brand.founded).toBeGreaterThan(1900);
      expect(brand.founded).toBeLessThan(2026);
    }
  });
});
