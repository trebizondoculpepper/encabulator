import { Box3, Mesh, Vector3, type Object3D } from 'three';
import { mergeTree } from '../toolkit/components/core/views/merge-static';
import { createSparesStock } from '../game/spares-stock';
import { MACHINE_COMPONENTS } from '../toolkit/components/industrial-control/logic/machine-components';
import {
  machineComponent,
  type MachineDevice,
} from '../toolkit/components/industrial-control/parts/machine-components';
import { makeDevicePortable } from '../toolkit/components/core/parts/portable-board';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import {
  createMicroLabel,
  type PanelKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createMaterialise } from '../toolkit/components/core/views/materialise';
import type { PortableObject } from '../toolkit/controls/input/object-handling';
import type { createSparesWorkbench } from '../toolkit/components/site-dressing/views/spares-workbench';
import type { createLevel0Machine } from './level0-machine';

/** Model surfaces only: invisible smoke/spark sprites are not packing geometry. */
function modelBounds(root: Object3D) {
  root.updateMatrixWorld(true);
  const result = new Box3();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (let parent: Object3D | null = object; parent; parent = parent.parent)
      if (!parent.visible) return;
    object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox)
      result.union(
        object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld),
      );
  });
  return result;
}

/** Stock actual removable machine parts; control fuses are serviced as cartridges. */
export function repairStockKinds(
  machine: ReturnType<typeof createLevel0Machine>,
) {
  const installed = machine.mcc.components.flatMap((device) => [
    device,
    ...(device.cards ?? []),
  ]);
  const kinds = new Set(
    installed
      .filter((device) => device.attachment === 'detachable')
      .map((device) => device.kind),
  );
  if (installed.some((device) => device.kind === 'fuse')) kinds.add('fuse');
  return [
    ...MACHINE_COMPONENTS.filter(([kind]) => kinds.has(kind)),
    ['neumann-link', 'Neumann Link Controller'] as const,
    ['neumann-diagnostics', 'Neumann Diagnostics'] as const,
  ];
}

/** A labelled, true-size spare of every component, with independent stock positions. */
export function createLevel0Spares(
  kit: PanelKit,
  bench: ReturnType<typeof createSparesWorkbench>,
  machine: ReturnType<typeof createLevel0Machine>,
) {
  const catalogue = repairStockKinds(machine);
  const parts = createPartSet();
  const items: MachineDevice[] = [];
  const batches: Mesh[] = [];
  const batchListeners = new Set<(meshes: readonly Mesh[]) => void>();
  const positions: {
    x: number;
    z: number;
    width: number;
    depth: number;
    turn: number;
    y: number;
  }[] = [];
  const appearing = new Set<ReturnType<typeof createMaterialise>>();
  const reduced = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const make = (index: number) => {
    const [kind, title] = catalogue[index];
    const original =
      kind === 'fuse'
        ? machine.spareFuse()
        : kind === 'neumann-link' || kind === 'neumann-diagnostics'
          ? machine.spareDiagnostics(kind)
          : kind.startsWith('plc-') && kind !== 'plc-comms'
            ? machine.spare(kind as Parameters<typeof machine.spare>[0])
            : machineComponent(kit, kind, {
                name: `Spare ${title}`,
                power: { value: false },
                attachment: 'fixed',
              });
    if (!original.object.userData.portable)
      original.object.traverse((child) => {
        delete child.userData.portable;
      });
    const portablePart = original.object.userData.portable
      ? original
      : {
          ...original,
          ...makeDevicePortable(
            kit,
            original,
            original.dropProfile,
            () => {},
            () => {},
          ),
        };
    const device = parts.add(portablePart);
    device.object.userData.machineComponentKind = kind;
    device.object.name = `Spare ${title}`;
    if (kind.startsWith('plc-') || kind.startsWith('neumann-'))
      device.object.rotation.z = Math.PI / 2;
    else if (original.dropProfile.shape === 'flat' && kind !== 'capacitors')
      device.object.rotation.x = -Math.PI / 2;
    device.object.updateMatrixWorld(true);
    let bounds = modelBounds(device.object);
    const size = bounds.getSize(new Vector3());
    let place = positions[index];
    if (!place) {
      const candidates = [
        { x: -1.3, z: -0.35 },
        ...positions.flatMap((p) => [
          { x: p.x + p.width, z: p.z },
          { x: p.x, z: p.z + p.depth },
          { x: -1.3, z: p.z + p.depth },
        ]),
      ].sort((a, b) => a.z - b.z || a.x - b.x);
      for (const turn of [0, Math.PI / 2]) {
        const width = Math.max(0.32, (turn ? size.z : size.x) + 0.018);
        const depth = (turn ? size.x : size.z) + 0.025;
        const at = candidates.find(
          (p) =>
            p.x + width <= 1.78 &&
            p.z + depth <= 0.35 &&
            positions.every(
              (q) =>
                p.x + width <= q.x + 1e-6 ||
                p.x >= q.x + q.width - 1e-6 ||
                p.z + depth <= q.z + 1e-6 ||
                p.z >= q.z + q.depth - 1e-6,
            ),
        );
        if (at) {
          place = { ...at, width, depth, turn, y: 0 };
          break;
        }
      }
      if (!place) throw new Error(`No workbench space for ${title}`);
      positions[index] = place;
      const label = createMicroLabel(kit, title, {
        height: 0.005,
        ink: '#181a17',
        plate: '#e7e2cd',
        maxWidth: place.width - 0.006,
      });
      label.rotation.x = -Math.PI / 2;
      label.position.set(
        place.x + place.width / 2,
        0.901,
        place.z + place.depth - 0.009,
      );
      label.userData.pieceRadius = 0.015;
      bench.group.add(label);
      if (label instanceof Mesh) batches.push(label);
    }
    device.object.rotateOnWorldAxis(new Vector3(0, 1, 0), place.turn);
    device.object.updateMatrixWorld(true);
    bounds = modelBounds(device.object);
    const centre = bounds.getCenter(new Vector3());
    device.object.position.set(
      place.x + place.width / 2 - centre.x,
      0.902 - bounds.min.y,
      place.z + (place.depth - 0.025) / 2 - centre.z,
    );
    bench.group.add(device.object);
    device.update(0);
    const clickable = new Set(device.uses.keys());
    const separate = (object: Object3D) =>
      !object.visible ||
      Boolean(object.userData.live || object.userData.portable) ||
      (clickable.has(object) && !object.userData.still) ||
      (object instanceof Mesh && Object.keys(object.userData).length > 0);
    const made = mergeTree(device.object, separate, 1, {
      share: true,
      solid: true,
      fine: [0.03, 0.1],
      targets: new Set([...clickable].filter((object) => !separate(object))),
    });
    // Small indicator lenses change paint, so merging keeps them separate.
    // Their visibility belongs to the distance culler, not the lamp logic.
    device.object.traverse((object) => {
      if (!(object instanceof Mesh) || !object.userData.live) return;
      object.geometry.computeBoundingSphere();
      if (object.geometry.boundingSphere!.radius < 0.01) made.push(object);
    });
    batches.push(...made);
    for (const listen of batchListeners) listen(made);
    items.push(device);
    const portable = device.object.userData.portable as PortableObject;
    portable.component.onEvent((event) => {
      if (event === 'pick-up') stock.taken(device);
    });
    if (stockReady)
      appearing.add(createMaterialise(device.object, { reduced: reduced() }));
    return device;
  };
  // Constructors do not emit pickup events, so the stock exists before any listener can use it.
  let stockReady = false;
  const stock = createSparesStock(make, catalogue.length);
  stockReady = true;
  return {
    parts,
    items,
    batches,
    onBatches: (listen: (meshes: readonly Mesh[]) => void) => {
      batchListeners.add(listen);
    },
    stock,
    update(delta: number) {
      stock.update(delta);
      parts.update(delta);
      for (const effect of appearing)
        if (!effect.update(delta)) appearing.delete(effect);
    },
    dispose() {
      for (const effect of appearing) effect.finish();
      parts.dispose();
    },
  };
}
