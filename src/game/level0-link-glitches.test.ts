import { describe, expect, it } from 'vite-plus/test';
import { createLinkGlitches } from './level0-link-glitches';

describe('Neumann Link false positives', () => {
  it('briefly turns one healthy green window amber without changing its source', () => {
    const glitch = createLinkGlitches(3, {
      random: () => 0.5,
      firstAfter: 1,
    });
    const source = ['green', 'red', 'green'] as const;
    expect(glitch.step(0.5, true, source, source)).toEqual(source);
    expect(glitch.step(0.5, true, source, source)).toEqual([
      'green',
      'red',
      'amber',
    ]);
    expect(source).toEqual(['green', 'red', 'green']);
    expect(glitch.step(2.4, true, source, source)[2]).toBe('amber');
    expect(glitch.step(0.2, true, source, source)).toEqual(source);
  });

  it('clears a false positive immediately if the window faults or power is lost', () => {
    const glitch = createLinkGlitches(1, {
      random: () => 0,
      firstAfter: 0,
    });
    expect(glitch.step(0.1, true, ['green'], ['green'])).toEqual(['amber']);
    expect(glitch.step(0.1, true, ['red'], ['red'])).toEqual(['red']);
    expect(glitch.step(0.1, false, ['off'], ['off'])).toEqual(['off']);
  });
});
