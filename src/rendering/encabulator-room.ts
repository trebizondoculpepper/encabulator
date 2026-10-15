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
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { METRE } from '../game/units';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import {
  createRetroEncabulatorMcc,
  MCC_DEPTH,
  MCC_WIDTH,
} from '../scene/retro-encabulator-mcc';
import { createFirstPerson } from './first-person';
import { createPs1Material, ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** Dev6 displays the credible electrical control system behind the fiction. */
export function startEncabulatorRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const half = { x: 6, z: 5 };
  const bounds: Footprint = {
    minX: -half.x * m,
    maxX: half.x * m,
    minZ: -half.z * m,
    maxZ: half.z * m,
  };
  const height = 3.3;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.3);
  renderer.setClearColor('#a8aaa3');
  const camera = new PerspectiveCamera(55, 1, 0.05, 40 * m);
  scene.add(new AmbientLight('#e6e9e8', 1.25));
  const key = new DirectionalLight('#f0f2ef', 1.3);
  key.position.set(0, 5, 4);
  scene.add(key);
  const floor = createPs1Material({ color: '#777975' });
  const wall = createPs1Material({ color: '#c7c8bc' });
  const ceiling = createPs1Material({ color: '#d4d5cf' });
  const steel = createPs1Material({ color: '#9c9f9a', metalness: 0.5 });
  const black = createPs1Material({ color: '#343638' });
  const light = createPs1Material({ color: '#e9ebde' }, true, true);
  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = steel,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w * m, h * m, d * m), material);
    mesh.position.set(x * m, y * m, z * m);
    scene.add(mesh);
    return mesh;
  };
  slab(12, 0.1, 10, 0, -0.05, 0, floor);
  slab(12, 0.08, 10, 0, height + 0.04, 0, ceiling);
  const walls = devWalls(bounds, m, height * m);
  for (const piece of walls) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wall,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const portals = createPortals('dev6', devPortals('dev6', bounds, m), 0, m);
  scene.add(portals.group);
  // Ordinary electrical-room fixtures: fluorescent troffers, conduit and tray.
  for (const x of [-3, 0, 3]) {
    slab(1.2, 0.04, 0.32, x, height - 0.08, -0.5, black);
    slab(1.1, 0.01, 0.24, x, height - 0.103, -0.5, light);
    const lamp = new PointLight('#efeee1', 8, 6 * m);
    lamp.position.set(x * m, (height - 0.14) * m, -0.5 * m);
    scene.add(lamp);
  }
  slab(4.5, 0.12, 0.35, 0, 2.88, -4.72, steel);
  for (const x of [-1.8, 0, 1.8])
    slab(0.025, 0.35, 0.025, x, 3.08, -4.72, steel);
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit);
  mcc.group.scale.setScalar(m);
  mcc.group.position.set(0, 0, -3.8 * m);
  scene.add(mcc.group);
  // A small utility enclosure beside the MCC and surface conduit to it.
  slab(0.46, 1.45, 0.3, 3.1, 0.83, -4.25, steel);
  slab(0.02, 1.43, 0.28, 3.34, 0.83, -4.25, black);
  slab(0.08, 0.04, 0.06, 3.35, 1.03, -4.08, black);
  slab(0.04, 0.42, 0.04, 2.9, 2.38, -4.62, steel);
  const footprints: Footprint[] = [
    {
      minX: (-MCC_WIDTH / 2 - 0.1) * m,
      maxX: (MCC_WIDTH / 2 + 0.1) * m,
      minZ: (-3.8 - MCC_DEPTH - 0.08) * m,
      maxZ: -3.72 * m,
    },
    { minX: 2.84 * m, maxX: 3.38 * m, minZ: -4.46 * m, maxZ: -4.03 * m },
  ];
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const use = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, mcc.group], true)[0];
    if (!hit || hit.distance > 3.2 * m) return;
    let object: Object3D | null = hit.object;
    while (object) {
      if (portals.uses.has(object as Mesh)) {
        portals.uses.get(object as Mesh)?.();
        return;
      }
      if (mcc.doors.has(object)) {
        mcc.doors.get(object)?.();
        return;
      }
      object = object.parent;
    }
  };
  const params = new URLSearchParams(location.search);
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    lineup: { x: 0, z: 1.0 * m, yaw: 0, pitch: 0.05 },
    controls: { x: 0, z: -1.2 * m, yaw: 0, pitch: 0 },
    plc: { x: 0.7 * m, z: -1.9 * m, yaw: 0, pitch: 0 },
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.lineup,
    solids: () => [...walls, ...footprints],
    use,
  });
  const resize = () => {
    const { width, height: tall } = canvas.getBoundingClientRect();
    if (!width || !tall) return;
    renderer.setSize(Math.round(width), Math.round(tall), false);
    ps1Uniforms.resolution.value.set(width, tall);
    camera.aspect = width / tall;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  (window as unknown as { devEncabulator: unknown }).devEncabulator = {
    openAll: mcc.openAll,
    doors: () => mcc.doors.size,
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
    mcc.update(delta);
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
    for (const material of [floor, wall, ceiling, steel, black, light])
      material.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devEncabulator?: unknown }).devEncabulator;
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
