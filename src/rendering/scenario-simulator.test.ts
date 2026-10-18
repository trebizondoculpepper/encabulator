import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { watchMerged } from '../toolkit/components/core/views/merge-static';
import { createLevel0Scene } from './level0-scene';

beforeEach(() => {
  // Label and screen canvases are made, but nothing is drawn.
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
  // The workstation's comparison model is fetched in development only.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('merges only simulator meshes that nothing changes afterwards', () => {
  const kit = createPanelKit();
  const { scene, machine, simulator } = createLevel0Scene(kit, 1);
  expect(simulator.merged.length).toBeGreaterThan(100);
  const watch = watchMerged(simulator.merged);
  const run = (seconds: number) => {
    for (let t = 0; t < seconds - 1e-9; t += 0.1) {
      machine.update(0.1);
      simulator.update(0.1);
      watch.check();
    }
  };
  // Its door open, every switch pressed in turn, the door shut again.
  const uses = [...simulator.parts.uses.values()];
  uses[uses.length - 1]();
  run(2);
  for (const use of uses.slice(0, -1)) {
    use();
    run(3);
  }
  uses[uses.length - 1]();
  run(2);
  expect(
    watch.changed().map((mesh) => mesh.userData.mergedFrom as string),
  ).toEqual([]);
  simulator.dispose();
  machine.dispose();
  disposeKit(kit, scene as never);
}, 120_000);
