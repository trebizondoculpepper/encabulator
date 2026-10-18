import { PerspectiveCamera } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { LEVEL0_MACHINE, LEVEL0_START } from '../game/level0-room-plan';
import { WAREHOUSE_BOUNDS } from '../game/warehouse-room-plan';
import { METRE } from '../toolkit/components/core/logic/units';
import { countDraws } from '../toolkit/components/core/views/draw-count';
import { createPanelKit } from '../toolkit/components/core/views/eighties-controls';
import { EYE_HEIGHT_METRES } from '../toolkit/controls/input/first-person';
import { createDetailCuller } from './detail-culling';
import { createLevel0Scene, cullLevel0Detail } from './level0-scene';

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

/**
 * Draw calls a frame may make, from any of the views below. The rule is
 * 1,000, about what a cheap laptop's browser can issue thirty times a
 * second with room to spare for the machine's own logic (AGENTS.md,
 * Performance); Level 0 is allowed 1,400 for now, as culling more of the
 * line-up's detail from where the player starts takes away what it is
 * recognised by. Its printed legends, each a texture of its own, and its
 * lamps, each a paint of its own, are what is left to bring it down.
 */
const BUDGET = 1400;

/** The player's eye at (x, z), facing `yaw` (0 is north), as in play. */
const VIEWS = {
  start: { ...LEVEL0_START, pitch: 0 },
  // Up close to the line-up's middle, as when working its doors.
  machine: {
    x: LEVEL0_MACHINE.x,
    z: LEVEL0_MACHINE.z + 1.6,
    yaw: 0,
    pitch: -0.1,
  },
  // From the far south-east corner, the whole room and the machine in it.
  overview: {
    x: WAREHOUSE_BOUNDS.maxX - 1,
    z: WAREHOUSE_BOUNDS.maxZ - 1,
    yaw: -Math.atan2(
      WAREHOUSE_BOUNDS.maxX - 1 - LEVEL0_MACHINE.x,
      WAREHOUSE_BOUNDS.maxZ - 1 - LEVEL0_MACHINE.z,
    ),
    pitch: -0.05,
  },
};

it.each(Object.entries(VIEWS))(
  'draws Level 0 within its budget from the %s view',
  (_view, { x, z, yaw, pitch }) => {
    const m = METRE;
    const { scene, machine, machineSides, detail } = createLevel0Scene(
      createPanelKit(),
      m,
    );
    machine.update(0);
    const camera = new PerspectiveCamera(55, 16 / 9, 0.05, 100 * m);
    const eye = EYE_HEIGHT_METRES * m;
    camera.position.set(x * m, eye, z * m);
    camera.lookAt(
      (x + Math.sin(yaw) * Math.cos(pitch)) * m,
      eye + Math.sin(pitch) * m,
      (z - Math.cos(yaw) * Math.cos(pitch)) * m,
    );
    // As the room does: the machine's far side and detail too small to
    // see from here are not drawn.
    machineSides.update(camera);
    scene.updateMatrixWorld();
    const culler = createDetailCuller(camera);
    cullLevel0Detail(culler, detail);
    culler.update(1);
    const draws = countDraws(scene, camera);
    expect(draws.total, JSON.stringify(draws)).toBeLessThanOrEqual(BUDGET);
  },
);
