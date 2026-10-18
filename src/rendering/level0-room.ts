import {
  BoxGeometry,
  Frustum,
  Group,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import {
  LEVEL0_CHAIRS,
  LEVEL0_MACHINE,
  LEVEL0_SPARES,
  LEVEL0_START,
} from '../game/level0-room-plan';
import { CARD_KINDS } from '../game/level0-plant';
import { WAREHOUSE_BOUNDS, WAREHOUSE_ROOF } from '../game/warehouse-room-plan';
import { ejectCabinetDrop } from '../game/cabinet-drop';
import { createWarehouseTrainingRoom } from '../scene/warehouse-training-room';
import {
  MCC_DEPTH,
  MCC_ISOLATOR_X,
  MCC_WIDTH,
} from '../scene/retro-encabulator-mcc';
import { METRE } from '../toolkit/components/core/logic/units';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';
import { ISOLATOR } from '../toolkit/components/industrial-control/views/incoming-isolator';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import {
  CHAIR_STACK_HALF,
  createChairStack,
} from '../toolkit/components/site-dressing/views/chair-stack';
import {
  addSkipGraffiti,
  addSkipLamps,
  createSkip,
} from '../toolkit/components/site-dressing/views/skip';
import { dressSkip } from '../toolkit/components/site-dressing/logic/skip-dressing';
import { createBinTossing } from '../toolkit/components/site-dressing/parts/bin-tossing';
import type { TossBin } from '../toolkit/components/site-dressing/parts/bin-tossing';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { knobDirection } from '../toolkit/controls/input/knob-turning';
import type { PortableObject } from '../toolkit/controls/input/object-handling';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { devWalls } from '../toolkit/gallery/logic/dev-room-links';
import { createLevel0Machine } from './level0-machine';
import { addWarehouseLighting } from './warehouse-lighting';

/**
 * Level 0, the machine sandbox: Level 2's setting and machine with no
 * scenario, wired unit by unit to its own process model, with a spares
 * bench, one random failure at a time and the skip that takes the chairs'
 * place the first time a board comes out of the machine.
 */
export function startLevel0Room(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.3);
  renderer.setClearColor('#cbd3d6');
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(55, 1, 0.05, 100 * m);
  const kit = createPanelKit();
  const room = createWarehouseTrainingRoom(kit);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  addWarehouseLighting(scene, room.lights, m);
  const bounds: Footprint = {
    minX: WAREHOUSE_BOUNDS.minX * m,
    maxX: WAREHOUSE_BOUNDS.maxX * m,
    minZ: WAREHOUSE_BOUNDS.minZ * m,
    maxZ: WAREHOUSE_BOUNDS.maxZ * m,
  };
  const walls = devWalls(bounds, m, WAREHOUSE_ROOF * m);
  const roomSolids = room.solids.map((solid) => ({
    minX: solid.minX * m,
    maxX: solid.maxX * m,
    minZ: solid.minZ * m,
    maxZ: solid.maxZ * m,
  }));
  const machine = createLevel0Machine(kit);
  const { mcc } = machine;
  mcc.group.scale.setScalar(m);
  mcc.group.position.set(LEVEL0_MACHINE.x * m, 0, LEVEL0_MACHINE.z * m);
  scene.add(mcc.group);

  // ---- The spares bench ----------------------------------------------------
  const spareParts = createPartSet();
  const bench = new Group();
  bench.name = 'Spares bench';
  bench.scale.setScalar(m);
  bench.position.set(LEVEL0_SPARES.x * m, 0, LEVEL0_SPARES.z * m);
  scene.add(bench);
  const steel = kitPaint(kit, '#5d6468', 0.4);
  const { width, depth, height } = LEVEL0_SPARES;
  const top = new Mesh(new BoxGeometry(width, 0.03, depth), steel);
  top.position.y = height - 0.015;
  top.userData.boardSupport = true;
  bench.add(top);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(0.04, height - 0.03, 0.04), steel);
      leg.position.set(
        (x * (width - 0.06)) / 2,
        (height - 0.03) / 2,
        (z * (depth - 0.06)) / 2,
      );
      bench.add(leg);
    }
  const shelf = new Mesh(
    new BoxGeometry(width - 0.06, 0.02, depth - 0.06),
    steel,
  );
  shelf.position.y = 0.18;
  bench.add(shelf);
  const sign = createMicroLabel(
    kit,
    'SPARE PLC MODULES\nHEALTHY REPLACEMENTS · ISOLATE AUTOMATION CONTROL BEFORE FITTING',
    { height: 0.018, ink: '#f4f1e6', plate: '#1d4f8c' },
  );
  sign.position.set(0, height - 0.06, depth / 2 + 0.002);
  bench.add(sign);
  /** Where each kind's spare lies on the bench, left to right. */
  const benchSpot = (i: number) => ({
    x: -width / 2 + 0.14 + i * ((width - 0.28) / (CARD_KINDS.length - 1)),
    z: 0,
  });
  const onBench = new Map<string, MachineDevice | null>();
  CARD_KINDS.forEach((kind, i) => {
    const label = createMicroLabel(kit, `${i + 1}`, {
      height: 0.02,
      ink: '#f4f1e6',
      plate: '#1d1f22',
    });
    const spot = benchSpot(i);
    label.position.set(spot.x, height + 0.001, depth / 2 - 0.04);
    label.rotation.x = -Math.PI / 2;
    bench.add(label);
    onBench.set(kind, null);
  });
  /** Every spare ever stocked, wherever it is now. */
  const spareCards = new Set<MachineDevice>();
  const stock = (kind: (typeof CARD_KINDS)[number]) => {
    const card = machine.spare(kind);
    spareParts.add(card);
    spareCards.add(card);
    const spot = benchSpot(CARD_KINDS.indexOf(kind));
    // Lying on its side on the bench, as a card is carried.
    card.object.rotation.set(0, 0, Math.PI / 2);
    card.object.position.set(spot.x + 0.1, height + 0.012, spot.z);
    bench.add(card.object);
    onBench.set(kind, card);
  };
  for (const kind of CARD_KINDS) stock(kind);
  const frustum = new Frustum();
  const projection = new Matrix4();
  const benchSphere = () => {
    const centre = bench.position.clone();
    centre.y += height * m * 0.5;
    return { centre, radius: 1 * m };
  };
  /** Restock the bench where a spare has been taken, out of sight. */
  const restock = () => {
    const taken = CARD_KINDS.filter((kind) => {
      const card = onBench.get(kind);
      return (
        !card ||
        card.object.parent !== bench ||
        (card.object.userData.portable as PortableObject).component.phase
          .value !== 'installed'
      );
    });
    if (!taken.length) return;
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projection);
    const { centre, radius } = benchSphere();
    if (frustum.intersectsSphere({ center: centre, radius } as never)) return;
    for (const kind of taken) stock(kind);
  };

  // ---- The skip that was always there --------------------------------------
  const tossing = createBinTossing({ camera, metre: m });
  const chairs = createChairStack(8, {
    fabric: kitPaint(kit, '#2c4775'),
    shell: kitPaint(kit, '#1d1f22'),
    chrome: kitPaint(kit, '#c9cccc', 0.9),
  });
  chairs.scale.setScalar(m);
  chairs.position.set(LEVEL0_CHAIRS.x * m, 0, LEVEL0_CHAIRS.z * m);
  chairs.rotation.y = 0.12;
  scene.add(chairs);
  const skipModel = createSkip(kit);
  skipModel.group.scale.setScalar(m);
  let skip: TossBin | null = null;
  let skipLamps: ReturnType<typeof addSkipLamps> | null = null;
  let skipGraffiti: ReturnType<typeof addSkipGraffiti> | null = null;
  /** Once per room: the chairs go and the skip stands in their place. */
  const conjureSkip = () => {
    if (skip) return;
    scene.remove(chairs);
    skipModel.group.position.set(LEVEL0_CHAIRS.x * m, 0, LEVEL0_CHAIRS.z * m);
    scene.add(skipModel.group);
    const dressing = dressSkip();
    skipGraffiti = addSkipGraffiti(kit, skipModel.group, dressing.tags);
    skipLamps = addSkipLamps(kit, skipModel.group, dressing.lamps);
    skip = tossing.add({ name: 'skip', ...skipModel, ...LEVEL0_CHAIRS });
  };
  // The first board actually taken out of the machine, healthy or not,
  // while the player is looking into the cabinet.
  machine.onBoardRemoved(conjureSkip);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [mcc.group, ...room.fittings],
      true,
    )[0];
    if (!hit || hit.distance > 3.2 * m) return null;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    ) {
      const work = mcc.parts.uses.get(object) ?? room.parts.uses.get(object);
      if (work) return () => work(knobDirection(object!, hit.point, camera));
    }
    return null;
  };
  /** What, in the machine, the player is looking at within reach. */
  const aimedInto = (home: Object3D) => {
    raycaster.setFromCamera(pointer.set(0, 0), camera);
    const hit = raycaster.intersectObject(mcc.group, true)[0];
    if (!hit || hit.distance > 3.2 * m) return false;
    for (let o: Object3D | null = hit.object; o; o = o.parent)
      if (o === home) return true;
    return false;
  };
  /**
   * Let go of a board while looking into its own place in the machine and
   * it is seated there, if that cabinet is isolated and the place is empty;
   * otherwise it drops, or goes in the skip, as anything does.
   */
  const reseat = (object: Object3D) => {
    const device = [
      ...machine.assembly.cards!,
      ...spareCards,
      machine.capacitors,
    ].find((board) => board.object === object);
    if (!device) return false;
    const home =
      device === machine.capacitors
        ? machine.capacitorParent
        : machine.assembly.object;
    return aimedInto(home) && machine.reseat(device);
  };
  const footprints: Footprint[] = [
    {
      minX: (LEVEL0_MACHINE.x - MCC_WIDTH / 2 - 0.1) * m,
      maxX: (LEVEL0_MACHINE.x + MCC_WIDTH / 2 + 0.1) * m,
      minZ: (LEVEL0_MACHINE.z - MCC_DEPTH - 0.08) * m,
      maxZ: (LEVEL0_MACHINE.z + 0.08) * m,
    },
    {
      minX: (LEVEL0_MACHINE.x + MCC_ISOLATOR_X - ISOLATOR.width / 2 - 0.05) * m,
      maxX: (LEVEL0_MACHINE.x + MCC_ISOLATOR_X + ISOLATOR.width / 2 + 0.05) * m,
      minZ: (LEVEL0_MACHINE.z + ISOLATOR.back) * m,
      maxZ: (LEVEL0_MACHINE.z + ISOLATOR.front) * m,
    },
    {
      minX: (LEVEL0_SPARES.x - width / 2 - 0.05) * m,
      maxX: (LEVEL0_SPARES.x + width / 2 + 0.05) * m,
      minZ: (LEVEL0_SPARES.z - depth / 2 - 0.05) * m,
      maxZ: (LEVEL0_SPARES.z + depth / 2 + 0.05) * m,
    },
  ];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: { ...LEVEL0_START, x: LEVEL0_START.x * m, z: LEVEL0_START.z * m },
    solids: () => [
      ...walls,
      ...roomSolids,
      ...footprints,
      skip
        ? {
            minX: (skip.x - skip.footprint.x / 2 - 0.05) * m,
            maxX: (skip.x + skip.footprint.x / 2 + 0.05) * m,
            minZ: (skip.z - skip.footprint.z / 2 - 0.05) * m,
            maxZ: (skip.z + skip.footprint.z / 2 + 0.05) * m,
          }
        : {
            minX: (LEVEL0_CHAIRS.x - CHAIR_STACK_HALF) * m,
            maxX: (LEVEL0_CHAIRS.x + CHAIR_STACK_HALF) * m,
            minZ: (LEVEL0_CHAIRS.z - CHAIR_STACK_HALF) * m,
            maxZ: (LEVEL0_CHAIRS.z + CHAIR_STACK_HALF) * m,
          },
    ],
    divert: (object, portable) =>
      reseat(object) || tossing.divert(object, portable),
    redirectDrop: (placement) =>
      ejectCabinetDrop(placement, {
        minX: LEVEL0_MACHINE.x - MCC_WIDTH / 2 - 0.05,
        maxX: LEVEL0_MACHINE.x + MCC_WIDTH / 2 + 0.05,
        back: LEVEL0_MACHINE.z - MCC_DEPTH - 0.05,
        front: LEVEL0_MACHINE.z + 0.08,
      }),
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    room.parts.update(delta);
    spareParts.update(delta);
    tossing.update(delta);
    skipLamps?.update(time / 1000);
    machine.update(delta);
    restock();
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    machine.dispose();
    mcc.parts.dispose();
    spareParts.dispose();
    room.parts.dispose();
    skipLamps?.dispose();
    skipGraffiti?.dispose();
    scene.remove(skipModel.group, chairs);
    for (const root of [scene, skipModel.group, chairs])
      disposeKit(kit, root as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { level0?: unknown }).level0;
  };
  // Development only: these bind no input.
  (window as unknown as { level0: unknown }).level0 = {
    world: machine.plant.graph,
    plant: machine.plant,
    machine,
    components: () =>
      mcc.components.map((device) => ({
        name: device.object.name,
        kind: device.kind,
        active: device.active.value,
        faulted: device.faulted.value,
      })),
    state: () => ({
      plc: machine.plant.plcStatus.value,
      dimension: machine.plant.achieved.value,
      allowed: machine.plant.allowed.value,
      faults: machine.plant.faults.value.map((f) => `${f.code} ${f.text}`),
      incident: machine.scheduler.incident,
      nextFailure: machine.scheduler.remaining,
      skip: Boolean(skip),
    }),
    /** Fail something now, as the scheduler would (`card:plc-cpu`, ...). */
    inflict: (id: string) => machine.inflict(id),
    view: (x: number, z: number, yaw = 0, pitch = 0) =>
      walk.place(x * m, z * m, yaw, pitch),
    conjureSkip,
  };
  return Object.assign(dispose, {
    suspend() {
      mcc.parts.setAudible(false);
      spareParts.setAudible(false);
      room.parts.setAudible(false);
    },
    resume() {
      mcc.parts.setAudible(true);
      spareParts.setAudible(true);
      room.parts.setAudible(true);
    },
  });
}
