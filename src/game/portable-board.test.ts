import { expect, it } from 'vite-plus/test';
import { createBoardFall, createPortableBoard } from './portable-board';

it('only drops a held board, and allows settled boards to be picked up again', () => {
  const board = createPortableBoard();
  const events: string[] = [];
  board.onEvent((event) => events.push(event));
  board.drop();
  expect(board.phase.value).toBe('installed');
  board.pickUp();
  board.drop();
  board.impact();
  board.settle();
  expect(board.phase.value).toBe('settled');
  board.pickUp();
  expect(board.phase.value).toBe('held');
  expect(events).toEqual(['pick-up', 'drop', 'impact', 'pick-up']);
});

it.each([1 / 120, 1 / 30, 0.1])(
  'falls, skitters and settles quickly with dt=%s',
  (dt) => {
    const fall = createBoardFall(0, 1.5, 0, 0.65, 0.2);
    let impacts = 0;
    let time = 0;
    while (!fall.body.settled && time < 3) {
      fall.step(
        dt,
        () => 0.02,
        () => impacts++,
      );
      time += dt;
    }
    expect(fall.body.settled).toBe(true);
    expect(time).toBeLessThan(2);
    expect(fall.body.y).toBeCloseTo(0.02);
    expect(fall.body.x).toBeGreaterThan(0.1);
    expect(impacts).toBeGreaterThan(0);
    expect(impacts).toBeLessThanOrEqual(3);
  },
);
