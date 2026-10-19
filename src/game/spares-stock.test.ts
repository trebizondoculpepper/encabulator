import { expect, it } from 'vite-plus/test';
import { createSparesStock } from './spares-stock';

it('replenishes each taken spare after sixty seconds, with independent timers', () => {
  const stock = createSparesStock((index) => ({ index }), 2);
  const [a, b] = stock.places.map((p) => p.item);
  stock.update(120);
  expect(stock.places.map((p) => p.item)).toEqual([a, b]);
  stock.taken(a);
  stock.update(30);
  stock.taken(a); // Further handling of the old spare never restarts its timer.
  stock.taken(b);
  stock.update(29.9);
  expect(stock.places[0].item).toBe(a);
  stock.update(0.1);
  expect(stock.places[0].item).not.toBe(a);
  expect(stock.places[1].item).toBe(b);
  stock.update(30);
  expect(stock.places[1].item).not.toBe(b);
  const replacement = stock.places[0].item;
  stock.taken(a); // An obsolete object cannot consume the new stock.
  stock.update(60);
  expect(stock.places[0].item).toBe(replacement);
});
