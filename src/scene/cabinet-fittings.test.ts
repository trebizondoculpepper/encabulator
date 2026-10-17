import { afterEach, expect, it, vi } from 'vite-plus/test';
import { Box3 } from 'three';
import { createCrtMonitor, createFlangeHandle } from './cabinet-fittings';
import { createPanelKit, disposeKit } from './eighties-controls';

afterEach(() => vi.unstubAllGlobals());

it('keeps the disconnect lever in front of its plate for the full throw', () => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
  const kit = createPanelKit();
  const view = createFlangeHandle(kit, { colour: 'red' });
  const moving = view.lever.parent!;
  const check = () =>
    expect(new Box3().setFromObject(moving).min.z).toBeGreaterThan(0.012);
  check();
  view.set(false);
  for (let frame = 0; frame < 120; frame++) {
    view.update(1 / 60);
    check();
  }
  view.set(true);
  for (let frame = 0; frame < 120; frame++) {
    view.update(1 / 60);
    check();
  }
  disposeKit(kit, view.group);
});

it('keeps the semiboloid trend and bottom readout inside the CRT face', () => {
  const traces: {
    canvas: { width: number; height: number };
    lines: number[];
    text: [string, number][];
  }[] = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const trace = {
        canvas: { width: 0, height: 0, getContext: () => context },
        lines: [] as number[],
        text: [] as [string, number][],
      };
      const context = new Proxy(
        {
          canvas: trace.canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: () => ({ addColorStop() {} }),
          lineTo: (_x: number, y: number) => trace.lines.push(y),
          fillText: (text: string, _x: number, y: number) =>
            trace.text.push([text, y]),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      traces.push(trace);
      return trace.canvas;
    },
  });
  const kit = createPanelKit();
  const crt = createCrtMonitor(kit, { mode: 'trend' });
  crt.update(1);
  const picture = traces.find((trace) => trace.canvas.width === 320);
  expect(picture).toBeDefined();
  expect(Math.max(...picture!.lines)).toBeLessThanOrEqual(202);
  const status = picture!.text.find(([text]) => text.startsWith('PV '));
  expect(status?.[1]).toBeLessThanOrEqual(227);
  disposeKit(kit, crt.group);
});
