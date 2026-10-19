import {
  AmbientLight,
  DirectionalLight,
  Fog,
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
import type { Group, Object3D } from 'three';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createCanvasTexture } from '../../components/core/views/screens';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import { partAudio } from '../../components/core/audio/part-audio';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  RECEPTION_BOUNDS,
  RECEPTION_CEILING,
  RECEPTION_VIEWS,
  createReception,
} from './reception';

/** A grey English sky: an even overcast, lighter towards the horizon. */
function createSky(radius: number) {
  const { context: c, texture } = createCanvasTexture(16, 256);
  const gradient = c.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#9da3a8');
  gradient.addColorStop(0.48, '#cfd2d2');
  gradient.addColorStop(0.52, '#c9ccca');
  gradient.addColorStop(1, '#8e9188');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 16, 256);
  texture.needsUpdate = true;
  const material = new MeshBasicMaterial({
    map: texture,
    side: 1,
    fog: false,
    depthWrite: false,
  });
  const sky = new Mesh(new SphereGeometry(radius, 24, 12), material);
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

/**
 * dev23, the Reception (`./reception.ts`): the office's front of house,
 * a late-1990s fit-out still in use, looking out through its automatic
 * doors onto the trading estate; its spring door leads to the corridor.
 */
export function startReceptionRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);
  renderer.setClearColor('#c3c7c9');
  scene.fog = new Fog('#bfc3c4', 60 * m, 300 * m);
  const camera = new PerspectiveCamera(62, 1, 0.05, 500 * m);
  const sky = createSky(400 * m);
  scene.add(sky.sky);
  // Overcast daylight, most of it from the glazed east.
  scene.add(new HemisphereLight('#d9dee2', '#5f6a66', 0.9));
  scene.add(new AmbientLight('#eef0ea', 0.3));
  const day = new DirectionalLight('#e4e8eb', 0.6);
  day.position.set(8, 6, 2);
  scene.add(day);
  const kit = createPanelKit();
  const room = createReception(kit);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  // The fittings, every other one lit by a real light.
  for (const { x, y, z } of room.lights.filter((_, i) => i % 2 === 0)) {
    const light = new PointLight('#f3f5ee', 0.8 * m * m, 7 * m);
    light.position.set(x * m, (y - 0.2) * m, z * m);
    scene.add(light);
  }
  const bounds: Footprint = {
    minX: RECEPTION_BOUNDS.minX * m,
    maxX: RECEPTION_BOUNDS.maxX * m,
    minZ: RECEPTION_BOUNDS.minZ * m,
    maxZ: RECEPTION_BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, RECEPTION_CEILING * m);
  const solids = room.solids.map((s) => ({
    minX: s.minX * m,
    maxX: s.maxX * m,
    minZ: s.minZ * m,
    maxZ: s.maxZ * m,
  }));
  const portals = createPortals('dev23', devPortals('dev23', bounds, m), 0, m);
  scene.add(portals.group);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [portals.group, room.group],
      true,
    )[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = room.parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views = Object.fromEntries(
    Object.entries(RECEPTION_VIEWS).map(([name, v]) => [
      name,
      { ...v, x: v.x * m, z: v.z * m },
    ]),
  );
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.entrance,
    solids: () => [...outer, ...solids],
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
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    room.update(delta, walk.walker.x / m, walk.walker.z / m);
    camera.updateMatrixWorld();
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });

  // Development only: these bind no input.
  (window as unknown as { devReception: unknown }).devReception = {
    /** Stand at a named view: entrance, desk, behind, waiting, upstairs, outside, room. */
    view(name: string) {
      const v = views[name];
      if (v) walk.place(v.x, v.z, v.yaw, v.pitch);
    },
    views: () => Object.keys(views),
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** How far the sliding doors are open, 0 to 1. */
    doors: () => room.entrance.open,
    /** Use whatever is at (x, y) on the screen (−1 to 1), as a use would. */
    use: (x = 0, y = 0) => usableAt(x, y)?.(),
    stats: () => ({ ...renderer.info.render }),
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    room.dispose();
    disposeKit(kit, scene as unknown as Group);
    sky.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devReception?: unknown }).devReception;
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
