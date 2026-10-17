import { expect, it } from 'vite-plus/test';
import { circuitTraces } from './circuit-traces';

it('repeats a board seed without sharing state between boards', () => {
  const first = circuitTraces(70, 90, 650);
  expect(first.length).toBeGreaterThan(10);
  expect(circuitTraces(70, 90, 1771)).not.toEqual(first);
  expect(circuitTraces(70, 90, 650)).toEqual(first);
});

it('reserves the board edge and never shares trace cells', () => {
  const occupied = new Set<string>();
  for (const wire of circuitTraces(70, 90, 650)) {
    for (let i = 0; i < wire.length; i += 2) {
      const x = wire[i],
        y = wire[i + 1];
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThan(67);
      expect(y).toBeGreaterThanOrEqual(3);
      expect(y).toBeLessThan(87);
      const cell = `${x},${y}`;
      expect(occupied.has(cell)).toBe(false);
      occupied.add(cell);
      if (i > 0) {
        expect(Math.abs(x - wire[i - 2])).toBeLessThanOrEqual(1);
        expect(Math.abs(y - wire[i - 1])).toBeLessThanOrEqual(1);
      }
    }
  }
});
