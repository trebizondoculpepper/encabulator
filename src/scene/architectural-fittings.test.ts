import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { DirectionalLight, PointLight, Raycaster, Scene, Vector3 } from 'three';
import { addWarehouseLighting } from '../rendering/warehouse-lighting';
import { createArchitecturalServices } from '../toolkit/components/architectural/logic/warehouse-services';
import { ARCHITECTURAL_KINDS } from '../toolkit/components/architectural/logic/architectural-fittings';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createWarehouseTrainingRoom } from './warehouse-training-room';
import { createDistributionBoard } from '../toolkit/components/architectural/views/building-fittings';
import {
  FIRE_KINDS,
  SHARED_KINDS,
} from '../toolkit/gallery/rooms/catalogue-specimens';
import { ARCHITECTURAL_FITTINGS } from '../toolkit/components/architectural/logic/architectural-fittings';

beforeEach(() =>
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: () => ({ addColorStop() {} }),
          createLinearGradient: () => ({ addColorStop() {} }),
        },
        { get: (t, k) => (k in t ? Reflect.get(t, k) : () => {}) },
      );
      return canvas;
    },
  }),
);
afterEach(() => vi.unstubAllGlobals());

describe('architectural fittings', () => {
  it('connects both warehouse switches to the lamps while preserving daylight and emergency supply', () => {
    const kit = createPanelKit();
    const services = createArchitecturalServices();
    const room = createWarehouseTrainingRoom(kit, false, {
      lighting: services,
    });
    const scene = new Scene();
    const lighting = addWarehouseLighting(scene, room.lights, 1, {
      daylight: 0.5,
      circuit: services.model.lighting.roomLight,
    });
    const lamps = scene.children.filter(
      (o): o is PointLight => o instanceof PointLight,
    );
    const daylight = scene.children.find((o) => o instanceof DirectionalLight)!;
    expect(lamps).toHaveLength(12);
    expect(lamps.every((o) => o.visible)).toBe(true);
    expect(daylight.intensity).toBeCloseTo(0.65);
    const switches = room.fittings.filter(
      (o) => o.userData.architectural?.kind === 'switch',
    );
    expect(switches).toHaveLength(2);
    for (const [index, control] of switches.entries()) {
      const use = [...room.parts.uses].find(([object]) =>
        control.getObjectById(object.id),
      );
      expect(use).toBeDefined();
      use![1]();
      room.parts.update(0);
      lighting.update();
      expect(lamps.every((o) => o.visible === (index === 1))).toBe(true);
      expect(services.model.lighting.emergencyLit.value).toBe(false);
      expect(daylight.intensity).toBeCloseTo(0.65);
    }
    services.model.power.lightingBreaker.set(false);
    lighting.update();
    expect(lamps.every((o) => !o.visible)).toBe(true);
    expect(services.model.lighting.emergencyLit.value).toBe(true);
    room.parts.dispose();
    disposeKit(kit, room.group);
  });
  it('exhibits every registered fitting using the same warehouse component, at true scale', () => {
    const kit = createPanelKit(),
      room = createWarehouseTrainingRoom(kit, true);
    const kinds = new Set(
      room.fittings.map((o) => o.userData.architectural?.kind).filter(Boolean),
    );
    expect(
      [...kinds].sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual([...ARCHITECTURAL_KINDS].sort((a, b) => a.localeCompare(b)));
    expect(
      room.fittings.filter(
        (o) => o.userData.architectural?.kind === 'sprinkler',
      ).length,
    ).toBeGreaterThanOrEqual(100);
    for (const object of room.fittings)
      if (object.userData.architectural) {
        expect(object.userData.architectural.attachment).toBe('fixed');
        expect(object.userData.architectural.source).toMatch(/^https:\/\//);
        expect(object.scale.toArray()).toEqual([1, 1, 1]);
        expect(object.userData.portable).toBeUndefined();
      }
    expect(room.group.rotation.y).toBeCloseTo(Math.PI / 2);
    const gate = room.fittings.find(
      (o) => o.userData.architectural?.kind === 'loadingdoor',
    )!;
    room.group.updateMatrixWorld(true);
    expect(gate.getWorldPosition(new Vector3()).z).toBeCloseTo(15);
    room.parts.dispose();
    disposeKit(kit, room.group);
  });
  it('splits the catalogue: active fire safety to dev8, building fittings to dev18, lighting in both', () => {
    const kinds = Object.keys(ARCHITECTURAL_FITTINGS);
    for (const kind of FIRE_KINDS) expect(kinds).toContain(kind);
    expect(new Set(FIRE_KINDS).size).toBe(FIRE_KINDS.length);
    // Building fittings keep the electrics and the doors; fire keeps the rest.
    for (const kind of ['distribution', 'socket', 'switch', 'escapedoor'])
      expect(FIRE_KINDS).not.toContain(kind);
    for (const kind of ['callpoint', 'detector', 'sprinkler', 'valves'])
      expect(FIRE_KINDS).toContain(kind);
    // Emergency lighting and exit signs are lighting as well: in both.
    for (const kind of SHARED_KINDS) expect(FIRE_KINDS).toContain(kind);
    for (const kind of ['panic', 'lever', 'pull'])
      expect(FIRE_KINDS).not.toContain(kind);
  });
  it('keeps the distribution-board breakers behind the closed cover', () => {
    const kit = createPanelKit(),
      view = createDistributionBoard(kit, ['LIGHTS', 'SOCKETS']);
    view.main.set(true);
    view.group.updateMatrixWorld(true);
    const target = view.main.lever.getWorldPosition(new Vector3());
    const ray = new Raycaster(
      new Vector3(target.x, target.y, 1),
      new Vector3(0, 0, -1),
    );
    expect(ray.intersectObject(view.group, true)[0].object).toBe(view.cover);
    view.setOpen(true);
    view.group.updateMatrixWorld(true);
    expect(ray.intersectObject(view.group, true)[0].object).toBe(
      view.main.lever,
    );
    disposeKit(kit, view.group);
  });
});
