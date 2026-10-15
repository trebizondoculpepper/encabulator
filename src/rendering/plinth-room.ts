import {
  BoxGeometry,
  HemisphereLight,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { MeshStandardNodeMaterial, PMREMGenerator } from 'three/webgpu';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { devPortals, devWalls } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { METRE } from '../game/units';
import { PLINTHS, createPlinthTracker, spotlightLevels } from '../game/plinths';
import type { Arrival, ExhibitId } from '../game/plinths';
import { createPlinthDrones } from '../audio/plinth-drones';
import type { DroneKind } from '../audio/plinth-drones';
import { createPortals } from '../scene/portals';
import { EXHIBIT_CENTRE, createExhibit } from '../scene/plinth-exhibits';
import { createFirstPerson } from './first-person';
import { createNodePipeline, createNodeRenderer } from './node-pipeline';

/** The room's half width and depth, metres, and its height. */
const HALF = 22;
const HEIGHT = 9;
/** A spotlight at full, in candela (scaled for scene units). */
const SPOT_CANDELA = 520;
/** How quickly a spotlight follows its level, per second. */
const FADE_RATE = 2.5;

/**
 * Dev5, the plinths: a dark gallery with three plinths at the corners of
 * a triangle, about ten seconds' walk apart (`src/game/plinths.ts`), each
 * with a monumental exhibit turning slowly above it: a rhombus, a double
 * helix and a sphere (`src/scene/plinth-exhibits.ts`). Walk within 4 m of
 * one and its spotlight comes up while the others go down. Every arrival
 * is recorded with the plinth visited before it and every one before
 * that: the start of context-sensitive audio telling a (very dumb) story.
 * Drawn by WebGPURenderer with the Hall's node pipeline (global
 * illumination, reflections in the polished floor, bloom, TRAA).
 */
export function startPlinthRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createNodeRenderer(canvas);
  // At the screen's own resolution, not twice it: the room is dark and
  // soft, and at twice it a large display drew it at a few frames a
  // second, too slow to walk in.
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 1));
  renderer.setClearColor('#050506');
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(60, 1, 0.05, 200 * m);
  const materials: Material[] = [];

  // Hardly any light but the spots: a gallery after hours.
  scene.add(new HemisphereLight('#8a96a8', '#1a1612', 0.06));

  const bounds: Footprint = {
    minX: -HALF * m,
    maxX: HALF * m,
    minZ: -HALF * m,
    maxZ: HALF * m,
  };
  // Polished dark concrete that the reflections play in, charcoal walls,
  // a black ceiling.
  const floor = new MeshStandardNodeMaterial({
    color: '#3a3936',
    roughness: 0.12,
  });
  const wall = new MeshStandardNodeMaterial({
    color: '#26272a',
    roughness: 0.85,
  });
  const ceiling = new MeshStandardNodeMaterial({
    color: '#0c0c0d',
    roughness: 0.9,
  });
  materials.push(floor, wall, ceiling);
  const floorMesh = new Mesh(
    new PlaneGeometry(2 * HALF * m, 2 * HALF * m),
    floor,
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  const ceilingMesh = new Mesh(
    new PlaneGeometry(2 * HALF * m, 2 * HALF * m),
    ceiling,
  );
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT * m;
  scene.add(floorMesh, ceilingMesh);
  const roomMeshes: Mesh[] = [floorMesh, ceilingMesh];
  const walls = devWalls(bounds, m, HEIGHT * m);
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
    mesh.receiveShadow = true;
    scene.add(mesh);
    roomMeshes.push(mesh);
  }
  const portals = createPortals('dev5', devPortals('dev5', bounds, m), 0, m);
  scene.add(portals.group);

  // The plinths, their exhibits and a spotlight over each.
  const footprints: Footprint[] = [];
  const exhibits = PLINTHS.map((plinth) => {
    const exhibit = createExhibit(plinth.id);
    exhibit.group.scale.setScalar(m);
    exhibit.group.position.set(plinth.x * m, 0, plinth.z * m);
    scene.add(exhibit.group);
    footprints.push({
      minX: (plinth.x - 0.55) * m,
      maxX: (plinth.x + 0.55) * m,
      minZ: (plinth.z - 0.55) * m,
      maxZ: (plinth.z + 0.55) * m,
    });
    // From high up and a little towards the middle of the room, so the
    // light rakes the exhibit's face and throws its shadow outward.
    const inward = Math.hypot(plinth.x, plinth.z) || 1;
    const spot = new SpotLight('#fff1dc', 0, 0, 0.15, 0.6, 2);
    spot.position.set(
      (plinth.x - (plinth.x / inward) * 2.5) * m,
      (HEIGHT - 0.6) * m,
      (plinth.z - (plinth.z / inward) * 2.5) * m,
    );
    const target = new Object3D();
    target.position.set(plinth.x * m, EXHIBIT_CENTRE * m, plinth.z * m);
    spot.target = target;
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.camera.near = 1 * m;
    spot.shadow.camera.far = 20 * m;
    scene.add(spot, target);
    return { id: plinth.id, exhibit, spot, level: 0 };
  });

  // A quiet loop at each exhibit, heard only near it. Which sound goes with
  // which shape is arbitrary on purpose.
  const droneOf: Record<ExhibitId, DroneKind> = {
    rhombus: 'glass',
    helix: 'breath',
    sphere: 'throb',
  };
  const drones = createPlinthDrones(
    PLINTHS.map((p) => ({
      kind: droneOf[p.id],
      x: p.x,
      y: EXHIBIT_CENTRE,
      z: p.z,
    })),
  );
  const unlockSound = () => void drones.unlock();
  canvas.addEventListener('pointerdown', unlockSound);
  window.addEventListener('keydown', unlockSound);
  const facing = new Vector3();

  const tracker = createPlinthTracker();
  const arrivals: Arrival[] = [];
  const pipeline = createNodePipeline(renderer, scene, camera, m);
  pipeline.setGlobalIllumination(1.4);
  pipeline.setOcclusion(1);
  pipeline.setReflections(1);
  pipeline.setBloom(1.6);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const params = new URLSearchParams(location.search);
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    // From the middle of the room, all three plinths in view.
    overview: { x: 0, z: 19 * m, yaw: 0, pitch: -0.12 },
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ?? { x: 0, z: 14 * m, yaw: 0 },
    solids: () => [...walls, ...footprints],
    use: (x, y) => {
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const hit = raycaster.intersectObjects([...portals.uses.keys()], true)[0];
      if (hit) portals.uses.get(hit.object as Mesh)?.();
    },
  });

  const notes = document.createElement('div');
  notes.id = 'plinth-notes';
  notes.textContent =
    'DEV5 · Plinths: walk within 4 m of a plinth to light it and hear it · Portals: dev3 west, the Hall west · WASD: walk · Esc: cursor';
  Object.assign(notes.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: 'calc(100% - 24px)',
    padding: '10px',
    background: '#20302bdd',
    color: '#e8e2cc',
    font: '13px monospace',
  });
  canvas.parentElement?.append(notes);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  (window as unknown as { devPlinths: unknown }).devPlinths = {
    /** Stand with the eye at (x, y, z), looking at (tx, ty, tz), in metres. */
    view(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
      const dx = tx - x;
      const dz = tz - z;
      walk.place(
        x * m,
        z * m,
        Math.atan2(dx, -dz),
        Math.atan2(ty - y, Math.hypot(dx, dz)),
        y * m,
      );
    },
    /** Where the visitor stands, metres, and which way they face. */
    where: () => ({
      x: walk.walker.x / m,
      z: walk.walker.z / m,
      yaw: walk.walker.yaw,
    }),
    /** The plinth the visitor is at, and the one visited before it. */
    active: () => tracker.active(),
    previous: () => tracker.previous(),
    /** Whether the plinths' ambience is playing. */
    sound: () => drones.state(),
    /** Every arrival so far, with what came before each. */
    arrivals: () => structuredClone(arrivals),
    stats: () => ({
      calls: renderer.info.render.drawCalls,
      triangles: renderer.info.render.triangles,
    }),
  };

  let last = 0;
  const frame = (time: number) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    const { arrival, active } = tracker.update(
      walk.walker.x / m,
      walk.walker.z / m,
    );
    if (arrival) {
      arrivals.push(arrival);
      // Where the story's audio will be chosen, from `arrival`.
      window.dispatchEvent(
        new CustomEvent('plinth-arrival', { detail: arrival }),
      );
    }
    camera.getWorldDirection(facing);
    drones.listen(
      camera.position.x / m,
      camera.position.y / m,
      camera.position.z / m,
      facing.x,
      facing.y,
      facing.z,
    );
    const levels = spotlightLevels(active);
    const step = Math.min(1, delta * FADE_RATE);
    for (const entry of exhibits) {
      entry.level += (levels[entry.id as ExhibitId] - entry.level) * step;
      entry.spot.intensity = SPOT_CANDELA * m * m * entry.level;
      entry.exhibit.update(delta);
    }
    pipeline.render();
  };
  let running = true;
  let reflection: { dispose(): void } | null = null;
  void renderer.init().then(() => {
    if (!running) return;
    // A studio for the exhibits to reflect: gold needs something to be gold
    // in, and glass its highlights. Only they see it; the room stays dark.
    const pmrem = new PMREMGenerator(renderer);
    const studio = new RoomEnvironment();
    const target = pmrem.fromScene(studio, 0.04);
    studio.dispose();
    pmrem.dispose();
    reflection = target;
    for (const { exhibit } of exhibits)
      exhibit.setEnvironment(target.texture, 0.7);
    void renderer.setAnimationLoop(frame);
  });

  const dispose = () => {
    running = false;
    void renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    notes.remove();
    canvas.removeEventListener('pointerdown', unlockSound);
    window.removeEventListener('keydown', unlockSound);
    drones.dispose();
    for (const { exhibit } of exhibits) exhibit.dispose();
    for (const mesh of roomMeshes) mesh.geometry.dispose();
    for (const material of materials) material.dispose();
    reflection?.dispose();
    pipeline.dispose();
    void renderer.dispose();
  };
  return Object.assign(dispose, {
    suspend: () => drones.setVisible(false),
    resume: () => drones.setVisible(true),
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
