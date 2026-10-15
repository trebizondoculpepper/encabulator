import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import { CORRIDOR_BOUNDS } from '../game/corridor-plan';
import { devPortals, devWalls } from '../game/dev-room-links';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import {
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { createUndergroundCorridor } from '../scene/underground-corridor';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** Dev7: a walkable dogleg of service passages and connected plant spaces. */
export function startCorridorRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.25);
  renderer.setClearColor('#c1c3be');
  const camera = new PerspectiveCamera(62, 1, 0.05, 90 * m);
  scene.add(new AmbientLight('#e9ece9', 1.15));
  const key = new DirectionalLight('#fafaf3', 0.8);
  key.position.set(1, 8, 2);
  scene.add(key);
  const kit = createPanelKit();
  const corridor = createUndergroundCorridor(kit);
  corridor.group.scale.setScalar(m);
  scene.add(corridor.group);
  for (const { x, z } of corridor.lights.filter((_, i) => i % 3 === 0)) {
    const light = new PointLight('#f7f8ef', 3.4, 8 * m);
    light.position.set(x * m, 2.38 * m, z * m);
    scene.add(light);
  }
  const bounds: Footprint = {
    minX: CORRIDOR_BOUNDS.minX * m,
    maxX: CORRIDOR_BOUNDS.maxX * m,
    minZ: CORRIDOR_BOUNDS.minZ * m,
    maxZ: CORRIDOR_BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, 2.78 * m);
  const wallMaterial = kitPaint(kit, '#d8d9d2');
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallMaterial,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const portals = createPortals('dev7', devPortals('dev7', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const params = new URLSearchParams(location.search);
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    entry: { x: -8.5 * m, z: 8 * m, yaw: 0, pitch: 0 },
    dogleg: { x: -8.5 * m, z: 3.5 * m, yaw: Math.PI / 2, pitch: 0 },
    junction: { x: 8.5 * m, z: -3.5 * m, yaw: -Math.PI / 2, pitch: 0 },
    lockers: { x: -3 * m, z: 7.5 * m, yaw: Math.PI, pitch: 0 },
    lift: { x: -1.5 * m, z: -6.8 * m, yaw: 0, pitch: 0 },
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.entry,
    solids: () => [
      ...outer,
      ...corridor.solids.map((piece) => ({
        minX: piece.minX * m,
        maxX: piece.maxX * m,
        minZ: piece.minZ * m,
        maxZ: piece.maxZ * m,
      })),
    ],
    use: (x, y) => {
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const hit = raycaster.intersectObjects([...portals.uses.keys()], true)[0];
      if (hit) portals.uses.get(hit.object as Mesh)?.();
    },
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
  (window as unknown as { devCorridor: unknown }).devCorridor = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
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
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devCorridor?: unknown }).devCorridor;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
