import { PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createMachineSideCulling } from './machine-side-culling';
import { MCC_DEPTH, createRetroEncabulatorMcc } from './retro-encabulator-mcc';

beforeEach(() => {
  // Label canvases are made, but nothing is drawn.
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
});
afterEach(() => vi.unstubAllGlobals());

it('draws only the side of the machine the camera can see', () => {
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit);
  // Placed and scaled as a room places it.
  mcc.group.position.set(2, 0, -10);
  const culling = createMachineSideCulling(mcc.group);
  expect(culling.rear).not.toBeNull();
  expect(culling.fronts.length).toBeGreaterThan(20);
  const camera = new PerspectiveCamera();
  const at = (x: number, z: number) => {
    camera.position.set(2 + x, 1.6, -10 + z);
    camera.updateMatrixWorld(true);
    culling.update(camera);
  };
  at(0, 2);
  expect(culling.rear!.visible).toBe(false);
  expect(culling.fronts.every((front) => front.visible)).toBe(true);
  at(0, -MCC_DEPTH - 2);
  expect(culling.rear!.visible).toBe(true);
  expect(culling.fronts.some((front) => front.visible)).toBe(false);
  // Beside an end, both.
  at(4, -0.2);
  expect(culling.rear!.visible).toBe(true);
  expect(culling.fronts.every((front) => front.visible)).toBe(true);
  // From behind, a ray through the back finds no front fitting.
  at(0, -MCC_DEPTH - 2);
  mcc.group.updateMatrixWorld(true);
  const ray = new Raycaster(
    new Vector3(2, 1.2, -10 - MCC_DEPTH - 2),
    new Vector3(0, 0, 1),
  );
  for (const hit of ray.intersectObject(mcc.group, true))
    for (let o = hit.object; o; o = o.parent!) {
      expect(culling.fronts).not.toContain(o);
      if (!o.parent) break;
    }
  mcc.parts.dispose();
  disposeKit(kit, mcc.group);
});
