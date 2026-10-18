import { addWarehouseLighting } from './warehouse-lighting';
import { partAudio } from '../audio/part-audio';
import {
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../game/dev-room-links';
import { METRE } from '../game/units';
import { WAREHOUSE_BOUNDS, WAREHOUSE_ROOF } from '../game/warehouse-room-plan';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { createWarehouseTrainingRoom } from '../scene/warehouse-training-room';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** Dev17 previews the empty architectural shell for a future training scenario. */
export function startArchitecturalGalleryRoom(canvas: HTMLCanvasElement) {
  return startWarehouseRoom(canvas, true);
}
export function startWarehouseRoom(canvas: HTMLCanvasElement, gallery = false) {
  const id = gallery ? 'dev18' : 'dev17';
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setClearColor('#cbd3d6');
  renderer.shadowMap.enabled = true;
  const freeEnvironment = useEnvironment(renderer, scene, 0.32);
  const camera = new PerspectiveCamera(65, 1, 0.05, 100 * m);
  const kit = createPanelKit();
  const room = createWarehouseTrainingRoom(kit, gallery);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  addWarehouseLighting(scene, room.lights, m);
  const bounds = {
    minX: WAREHOUSE_BOUNDS.minX * m,
    maxX: WAREHOUSE_BOUNDS.maxX * m,
    minZ: WAREHOUSE_BOUNDS.minZ * m,
    maxZ: WAREHOUSE_BOUNDS.maxZ * m,
  };
  const walls = devWalls(bounds, m, WAREHOUSE_ROOF * m);
  const solids = room.solids.map((s) => ({
    minX: s.minX * m,
    maxX: s.maxX * m,
    minZ: s.minZ * m,
    maxZ: s.maxZ * m,
  }));
  const portals = createPortals(id, devPortals(id, bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster(),
    pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [portals.group, ...room.fittings],
      true,
    )[0];
    for (let o: Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh) ?? room.parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 10 * m, z: 11 * m, yaw: -0.55, pitch: 0.13 },
    doors: { x: -6 * m, z: 5 * m, yaw: -Math.PI / 2 + 0.45, pitch: 0.12 },
    roof: { x: 0, z: 5 * m, yaw: 0, pitch: 0.65 },
    utilities: { x: 0, z: -7 * m, yaw: 0, pitch: 0.08 },
    gallery: { x: -7.5 * m, z: 11 * m, yaw: Math.PI, pitch: 0 },
    hardware: { x: 4.5 * m, z: 12 * m, yaw: Math.PI, pitch: -0.1 },
    distribution: { x: 10 * m, z: -12.5 * m, yaw: 0, pitch: 0.03 },
    floor: { x: 0, z: 6 * m, yaw: 0, pitch: -0.65 },
  };
  if (gallery) views.room = { ...views.gallery };
  for (const view of Object.values(views)) {
    const x = view.x;
    view.x = view.z;
    view.z = -x;
    view.yaw -= Math.PI / 2;
  }
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [...walls, ...solids],
    use: (x, y) => portalAt(x, y)?.(),
    aimed: () => Boolean(portalAt(0, 0)),
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
  (window as unknown as { devWarehouse: unknown }).devWarehouse = {
    view(name: string) {
      const p = views[name];
      if (p) walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    stats: () => ({ ...renderer.info.render }),
  };
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
    partAudio.listen(camera, m);
    portals.update(delta, walk.walker.x, walk.walker.z);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    room.parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devWarehouse?: unknown }).devWarehouse;
  };
  return Object.assign(dispose, {
    suspend() {
      room.parts.setAudible(false);
    },
    resume() {
      room.parts.setAudible(true);
    },
    enter(previous: string | null) {
      const pose =
        views[new URLSearchParams(location.search).get('view') ?? ''] ??
        portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
