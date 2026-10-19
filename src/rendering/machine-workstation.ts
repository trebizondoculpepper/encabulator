import { computed, signal } from '@preact/signals-core';
import type { BbcDiagnosticLink } from '../toolkit/components/industrial-control/logic/bbc-micro';
import {
  Box3,
  Group,
  Vector3,
  Mesh,
  CylinderGeometry,
  CatmullRomCurve3,
  TubeGeometry,
} from 'three';
import { createFloorCableProtector } from '../toolkit/components/architectural/views/floor-cable-protector';
import { kitPaint } from '../toolkit/components/core/views/eighties-controls';
import type { Object3D } from 'three';
import { bbcWorkstation } from '../toolkit/components/industrial-control/parts/bbc-workstation';
import { bbcImportedWorkstation } from '../toolkit/components/industrial-control/parts/bbc-imported-workstation';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { MCC_ISOLATOR_X } from '../scene/retro-encabulator-mcc';
import {
  mergeTree,
  staticMergeEnabled,
} from '../toolkit/components/core/views/merge-static';

/**
 * The BBC Micro diagnostic workstation, its desk and its protected data
 * lead to the line-up's first cabinet. By default it stands left of the
 * isolator, forward of it, facing the machine's operator; `placement`
 * (metres, and a turn about the vertical, its front at yaw 0 facing +z)
 * stands it somewhere else. (The lead keeps its route; it is to be laid
 * again for a new place.)
 */
export function addMachineWorkstation(
  kit: PanelKit,
  machine: { x: number; z: number },
  metre: number,
  dataPort: Object3D,
  link?: BbcDiagnosticLink,
  placement?: { x: number; z: number; yaw: number },
) {
  const group = new Group();
  group.name = 'Encabulator diagnostic workstation';
  group.scale.setScalar(metre);
  if (placement) {
    group.position.set(placement.x * metre, 0, placement.z * metre);
    group.rotation.y = placement.yaw;
  } else {
    group.position.set(
      (machine.x + MCC_ISOLATOR_X - 1.85) * metre,
      0,
      (machine.z + 0.8) * metre,
    );
    group.rotation.y = 1.3;
  }
  const parts = createPartSet();
  let station = parts.add(bbcWorkstation(kit, false, link));
  const active = signal(station.model);
  group.add(station.object);
  // For speed, its still meshes are merged (`mergeTree`); what a click
  // works, what moves, lights or hides, stays as it is.
  const merged: Mesh[] = [];
  const batches: Mesh[] = [];
  if (staticMergeEnabled()) {
    const clickable = new Set<Object3D>(station.uses.keys());
    const separate = (object: Object3D) =>
      !object.visible ||
      Boolean(object.userData.live || object.userData.portable) ||
      (clickable.has(object) && !object.userData.still) ||
      (object instanceof Mesh && Object.keys(object.userData).length > 0);
    const made = mergeTree(station.object, separate, 1, {
      originals: (meshes) => merged.push(...meshes),
      share: true,
      solid: true,
      fine: [0.03, 0.1],
    });
    for (const mesh of made) {
      const within = mesh.parent?.parent;
      if (within && (clickable.has(within) || within.userData.live))
        mesh.userData.control = true;
    }
    batches.push(...made);
  }
  let sit: Parameters<typeof station.onSit>[0] = () => {};
  station.onSit((pose) => sit(pose));
  const connection = new Group();
  connection.name = 'BBC to cabinet protected data lead';
  group.add(connection);
  const black = kitPaint(kit, '#242a26');
  const toLocal = (point: Vector3) => group.worldToLocal(point);
  const addWire = (points: Vector3[], name: string) => {
    const mesh = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(points), 48, 0.0035, 6, false),
      black,
    );
    mesh.name = name;
    connection.add(mesh);
  };
  const connectData = () => {
    connection.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    connection.clear();
    group.updateWorldMatrix(true, true);
    dataPort.updateWorldMatrix(true, true);
    const start = toLocal(
      station.view.dataSocket.getWorldPosition(new Vector3()),
    );
    const end = toLocal(dataPort.getWorldPosition(new Vector3()));
    const outward = new Vector3(0, 0, 1).transformDirection(
      dataPort.matrixWorld,
    );
    const floorStart = new Vector3(start.x, 0, -0.64);
    const portWorld = dataPort.getWorldPosition(new Vector3());
    const floorEnd = toLocal(
      new Vector3(portWorld.x, 0, (machine.z - 0.85) * metre),
    );
    const bend = toLocal(
      new Vector3((machine.x - 3.25) * metre, 0, (machine.z - 0.85) * metre),
    );
    const approach = toLocal(
      new Vector3((machine.x - 3.5) * metre, 0, (machine.z - 0.78) * metre),
    );
    const floorPath = new CatmullRomCurve3([
      floorStart,
      approach,
      bend,
      floorEnd,
    ]);
    const cableFloor = floorPath
      .getPoints(100)
      .map((p) => p.add(new Vector3(0, 0.0045, 0)));
    addWire(cableFloor, 'Data cable beneath rubber channel');
    connection.add(createFloorCableProtector(kit, floorPath));
    const plug = new Mesh(
      new CylinderGeometry(0.0065, 0.0065, 0.028, 12),
      black,
    );
    plug.name = 'BBC RS423 plug';
    plug.position.copy(start).add(new Vector3(0, 0, -0.014));
    plug.rotation.x = Math.PI / 2;
    connection.add(plug);
    addWire(
      [
        start.clone().add(new Vector3(0, 0, -0.025)),
        new Vector3(start.x, start.y, -0.44),
        new Vector3(start.x, station.view.top - 0.06, -0.52),
        new Vector3(start.x, 0.08, -0.64),
        floorStart.clone().add(new Vector3(0, 0.0045, 0)),
      ],
      'BBC rear data cable to floor',
    );
    const reliefWorld = dataPort
      .getWorldPosition(new Vector3())
      .addScaledVector(outward, 0.035 * metre);
    const relief = toLocal(reliefWorld);
    addWire(
      [
        floorEnd.clone().add(new Vector3(0, 0.0045, 0)),
        relief.clone().setY(0.06),
        relief,
        end,
      ],
      'Data cable into first cabinet low round port',
    );
  };
  connectData();
  let disposed = false;
  let audible = true;
  void bbcImportedWorkstation(kit, link)
    .then((loaded) => {
      if (!loaded) return;
      if (disposed) {
        loaded.dispose();
        return;
      }
      loaded.setAudible(false);
      loaded.model.restore(station.model.snapshot());
      station.object.removeFromParent();
      parts.remove(station);
      station = parts.add(loaded);
      active.value = station.model;
      station.onSit((pose) => sit(pose));
      station.setAudible(audible);
      group.add(station.object);
      connectData();
    })
    .catch((error: unknown) =>
      console.error(
        'Diagnostic workstation comparison model could not load',
        error,
      ),
    );
  const solids = (): Footprint[] => {
    group.updateWorldMatrix(true, true);
    const box = new Box3().setFromPoints(
      [-1, 1].flatMap((x) =>
        [-1, 1].map((z) =>
          station.object.localToWorld(
            new Vector3(
              (x * station.view.width) / 2,
              0,
              (z * station.view.depth) / 2,
            ),
          ),
        ),
      ),
    );
    return [
      { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z },
    ];
  };
  return {
    group,
    diagnosticsAvailable: computed(
      () => active.value.diagnosticsAvailable.value,
    ),
    parts,
    /** Its still meshes merged away, for a development check. */
    merged,
    /** The meshes they were merged into, to cull (`detail`). */
    batches,
    solids,
    onSit(callback: typeof sit) {
      sit = callback;
    },
    dispose() {
      disposed = true;
      parts.dispose();
      connection.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
    },
    setAudible(on: boolean) {
      audible = on;
      parts.setAudible(on);
    },
  };
}
