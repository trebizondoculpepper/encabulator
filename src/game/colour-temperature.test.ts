import { describe, expect, it } from 'vitest';
import { kelvinToHex, kelvinToRgb } from './colour-temperature';

describe('colour temperature', () => {
  it('is near white at 6600 K', () => {
    const [r, g, b] = kelvinToRgb(6600);
    expect(r).toBeGreaterThan(0.98);
    expect(g).toBeGreaterThan(0.95);
    expect(b).toBeGreaterThan(0.95);
  });

  it('is orange when warm and blue when cool', () => {
    const [wr, , wb] = kelvinToRgb(2000);
    expect(wr).toBe(1);
    expect(wb).toBeLessThan(0.2);
    const [cr, , cb] = kelvinToRgb(12000);
    expect(cb).toBe(1);
    expect(cr).toBeLessThan(0.8);
  });

  it('gives a CSS colour', () => {
    expect(kelvinToHex(6600)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
