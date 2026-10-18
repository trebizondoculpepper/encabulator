import { neumannDiagnostics } from '../toolkit/components/industrial-control/parts/neumann-diagnostics';
import { signal } from '@preact/signals-core';
import { bbcWorkstation } from '../toolkit/components/industrial-control/parts/bbc-workstation';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import type { Object3D } from 'three';
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
  expect(
    mcc.group.getObjectByName('Neumann Link diagnostics available'),
  ).toBeUndefined();
  const controller = mcc.group.getObjectByName('NEUMANN LINK CONTROLLER');
  expect(controller).toBeDefined();
  expect(mcc.group.getObjectByName('NEUMANN DIAGNOSTICS')).toBeDefined();
  const led = mcc.group.getObjectByName(
    'Neumann Link Controller connection LED',
  )!;
  expect(mcc.parts.uses.has(led)).toBe(false);
  if (mcc.mainBreaker.closed.value) mcc.mainBreaker.operate();
  for (const [object, use] of mcc.parts.uses) {
    let parent: Object3D | null = object;
    while (parent && parent.name !== 'Incoming supply isolator')
      parent = parent.parent;
    if (parent) {
      use();
      break;
    }
  }
  expect(mcc.supply.value).toBe(true);
  const ann = mcc.circuits.get('section1.bucket3')!;
  if (!ann.breaker!.breaker!.closed.value) ann.breaker!.breaker!.operate();
  expect(mcc.mainBreaker.closed.value).toBe(false);
  expect(mcc.diagnosticEndpoint.value).toBe(true);
  ann.breaker!.breaker!.operate();
  expect(mcc.diagnosticEndpoint.value).toBe(false);
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

it('sounds one positional read per session, cancels it on disconnect/suspension and never replays an old read', () => {
  const kit = createPanelKit();
  const online = signal(true);
  const stop = vi.fn();
  const play = vi.spyOn(partAudio, 'play').mockReturnValue(stop);
  const part = bbcWorkstation(kit, false, { online, lines: signal([]) });
  part.model.power.flip();
  part.update(4.5);
  part.update(0.35);
  const reads = () =>
    play.mock.calls.filter(([recipe]) => 'sequence' in recipe);
  // The program load was stepped over; just the remote diagnostic read sounds.
  expect(reads()).toHaveLength(1);
  expect(reads()[0][1]).toBe(part.view.disk.group);
  part.setAudible(false);
  expect(stop).toHaveBeenCalled();
  part.setAudible(true);
  part.update(0.1);
  expect(reads()).toHaveLength(1);
  online.value = false;
  expect(part.model.reading.value).toBe(false);
  online.value = true;
  part.update(0.35);
  expect(reads()).toHaveLength(2);
  part.update(2);
  part.update(20);
  expect(reads()).toHaveLength(2);
  part.model.power.flip();
  expect(part.model.diagnosticsAvailable.value).toBe(false);
  part.dispose();
  play.mockRestore();
  disposeKit(kit, part.object);
});

it('flashes the internal controller only after a session, beeps once and loses the endpoint when either board or its isolator disconnects', () => {
  const kit = createPanelKit();
  const power = signal(false),
    available = signal(false);
  const stop = vi.fn();
  const play = vi.spyOn(partAudio, 'play').mockReturnValue(stop);
  const beeps = () => play.mock.calls.filter(([recipe]) => 'tone' in recipe);
  const boards = neumannDiagnostics(kit, power, available);
  const led = boards.object.getObjectByName(
    'Neumann Link Controller connection LED',
  )!;
  expect(boards.online.value).toBe(false);
  power.value = true;
  expect(boards.online.value).toBe(true);
  expect(boards.connected.value).toBe(false);
  available.value = true;
  expect(beeps()).toHaveLength(1);
  boards.update(0.1);
  expect(led.userData.lit).toBe(true);
  boards.update(0.5);
  expect(led.userData.lit).toBe(false);
  boards.update(0.5);
  expect(beeps()).toHaveLength(1);
  power.value = false;
  expect(boards.connected.value).toBe(false);
  expect(stop).toHaveBeenCalled();
  available.value = false;
  power.value = true;
  expect(beeps()).toHaveLength(1);
  boards.controller.connected.flip();
  expect(boards.online.value).toBe(false);
  boards.controller.connected.flip();
  boards.diagnostics.fail();
  expect(boards.online.value).toBe(false);
  boards.diagnostics.repair();
  available.value = true;
  expect(beeps()).toHaveLength(2);
  boards.setAudible(false);
  expect(stop).toHaveBeenCalled();
  boards.setAudible(true);
  boards.update(1);
  expect(beeps()).toHaveLength(2);
  boards.dispose();
  play.mockRestore();
  disposeKit(kit, boards.object);
});
