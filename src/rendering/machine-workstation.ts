import {
  Box3,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  Group,
  Mesh,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
} from 'three';
import { bbcWorkstation } from '../toolkit/components/industrial-control/parts/bbc-workstation';
import { bbcImportedWorkstation } from '../toolkit/components/industrial-control/parts/bbc-imported-workstation';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { kitPaint } from '../toolkit/components/core/views/eighties-controls';
import { MCC_ISOLATOR_X } from '../scene/retro-encabulator-mcc';

/** Left of the isolator, forward of it, facing the machine's operator. */
export function addMachineWorkstation(
  kit: PanelKit,
  machine: { x: number; z: number },
  metre: number,
) {
  const group = new Group();
  group.name = 'Encabulator diagnostic workstation';
  group.scale.setScalar(metre);
  group.position.set(
    (machine.x + MCC_ISOLATOR_X - 1.85) * metre,
    0,
    (machine.z + 0.8) * metre,
  );
  group.rotation.y = 1.3;
  const parts = createPartSet();
  let station = parts.add(bbcWorkstation(kit));
  group.add(station.object);
  let sit: Parameters<typeof station.onSit>[0] = () => {};
  station.onSit((pose) => sit(pose));
  group.updateMatrixWorld(true);
  const end = group.worldToLocal(
    new Vector3(
      (machine.x - 1.8) * metre,
      0.16 * metre,
      (machine.z - 0.514) * metre,
    ),
  );
  const start = new Vector3(
    station.view.bbc.group.position.x - 0.19,
    0.008,
    -0.46,
  );
  const cable = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([
        start,
        new Vector3(start.x, 0.008, -0.65),
        new Vector3(end.x, 0.008, end.z - 0.05),
        end,
      ]),
      32,
      0.005,
      6,
      false,
    ),
    kitPaint(kit, '#242622'),
  );
  cable.name = 'Workstation supply flex into cabinet rear grommet';
  group.add(cable);
  const grommet = new Mesh(
    new CylinderGeometry(0.014, 0.014, 0.012, 12),
    kitPaint(kit, '#242622'),
  );
  grommet.position.copy(end);
  grommet.quaternion.copy(group.quaternion).invert();
  grommet.rotateX(Math.PI / 2);
  group.add(grommet);
  const ribbonEnd = group.worldToLocal(
    new Vector3(
      (machine.x + 0.7) * metre,
      1.1 * metre,
      (machine.z - 0.514) * metre,
    ),
  );
  const profile = new Shape();
  profile.moveTo(-0.012, -0.0007);
  profile.lineTo(0.012, -0.0007);
  profile.lineTo(0.012, 0.0007);
  profile.lineTo(-0.012, 0.0007);
  profile.closePath();
  const ribbonPath = new CatmullRomCurve3([
    station.view.bbc.group.position
      .clone()
      .add(new Vector3(-0.03, 0.004, -0.12)),
    new Vector3(start.x + 0.15, station.view.top + 0.008, -0.25),
    new Vector3(start.x + 0.15, station.view.top - 0.02, -0.4),
    new Vector3(start.x + 0.15, 0.012, -0.56),
    new Vector3(ribbonEnd.x, 0.012, ribbonEnd.z - 0.1),
    ribbonEnd,
  ]);
  const ribbon = new Mesh(
    new ExtrudeGeometry(profile, {
      steps: 48,
      bevelEnabled: false,
      extrudePath: ribbonPath,
    }),
    kitPaint(kit, '#89877c'),
  );
  ribbon.name =
    'BBC user-port ribbon to automation cabinet diagnostic interface';
  group.add(ribbon);
  let disposed = false;
  let audible = true;
  void bbcImportedWorkstation(kit)
    .then((loaded) => {
      if (!loaded) return;
      if (disposed) {
        loaded.dispose();
        return;
      }
      if (station.model.power.state.value) {
        loaded.model.power.flip();
        loaded.model.step(station.model.elapsed.value);
      }
      station.object.removeFromParent();
      parts.remove(station);
      station = parts.add(loaded);
      station.onSit((pose) => sit(pose));
      station.setAudible(audible);
      group.add(station.object);
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
    parts,
    solids,
    onSit(callback: typeof sit) {
      sit = callback;
    },
    dispose() {
      disposed = true;
      parts.dispose();
      cable.geometry.dispose();
      grommet.geometry.dispose();
      ribbon.geometry.dispose();
    },
    setAudible(on: boolean) {
      audible = on;
      parts.setAudible(on);
    },
  };
}
