import { createRenderer, renderScale } from './render-style';
import {
  CubeCamera,
  DirectionalLight,
  Fog,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector2,
  WebGLCubeRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WALL_THICKNESS, devPortals } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { METRE } from '../game/units';
import { createPortals } from '../scene/portals';
import {
  HALL_LENGTH,
  HALL_STYLES,
  HALL_WIDTH,
  createIndustrialHall,
} from '../scene/industrial-hall';
import type { Hall } from '../scene/industrial-hall';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';

/**
 * Dev4, the Hall: the great enclosed concrete hall the game will take
 * place in, to try out the environment. Polished concrete reflects the
 * skylights and lamps (an environment map taken from the middle of the
 * hall), overcast daylight blooms white, and a faint haze gives the
 * distance depth. `?style=1` to `?style=5`, or the keys 1 to 5, choose
 * between its ceilings (see `src/scene/industrial-hall.ts`).
 */
export function startHallRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setClearColor('#d8dadb');
  scene.fog = new Fog('#d4d7d8', 45 * m, 260 * m);
  const camera = new PerspectiveCamera(60, 1, 0.05, 400 * m);
  // Overcast daylight from above, and the lamps' warm fill.
  const daylight = new HemisphereLight('#f4f7fa', '#77756f', 2.4);
  scene.add(daylight);
  const sun = new DirectionalLight('#eef2f6', 0.9);
  sun.position.set(-30 * m, 80 * m, 20 * m);
  scene.add(sun);
  const bounds: Footprint = {
    minX: -(HALL_LENGTH / 2 + WALL_THICKNESS / 2) * m,
    maxX: (HALL_LENGTH / 2 + WALL_THICKNESS / 2) * m,
    minZ: -(HALL_WIDTH / 2 + WALL_THICKNESS / 2) * m,
    maxZ: (HALL_WIDTH / 2 + WALL_THICKNESS / 2) * m,
  };
  const portals = createPortals('dev4', devPortals('dev4', bounds, m), 0, m);
  scene.add(portals.group);

  // The hall, and the reflections its floor shows.
  const pmrem = new PMREMGenerator(renderer);
  let hall: Hall | null = null;
  let environment: ReturnType<PMREMGenerator['fromCubemap']> | null = null;
  const params = new URLSearchParams(location.search);
  const build = (style: number) => {
    if (hall) {
      scene.remove(hall.group);
      hall.dispose();
    }
    hall = createIndustrialHall(style);
    hall.group.scale.setScalar(m);
    scene.add(hall.group);
    // Look round from the middle of the hall, once, for its reflections.
    const target = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
    const cube = new CubeCamera(0.1 * m, 400 * m, target);
    cube.position.set(0, 1.5 * m, 0);
    scene.environment = null;
    cube.update(renderer, scene);
    environment?.dispose();
    environment = pmrem.fromCubemap(target.texture);
    target.dispose();
    scene.environment = environment.texture;
    label.textContent = `${hall.number} · ${hall.name}`;
  };

  // Bloom, so the skylights and lamps glare.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.55, 0.6, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const label = document.createElement('div');
  Object.assign(label.style, {
    position: 'absolute',
    right: '16px',
    bottom: '16px',
    padding: '8px 14px',
    background: '#1c2422dd',
    color: '#f2efe4',
    font: 'bold 28px "Helvetica Neue", Helvetica, Arial, sans-serif',
  });
  canvas.parentElement?.append(label);
  const notes = document.createElement('div');
  notes.id = 'hall-notes';
  notes.textContent = `DEV4 · The Hall: ${HALL_STYLES.map((name, i) => `${i + 1} ${name}`).join(' · ')} · keys 1-${HALL_STYLES.length} choose · Portal: dev3, west wall · WASD: walk · Esc: cursor`;
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
  build(Number(params.get('style') ?? 1) || 1);

  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    fov: 60,
    start: portals.arrival(params.get('from')) ?? {
      x: -HALL_LENGTH * 0.35 * m,
      z: 10 * m,
      yaw: Math.PI / 2,
      pitch: 0.08,
    },
    solids: () =>
      (hall?.solids ?? []).map((s) => ({
        minX: s.minX * m,
        maxX: s.maxX * m,
        minZ: s.minZ * m,
        maxZ: s.maxZ * m,
      })),
    use: () => {},
  });
  let ps1 = false;
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = ps1 ? renderScale(width, height, true) : 1;
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    ps1Uniforms.resolution.value.set(w, h);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const onKey = (event: KeyboardEvent) => {
    if (canvas.parentElement?.hidden) return;
    const n = Number(event.key);
    if (n >= 1 && n <= HALL_STYLES.length) build(n);
    if (event.key === 'p' || event.key === 'P') {
      ps1 = !ps1;
      resize();
    }
  };
  window.addEventListener('keydown', onKey);
  (window as unknown as { devHall: unknown }).devHall = {
    style: (n: number) => build(n),
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
    composer.render();
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    window.removeEventListener('keydown', onKey);
    walk.dispose();
    portals.dispose();
    label.remove();
    notes.remove();
    hall?.dispose();
    environment?.dispose();
    pmrem.dispose();
    composer.dispose();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
