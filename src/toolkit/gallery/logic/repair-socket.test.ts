import { expect, it } from 'vite-plus/test';
import { socketDecision } from './repair-socket';

const ready = {
  live: false,
  occupied: false,
  partKind: 'plc-power',
  socketKind: 'plc-power',
  partBoard: 1,
  socketBoard: 1,
};

it('seats only a matching spare at an isolated empty socket', () => {
  expect(socketDecision(ready)).toBe('insert');
  expect(socketDecision({ ...ready, live: true })).toBe('live');
  expect(socketDecision({ ...ready, occupied: true })).toBe('occupied');
  expect(socketDecision({ ...ready, partKind: 'plc-cpu' })).toBe('wrong-part');
  expect(socketDecision({ ...ready, partBoard: 2 })).toBe('wrong-board');
});
