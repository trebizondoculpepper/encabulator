import { Box3, Group, Vector3 } from 'three';
import { bbcWorkstation } from '../toolkit/components/industrial-control/parts/bbc-workstation';
import { bbcImportedWorkstation } from '../toolkit/components/industrial-control/parts/bbc-imported-workstation';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
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
    },
    setAudible(on: boolean) {
      audible = on;
      parts.setAudible(on);
    },
  };
}
