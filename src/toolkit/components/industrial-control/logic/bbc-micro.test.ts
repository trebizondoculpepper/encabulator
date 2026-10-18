import { describe, expect, it } from 'vite-plus/test';
import { BBC_LOAD_SECONDS, createBbcComputer } from './bbc-micro';

describe('BBC Micro startup', () => {
  it('starts off, beeps through ROM startup before loading, then shows a standalone diagnostic page', () => {
    const computer = createBbcComputer();
    computer.step(60);
    expect(computer.phase.value).toBe('off');
    expect(computer.lines.value).toEqual([]);
    expect(computer.elapsed.value).toBe(0);
    computer.power.flip();
    computer.step(0.5);
    expect(computer.phase.value).toBe('boot');
    expect(computer.lines.value[0][0]).toBe('BBC Computer 32K');
    computer.step(1.5);
    expect(computer.phase.value).toBe('loading');
    expect(
      computer.lines.value.some(([line]) => line === '>CHAIN "DIAG"'),
    ).toBe(true);
    computer.step(BBC_LOAD_SECONDS);
    expect(computer.phase.value).toBe('ready');
    expect(
      computer.lines.value.some(([line]) => line.includes('NOT CONNECTED')),
    ).toBe(true);
    computer.dispose();
  });

  it('cancels loading and starts fresh after power cycling', () => {
    const computer = createBbcComputer();
    computer.power.flip();
    computer.step(3);
    computer.power.flip();
    computer.step(10);
    expect(computer.lines.value).toEqual([]);
    expect(computer.elapsed.value).toBe(0);
    computer.power.flip();
    expect(computer.phase.value).toBe('boot');
    expect(computer.elapsed.value).toBe(0);
    computer.step(-1);
    expect(computer.elapsed.value).toBe(0);
    computer.dispose();
  });
});
