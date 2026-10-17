import {
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PointLight,
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
export function startWarehouseRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setClearColor('#cbd3d6');
  renderer.shadowMap.enabled = true;
  const freeEnvironment = useEnvironment(renderer, scene, 0.32);
  const camera = new PerspectiveCamera(65, 1, 0.05, 100 * m);
  scene.add(
    new HemisphereLight('#e1e9ec', '#6f7067', 0.85),
    new AmbientLight('#e9ece5', 0.3),
  );
  const daylight = new DirectionalLight('#edf3f5', 1.3);
  daylight.position.set(7 * m, 24 * m, 5 * m);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(2048, 2048);
  Object.assign(daylight.shadow.camera, {
    left: -22 * m,
    right: 22 * m,
    top: 22 * m,
    bottom: -22 * m,
    near: m,
    far: 60 * m,
  });
  daylight.shadow.bias = -0.00015;
  daylight.shadow.normalBias = 0.02 * m;
  daylight.shadow.radius = 4;
  scene.add(daylight);
  const kit = createPanelKit();
  const room = createWarehouseTrainingRoom(kit);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  // Broad, overlapping pools from the high suspended fittings.
  for (const { x, y, z } of room.lights) {
    const light = new PointLight('#f2f3e9', 8 * m * m, 13 * m, 2);
    light.position.set(x * m, y * m, z * m);
    scene.add(light);
  }
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
  const portals = createPortals('dev17', devPortals('dev17', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster(),
    pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(portals.group, true)[0];
    for (let o: Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh);
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
    floor: { x: 0, z: 6 * m, yaw: 0, pitch: -0.65 },
  };
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
    portals.update(delta, walk.walker.x, walk.walker.z);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devWarehouse?: unknown }).devWarehouse;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose =
        views[new URLSearchParams(location.search).get('view') ?? ''] ??
        portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
