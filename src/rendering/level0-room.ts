import {
  Group,
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
  LEVEL0_START,
} from '../game/level0-room-plan';
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
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';
import { ISOLATOR } from '../toolkit/components/industrial-control/views/incoming-isolator';
import {
  CHAIR_STACK_HALF,
  createChairStack,
} from '../toolkit/components/site-dressing/views/chair-stack';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { knobDirection } from '../toolkit/controls/input/knob-turning';
import type { PortableObject } from '../toolkit/controls/input/object-handling';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { devWalls } from '../toolkit/gallery/logic/dev-room-links';
import { createLevel0Machine } from './level0-machine';
import { addWarehouseLighting } from './warehouse-lighting';

/** Level 2's initial setting, with an independent machine and no scenario. */
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
  const { mcc, automation } = createLevel0Machine(kit);
  mcc.group.scale.setScalar(m);
  mcc.group.position.set(LEVEL0_MACHINE.x * m, 0, LEVEL0_MACHINE.z * m);
  scene.add(mcc.group);
  const chairs = createChairStack(8, {
    fabric: kitPaint(kit, '#2c4775'),
    shell: kitPaint(kit, '#1d1f22'),
    chrome: kitPaint(kit, '#c9cccc', 0.9),
  });
  chairs.scale.setScalar(m);
  chairs.position.set(LEVEL0_CHAIRS.x * m, 0, LEVEL0_CHAIRS.z * m);
  chairs.rotation.y = 0.12;
  scene.add(chairs);

  const cards = mcc.components
    .filter((device) => device.kind === 'backplane')
    .flatMap((device) => device.cards ?? []);
  const lockCards = () => {
    for (const card of cards) {
      const portable = (card.object.userData.portable as PortableObject)
        .component;
      portable.setLocked(
        portable.phase.value === 'installed' && automation.closed.value,
      );
    }
  };
  lockCards();
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
      minX: (LEVEL0_CHAIRS.x - CHAIR_STACK_HALF) * m,
      maxX: (LEVEL0_CHAIRS.x + CHAIR_STACK_HALF) * m,
      minZ: (LEVEL0_CHAIRS.z - CHAIR_STACK_HALF) * m,
      maxZ: (LEVEL0_CHAIRS.z + CHAIR_STACK_HALF) * m,
    },
  ];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: { ...LEVEL0_START, x: LEVEL0_START.x * m, z: LEVEL0_START.z * m },
    solids: () => [...walls, ...roomSolids, ...footprints],
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
    lockCards();
    walk.update(delta);
    room.parts.update(delta);
    mcc.update(delta);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    mcc.parts.dispose();
    room.parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { level0?: unknown }).level0;
  };
  (window as unknown as { level0: unknown }).level0 = {
    world: mcc.world,
    components: () =>
      mcc.components.map((device) => ({
        name: device.object.name,
        kind: device.kind,
        active: device.active.value,
        faulted: device.faulted.value,
        value: device.value.value,
      })),
    view: (x: number, z: number, yaw = 0) => walk.place(x * m, z * m, yaw, 0),
  };
  return Object.assign(dispose, {
    suspend() {
      mcc.parts.setAudible(false);
      room.parts.setAudible(false);
    },
    resume() {
      mcc.parts.setAudible(true);
      room.parts.setAudible(true);
    },
  });
}
