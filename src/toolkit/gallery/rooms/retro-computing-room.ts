import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { METRE } from '../../components/core/logic/units';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createSectionBoard } from '../../components/core/views/signage';
import { bbcWorkstation } from '../../components/industrial-control/parts/bbc-workstation';
import { bbcImportedWorkstation } from '../../components/industrial-control/parts/bbc-imported-workstation';
import { createFirstPerson } from '../../controls/input/first-person';
import type { Footprint } from '../../controls/logic/walk-collision';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { createPortals } from '../views/portals';

const FLOOR = { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };
const CEILING = 3.2;

/** Dev19: the original VX3 BBC workstation, ready for future retro exhibits. */
export function startRetroComputingRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#b6b8ae');
  const camera = new PerspectiveCamera(58, 1, 0.05, 80 * m);
  scene.add(
    new AmbientLight('#ede9dc', 0.55),
    new HemisphereLight('#f3f1e6', '#676761', 0.8),
  );
  const light = new PointLight('#fff0d5', 24 * m * m, 12 * m, 2);
  light.position.set(0, 2.8 * m, 0.5 * m);
  scene.add(light);
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const floor = new Mesh(new PlaneGeometry(10, 8), kitPaint(kit, '#77786c'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(10, 8), kitPaint(kit, '#e6e3d6'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const walls = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#c7c9b8');
  for (const wall of walls) {
    const mesh = new Mesh(
      new BoxGeometry(
        wall.maxX - wall.minX,
        wall.top - wall.bottom,
        wall.maxZ - wall.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (wall.minX + wall.maxX) / 2,
      (wall.bottom + wall.top) / 2,
      (wall.minZ + wall.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const sign = createSectionBoard(kit, 'RETRO COMPUTING', 3.2);
  sign.position.set(-1.6, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);
  const parts = createPartSet();
  const exhibit = parts.add(bbcWorkstation(kit));
  exhibit.object.position.set(0, 0, -0.7);
  exhibit.object.rotation.y = -0.15;
  room.add(exhibit.object);
  // Gallery controls sit on each desk; the actual computer rockers work too.
  const powerPanel = (station: ReturnType<typeof bbcWorkstation>) => {
    const panel = new Group();
    panel.position.set(-0.43, station.view.top + 0.01, 0.23);
    panel.rotation.x = -Math.PI / 2;
    station.object.add(panel);
    const sheet = new Mesh(
      new BoxGeometry(0.18, 0.15, 0.008),
      kitPaint(kit, '#d9dacd'),
    );
    panel.add(sheet);
    const power = parts.add(
      pushButton(kit, {
        name: 'BBC exhibit power',
        colour: 'green',
        head: 'illuminated',
        lamp: station.model.power.state,
        action: station.model.power.flip,
      }),
    );
    power.object.position.set(0, -0.015, 0.005);
    panel.add(power.object);
    const label = createMicroLabel(kit, 'EXHIBIT POWER', {
      height: 0.006,
      ink: '#202520',
      maxWidth: 0.16,
    });
    label.position.set(0, 0.045, 0.006);
    panel.add(label);
  };
  powerPanel(exhibit);
  const plaque = new Mesh(
    new BoxGeometry(1.05, 0.48, 0.025),
    kitPaint(kit, '#e8e5d8'),
  );
  plaque.position.set(-1.5, 1.25, -0.7);
  plaque.rotation.y = 0.15;
  room.add(plaque);
  const plaquePost = new Mesh(
    new BoxGeometry(0.035, 1.05, 0.035),
    kitPaint(kit, '#3c453e'),
  );
  plaquePost.position.set(-1.5, 0.525, -0.72);
  const plaqueFoot = new Mesh(
    new BoxGeometry(0.35, 0.025, 0.28),
    kitPaint(kit, '#3c453e'),
  );
  plaqueFoot.position.set(-1.5, 0.0125, -0.72);
  room.add(plaquePost, plaqueFoot);
  const caption = createMicroLabel(
    kit,
    'BBC MICRO MODEL B\n\nMicrovitec Cub colour monitor\nExternal 5 1/4-inch floppy drive\nOriginal VX3 desk and office chair\n\nPower on to load the demonstration.',
    { height: 0.018, maxWidth: 0.95, ink: '#1d302c' },
  );
  caption.position.z = 0.014;
  plaque.add(caption);
  room.updateMatrixWorld(true);
  const footprint = (box: Box3) => ({
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  });
  const deskHalf = exhibit.view.width / 2;
  const deskDepth = exhibit.view.depth / 2;
  const deskBox = new Box3().setFromPoints(
    [
      [-deskHalf, -deskDepth],
      [deskHalf, -deskDepth],
      [-deskHalf, deskDepth],
      [deskHalf, deskDepth],
    ].map(([x, z]) => exhibit.object.localToWorld(new Vector3(x, 0, z))),
  );
  const solids = [footprint(deskBox)];
  let disposed = false;
  let candidate: Awaited<ReturnType<typeof bbcImportedWorkstation>> = null;
  let audible = true;
  void bbcImportedWorkstation(kit)
    .then((loaded) => {
      if (!loaded) return;
      if (disposed) {
        loaded.dispose();
        return;
      }
      candidate = parts.add(loaded);
      candidate.setAudible(audible);
      candidate.object.position.set(2.3, 0, -0.7);
      candidate.onSit((pose) =>
        walk.place(pose.x, pose.z, pose.yaw, pose.pitch, pose.y),
      );
      candidate.object.rotation.y = -0.15;
      room.add(candidate.object);
      powerPanel(candidate);
      if (
        import.meta.env.DEV &&
        new URLSearchParams(location.search).get('view') === 'boot'
      )
        candidate.model.power.flip();
      const tag = createMicroLabel(kit, 'ANT MERCER / VIRTUALBEEB', {
        height: 0.008,
        ink: '#1d302c',
        maxWidth: 1,
      });
      tag.position.set(
        0,
        candidate.view.top - 0.04,
        candidate.view.depth / 2 + 0.002,
      );
      candidate.object.add(tag);
      room.updateMatrixWorld(true);
      const box = new Box3().setFromPoints(
        [
          [-deskHalf, -deskDepth],
          [deskHalf, -deskDepth],
          [-deskHalf, deskDepth],
          [deskHalf, deskDepth],
        ].map(([x, z]) => candidate!.object.localToWorld(new Vector3(x, 0, z))),
      );
      solids.push(footprint(box));
    })
    .catch((error: unknown) =>
      console.error('BBC comparison model could not load', error),
    );
  const portals = createPortals('dev19', devPortals('dev19', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([room, portals.group], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    ) {
      const travel = portals.uses.get(object as Mesh);
      if (travel) return travel;
      const work = parts.uses.get(object);
      if (work) return work;
    }
    return null;
  };
  const views = {
    power: { x: 1.84 * m, z: -0.1 * m, yaw: 0, pitch: -0.64, y: 1.2 * m },
    boot: { x: 1.85 * m, z: 0.45 * m, yaw: 0.48, pitch: -0.1, y: 1.18 * m },
    room: { x: 1.3 * m, z: 2.5 * m, yaw: 0, pitch: -0.18 },
    candidate: {
      x: 1.85 * m,
      z: 0.45 * m,
      yaw: 0.48,
      pitch: -0.1,
      y: 1.18 * m,
    },
    computer: {
      x: -0.45 * m,
      z: 0.45 * m,
      yaw: 0.48,
      pitch: -0.1,
      y: 1.18 * m,
    },
    rear: { x: -0.6 * m, z: -1.8 * m, yaw: 2.65, pitch: -0.3 },
  };
  type ViewName = keyof typeof views;
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') as ViewName] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [...walls, ...solids],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  exhibit.onSit((pose) =>
    walk.place(pose.x, pose.z, pose.yaw, pose.pitch, pose.y),
  );
  const go = (name: string) => {
    const pose = views[name as ViewName];
    if (pose)
      walk.place(
        pose.x,
        pose.z,
        pose.yaw,
        pose.pitch,
        'y' in pose ? pose.y : undefined,
      );
  };
  if (params.get('view')) go(params.get('view')!);
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
  (window as unknown as { devRetroComputing: unknown }).devRetroComputing = {
    model: exhibit.model,
    candidate: () => candidate?.model,
    view: go,
    power: () => exhibit.model.power.flip(),
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
    parts.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devRetroComputing?: unknown })
      .devRetroComputing;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view = new URLSearchParams(location.search).get('view');
      if (view && view in views) {
        go(view);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => {
      audible = false;
      parts.setAudible(false);
    },
    resume: () => {
      audible = true;
      parts.setAudible(true);
    },
  });
}
