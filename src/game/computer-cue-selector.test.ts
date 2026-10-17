import { expect, it } from 'vite-plus/test';
import { createComputerCueSelector } from './computer-cue-selector';

it('plays a selected cue now and every five seconds until changed or stopped', () => {
  const played: number[] = [];
  const selector = createComputerCueSelector(3, (index) => played.push(index));
  selector.select(1);
  expect(played).toEqual([1]);
  selector.step(4.9);
  expect(played).toEqual([1]);
  selector.step(0.1);
  expect(played).toEqual([1, 1]);
  selector.select(2);
  expect(played).toEqual([1, 1, 2]);
  selector.step(5);
  expect(played).toEqual([1, 1, 2, 2]);
  selector.select(2);
  expect(selector.selected.value).toBeNull();
  selector.step(10);
  expect(played).toEqual([1, 1, 2, 2]);
  selector.select(10);
  expect(selector.selected.value).toBeNull();
});
