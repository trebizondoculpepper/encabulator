import { expect, it } from 'vite-plus/test';
import { boardImpact, boardScrape } from './board-impact';

it('makes later, weaker collisions substantially quieter without repeating knocks', () => {
  const impacts = [
    boardImpact(5.5, 1),
    boardImpact(0.9, 2),
    boardImpact(0.36, 3),
  ];
  const levels = impacts.map((recipe) => {
    if (!('click' in recipe)) throw new Error('Expected a procedural impact');
    expect(recipe.click.repeat).toBeUndefined();
    return recipe.click.level;
  });
  expect(levels[1]).toBeLessThan(levels[0] * 0.15);
  expect(levels[2]).toBeLessThan(levels[1]);
  const scrape = boardScrape(0.65);
  if (!('click' in scrape)) throw new Error('Expected a procedural scrape');
  expect(scrape.click.level).toBeLessThan(levels[0] * 0.06);
  expect(scrape.click.thump).toBeUndefined();
});
