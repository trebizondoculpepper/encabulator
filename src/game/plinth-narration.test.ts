import { describe, expect, it } from 'vite-plus/test';
import { createPlinthNarration } from './plinth-narration';
import type { Arrival, ExhibitId } from './plinths';

const arrival = (
  at: ExhibitId,
  previous: ExhibitId | null,
  visit = 1,
): Arrival => ({ at, previous, before: previous ? [previous] : [], visit });

describe('plinth narration', () => {
  it('plays the entrance once and selects the first sphere line', () => {
    const story = createPlinthNarration();
    expect(story.enter()).toEqual({ clip: 29, priority: 4 });
    expect(story.enter()).toBeNull();
    expect(story.update(0, 'sphere', arrival('sphere', null), false)).toEqual({
      clip: 1,
      priority: 3,
      shape: 'sphere',
    });
  });

  it('prefers a move between shapes and rotates its alternate lines', () => {
    const story = createPlinthNarration();
    expect(
      story.update(0, 'sphere', arrival('sphere', 'rhombus'), false)?.clip,
    ).toBe(19);
    story.update(0, null, null, false);
    expect(
      story.update(0, 'sphere', arrival('sphere', 'rhombus', 2), false)?.clip,
    ).toBe(20);
    expect(
      story.update(0, 'helix', arrival('helix', 'sphere'), false)?.clip,
    ).toBe(25);
  });

  it('offers leaving, lingering and dark lines at their moments', () => {
    const story = createPlinthNarration();
    story.update(0, 'rhombus', arrival('rhombus', null), false);
    expect(story.update(8, 'rhombus', null, false)?.clip).toBe(23);
    expect(story.update(20, 'rhombus', null, false)?.clip).toBe(43);
    expect(story.update(0, null, null, false)?.clip).toBe(3);
    expect(story.update(14, null, null, false)?.clip).toBe(10);
    expect(story.update(28, null, null, false)).toBeNull();
    expect(story.update(28, null, null, false)?.clip).toBe(11);
  });

  it('distinguishes leaving without a visit from leaving after one', () => {
    const untouched = createPlinthNarration();
    expect(untouched.update(0, null, null, true)?.clip).toBe(30);
    const visited = createPlinthNarration();
    visited.update(0, 'helix', arrival('helix', null), false);
    expect(visited.update(0, null, null, true)?.clip).toBe(31);
  });

  it('rotates the additional shape remarks into later linger moments', () => {
    for (const [shape, first, second] of [
      ['sphere', 21, 34],
      ['helix', 5, 39],
      ['rhombus', 23, 43],
    ] as const) {
      const story = createPlinthNarration();
      story.update(0, shape, arrival(shape, null), false);
      expect(story.update(8, shape, null, false)?.clip).toBe(first);
      expect(story.update(20, shape, null, false)?.clip).toBe(second);
    }
  });
});
