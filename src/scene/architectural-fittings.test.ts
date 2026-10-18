import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Raycaster, Vector3 } from 'three';
import { ARCHITECTURAL_KINDS } from '../game/architectural-fittings';
import { createPanelKit, disposeKit } from './eighties-controls';
import { createWarehouseTrainingRoom } from './warehouse-training-room';
import { createDistributionBoard } from './building-fittings';
import { createArchitecturalElectricalGallery } from '../rendering/architectural-gallery';

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
  it('also exhibits the same distribution board and UK socket in dev0', () => {
    const kit = createPanelKit(),
      board = createArchitecturalElectricalGallery(kit);
    const kinds: string[] = [];
    board.group.traverse((o) => {
      if (o.userData.architectural) kinds.push(o.userData.architectural.kind);
    });
    expect(kinds).toEqual(['distribution', 'socket', 'switch']);
    expect(board.parts.uses.size).toBeGreaterThan(5);
    board.dispose();
    disposeKit(kit, board.group);
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
