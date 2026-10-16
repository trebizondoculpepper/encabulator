import {
  AmbientLight,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
} from 'three';
import { devPortals, devWalls } from '../game/dev-room-links';
import { CEILING, TRAINING_BOUNDS } from '../game/training-room-plan';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { createCanvasTexture } from '../scene/screens';
import { createTrainingRoom } from '../scene/training-room';
import { seeded } from '../scene/worn-paint';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** A grey English sky: low, even overcast with darker cloud in it. */
function createSky(radius: number) {
  const { context: c, texture } = createCanvasTexture(1024, 512);
  const random = seeded(42);
  const gradient = c.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#9da3a8');
  gradient.addColorStop(0.45, '#c3c7c9');
  gradient.addColorStop(0.5, '#cfd2d2');
  gradient.addColorStop(1, '#8e9188');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 260; i++) {
    const x = random() * 1024;
    const y = 40 + random() * 210;
    const r = 20 + random() * 70;
    const tone = 150 + Math.floor(random() * 60);
    const blob = c.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, `rgba(${tone},${tone + 3},${tone + 6},0.25)`);
    blob.addColorStop(1, `rgba(${tone},${tone + 3},${tone + 6},0)`);
    c.fillStyle = blob;
    c.beginPath();
    c.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  texture.needsUpdate = true;
  const material = new MeshBasicMaterial({
    map: texture,
    side: 1,
    fog: false,
    depthWrite: false,
  });
  const sky = new Mesh(new SphereGeometry(radius, 32, 16), material);
  sky.renderOrder = -1;
  return {
    sky,
    dispose() {
      sky.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

/** The training room: an English business-park meeting room on a grey day. */
export function startTrainingRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);
  renderer.setClearColor('#c3c7c9');
  scene.fog = new Fog('#bfc3c4', 40 * m, 260 * m);
  const camera = new PerspectiveCamera(62, 1, 0.05, 500 * m);
  const sky = createSky(400 * m);
  scene.add(sky.sky);
  // Overcast daylight from everywhere, a little more from the south.
  scene.add(new HemisphereLight('#d9dee2', '#6d6a5f', 1.1));
  scene.add(new AmbientLight('#eef0ea', 0.35));
  const day = new DirectionalLight('#e4e8eb', 0.7);
  day.position.set(3, 6, 8);
  scene.add(day);
  const kit = createPanelKit();
  const room = createTrainingRoom(kit);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  // The fluorescent fittings, lit two to a light to keep it cheap.
  for (const { x, y, z } of room.lights.filter((_, i) => i % 2 === 0)) {
    const light = new PointLight('#f3f5ee', 0.9 * m * m, 7 * m);
    light.position.set(x * m, (y - 0.2) * m, (z + 0.6) * m);
    scene.add(light);
  }
  const bounds: Footprint = {
    minX: TRAINING_BOUNDS.minX * m,
    maxX: TRAINING_BOUNDS.maxX * m,
    minZ: TRAINING_BOUNDS.minZ * m,
    maxZ: TRAINING_BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const portals = createPortals(
    'training',
    devPortals('training', bounds, m),
    0,
    m,
  );
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    // Facing the whiteboard from the back of the room.
    room: { x: 4.5 * m, z: 0, yaw: -Math.PI / 2, pitch: 0 },
    // Looking out over the car park from the south-east corner.
    windows: { x: 3 * m, z: 2.5 * m, yaw: Math.PI * 0.82, pitch: -0.05 },
    door: { x: -2 * m, z: 2.5 * m, yaw: -0.4, pitch: 0 },
    ceiling: { x: 0, z: 0, yaw: 0, pitch: 0.9 },
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
    solids: () => [
      ...outer,
      ...room.solids.map((piece) => ({
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
  (window as unknown as { devTraining: unknown }).devTraining = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
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
    room.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    sky.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devTraining?: unknown }).devTraining;
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
