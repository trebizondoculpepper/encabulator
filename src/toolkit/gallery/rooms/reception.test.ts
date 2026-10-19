import { PerspectiveCamera, Scene } from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { countDraws } from '../../components/core/views/draw-count';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { EYE_HEIGHT_METRES } from '../../controls/input/first-person';
import {
  RECEPTION_BOUNDS,
  RECEPTION_VIEWS,
  createReception,
} from './reception';

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

const draws = (name: keyof typeof RECEPTION_VIEWS) => {
  const reception = createReception(createPanelKit());
  const scene = new Scene();
  scene.add(reception.group);
  const { x, z, yaw, pitch } = RECEPTION_VIEWS[name];
  const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 500);
  camera.position.set(x, EYE_HEIGHT_METRES, z);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, -yaw, 0);
  const counted = countDraws(scene, camera);
  reception.parts.dispose();
  return counted;
};

describe('dev23, the Reception', () => {
  it.each([
    'entrance',
    'desk',
    'behind',
    'waiting',
    'room',
    'outside',
  ] as const)('draws within a few hundred calls from the %s', (name) => {
    const counted = draws(name);
    expect(counted.total, JSON.stringify(counted)).toBeLessThanOrEqual(400);
  });

  it('opens its sliding doors as someone comes up to them, and closes them after', () => {
    const reception = createReception(createPanelKit());
    const { maxX } = RECEPTION_BOUNDS;
    for (let i = 0; i < 120; i++)
      reception.update(1 / 60, maxX - 1, RECEPTION_VIEWS.entrance.z);
    expect(reception.entrance.open).toBe(1);
    for (let i = 0; i < 600; i++) reception.update(1 / 60, 0, 0);
    expect(reception.entrance.open).toBe(0);
    reception.parts.dispose();
  });

  it('keeps every standing place clear of the furniture', () => {
    const reception = createReception(createPanelKit());
    const { minX, maxX, minZ, maxZ } = RECEPTION_BOUNDS;
    for (const [name, { x, z }] of Object.entries(RECEPTION_VIEWS)) {
      expect(x, name).toBeGreaterThan(minX);
      expect(x, name).toBeLessThan(maxX);
      expect(z, name).toBeGreaterThan(minZ);
      expect(z, name).toBeLessThan(maxZ);
      const blocked = reception.solids.some(
        (s) =>
          x > s.minX - 0.25 &&
          x < s.maxX + 0.25 &&
          z > s.minZ - 0.25 &&
          z < s.maxZ + 0.25,
      );
      expect(blocked, name).toBe(false);
    }
    reception.parts.dispose();
  });
});
