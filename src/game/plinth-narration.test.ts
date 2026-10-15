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
    expect(story.enter()?.clip).toBe(29);
    expect(story.enter()).toBeNull();
    expect(
      story.update(0, 'sphere', arrival('sphere', null), false)?.clip,
    ).toBe(1);
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
    expect(story.update(0, null, null, false)?.clip).toBe(3);
    expect(story.update(14, null, null, false)?.clip).toBe(10);
    expect(story.update(28, null, null, false)?.clip).toBe(11);
  });

  it('distinguishes leaving without a visit from leaving after one', () => {
    const untouched = createPlinthNarration();
    expect(untouched.update(0, null, null, true)?.clip).toBe(30);
    const visited = createPlinthNarration();
    visited.update(0, 'helix', arrival('helix', null), false);
    expect(visited.update(0, null, null, true)?.clip).toBe(31);
  });
});
