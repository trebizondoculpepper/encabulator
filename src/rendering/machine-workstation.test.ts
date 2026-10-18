import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { Box3, Mesh, TubeGeometry, Vector3 } from 'three';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createRetroEncabulatorMcc } from '../scene/retro-encabulator-mcc';
import { addMachineWorkstation } from './machine-workstation';

vi.mock(
  '../toolkit/components/industrial-control/parts/bbc-imported-workstation',
  () => ({ bbcImportedWorkstation: async () => null }),
);
beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (s: string) => ({ width: s.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
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

it('joins the rear socket, protected floor run and real cabinet port continuously at scene scale', () => {
  const kit = createPanelKit();
  const metre = 3,
    machine = { x: 2, z: 4 };
  const mcc = createRetroEncabulatorMcc(kit);
  mcc.group.scale.setScalar(metre);
  mcc.group.position.set(machine.x * metre, 0, machine.z * metre);
  const station = addMachineWorkstation(kit, machine, metre, mcc.rear.dataPort);
  station.group.updateMatrixWorld(true);
  const wire = (name: string) =>
    station.group.getObjectByName(name) as Mesh<TubeGeometry>;
  const point = (mesh: Mesh<TubeGeometry>, t: number) =>
    mesh.localToWorld(mesh.geometry.parameters.path.getPoint(t));
  const drop = wire('BBC rear data cable to floor');
  const floor = wire('Data cable beneath rubber channel');
  const rise = wire('Data cable into first cabinet low round port');
  expect(point(drop, 1).distanceTo(point(floor, 0))).toBeLessThan(1e-6);
  expect(point(floor, 1).distanceTo(point(rise, 0))).toBeLessThan(1e-6);
  expect(
    point(rise, 1).distanceTo(
      mcc.rear.dataPort.getWorldPosition(new Vector3()),
    ),
  ).toBeLessThan(1e-6);
  expect(
    new Box3()
      .setFromObject(station.group.getObjectByName('BBC RS423 plug')!)
      .containsPoint(point(drop, 0)),
  ).toBe(true);
  const cover = station.group.getObjectByName('Rubber floor cable protector')!;
  expect(new Box3().setFromObject(cover).min.y).toBeCloseTo(0.001 * metre);
  // The protected route stays behind the isolator before entering section 1.
  for (let i = 0; i <= 100; i++) {
    const p = point(floor, i / 100).divideScalar(metre);
    if (p.x > machine.x - 2.9) expect(p.z).toBeLessThan(machine.z - 0.6);
  }
  station.dispose();
  mcc.parts.dispose();
  disposeKit(kit, station.group);
  disposeKit(kit, mcc.group);
}, 15000);
