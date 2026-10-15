import { describe, expect, it } from 'vite-plus/test';
import {
  PLINTHS,
  PLINTH_SPACING,
  REACH,
  createPlinthTracker,
  spotlightLevels,
} from './plinths';

const at = (id: string) => PLINTHS.find((p) => p.id === id)!;

describe('the plinths', () => {
  it('stand at the corners of a triangle, about ten seconds apart', () => {
    for (let i = 0; i < 3; i++) {
      const a = PLINTHS[i];
      const b = PLINTHS[(i + 1) % 3];
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(PLINTH_SPACING, 1);
    }
    // At walking pace, 2 m/s.
    expect(PLINTH_SPACING / 2).toBeGreaterThanOrEqual(9);
    expect(PLINTH_SPACING / 2).toBeLessThanOrEqual(11);
  });

  it('are out of reach of each other', () => {
    expect(PLINTH_SPACING).toBeGreaterThan(2 * REACH);
  });
});

describe('the plinth tracker', () => {
  it('finds no plinth in the middle of the room', () => {
    const tracker = createPlinthTracker();
    expect(tracker.update(0, 0)).toEqual({ active: null, arrival: null });
  });

  it('makes a plinth active within reach, and only on arrival reports it', () => {
    const tracker = createPlinthTracker();
    const helix = at('helix');
    const first = tracker.update(helix.x + REACH - 0.1, helix.z);
    expect(first.active).toBe('helix');
    expect(first.arrival).toEqual({
      at: 'helix',
      previous: null,
      before: [],
      visit: 1,
    });
    expect(tracker.update(helix.x, helix.z).arrival).toBeNull();
    expect(tracker.update(helix.x + REACH + 0.1, helix.z).active).toBeNull();
  });

  it('remembers where the visitor has been, in order', () => {
    const tracker = createPlinthTracker();
    for (const id of ['sphere', 'rhombus', 'sphere']) {
      tracker.update(0, 0);
      tracker.update(at(id).x, at(id).z);
    }
    expect(tracker.history()).toEqual(['sphere', 'rhombus', 'sphere']);
    tracker.update(0, 0);
    expect(tracker.update(at('helix').x, at('helix').z).arrival).toEqual({
      at: 'helix',
      previous: 'sphere',
      before: ['sphere', 'rhombus', 'sphere'],
      visit: 1,
    });
    tracker.update(0, 0);
    expect(tracker.update(at('sphere').x, at('sphere').z).arrival?.visit).toBe(
      3,
    );
  });

  it('knows the plinth visited before the present one', () => {
    const tracker = createPlinthTracker();
    expect(tracker.previous()).toBeNull();
    tracker.update(at('rhombus').x, at('rhombus').z);
    expect(tracker.previous()).toBeNull();
    tracker.update(0, 0);
    // Away from every plinth, the last one visited.
    expect(tracker.previous()).toBe('rhombus');
    const arrival = tracker.update(at('helix').x, at('helix').z).arrival;
    expect(arrival?.previous).toBe('rhombus');
    expect(tracker.previous()).toBe('rhombus');
  });
});

describe('the spotlights', () => {
  it('light the active plinth and dim the others', () => {
    const levels = spotlightLevels('rhombus');
    expect(levels.rhombus).toBe(1);
    expect(levels.helix).toBeLessThan(0.1);
    expect(levels.sphere).toBeLessThan(0.1);
  });

  it('stand all at a low level at none', () => {
    const levels = spotlightLevels(null);
    expect(levels.rhombus).toBe(levels.helix);
    expect(levels.rhombus).toBeGreaterThan(0);
    expect(levels.rhombus).toBeLessThan(0.5);
  });

  it('come up plainly when a plinth is reached', () => {
    // At least four stops between standing and lit, or the change is
    // lost in the tone mapping.
    expect(spotlightLevels('helix').helix).toBeGreaterThanOrEqual(
      16 * spotlightLevels(null).helix,
    );
  });
});
