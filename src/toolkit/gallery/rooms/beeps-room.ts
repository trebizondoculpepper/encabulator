import { computed } from '@preact/signals-core';
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SpotLight,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import {
  COMPUTER_CUES,
  computerCueSound,
} from '../../components/sound/audio/computer-cues';
import { partAudio } from '../../components/core/audio/part-audio';
import { createComputerCueSelector } from '../logic/computer-cue-selector';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -7, maxX: 7, minZ: -5, maxZ: 5 };
const CEILING = 3.2;
const HALF_WIDTH = 0.8;
const HALF_DEPTH = 0.35;

/** Dev13: one central panel selects a computer cue that repeats every 5 s. */
export function startBeepsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.3));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.4));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();

  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#585c5e'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2a2c30'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#38423f');
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const sign = createSectionBoard(kit, 'COMPUTER BEEPS & BLOOPS', 4.1);
  sign.position.set(-2.05, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // One freestanding listening console, facing the approach from the south.
  const casePaint = kitPaint(kit, '#3d4247', 0.3);
  const panelPaint = kitPaint(kit, '#72777b', 0.2);
  const speakerPaint = kitPaint(kit, '#151719');
  const grillePaint = kitPaint(kit, '#b5b8ba', 0.7);
  const console = new Group();
  room.add(console);
  const body = new Mesh(new BoxGeometry(1.35, 1.0, 0.55), casePaint);
  body.position.y = 0.5;
  console.add(body);
  const panel = new Group();
  panel.position.set(0, 1.32, 0.12);
  panel.rotation.x = -0.28;
  console.add(panel);
  const plate = new Mesh(new BoxGeometry(1.5, 0.94, 0.035), panelPaint);
  plate.position.z = -0.018;
  panel.add(plate);
  const heading = createMicroLabel(kit, 'COMPUTER BEEPS & BLOOPS', {
    height: 0.019,
    ink: '#17191b',
    maxWidth: 1.2,
  });
  heading.position.set(0, 0.395, 0.002);
  panel.add(heading);
  const instruction = createMicroLabel(
    kit,
    'SELECT ONE · REPEATS EVERY 5 SECONDS',
    {
      height: 0.009,
      ink: '#222528',
      maxWidth: 1.2,
    },
  );
  instruction.position.set(0, -0.395, 0.002);
  panel.add(instruction);
  const speaker = new Group();
  speaker.position.set(0, 0.78, 0.277);
  console.add(speaker);
  speaker.add(new Mesh(new CircleGeometry(0.1, 32), speakerPaint));
  for (const r of [0.03, 0.06, 0.09]) {
    const ring = new Mesh(new TorusGeometry(r, 0.002, 5, 40), grillePaint);
    ring.position.z = 0.005;
    speaker.add(ring);
  }
  const selector = createComputerCueSelector(COMPUTER_CUES.length, (index) => {
    partAudio.play(computerCueSound(COMPUTER_CUES[index]), speaker);
  });
  for (const [i, cue] of COMPUTER_CUES.entries()) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = -0.54 + col * 0.36;
    const y = 0.225 - row * 0.235;
    const button = parts.add(
      pushButton(kit, {
        colour: 'green',
        head: 'illuminated',
        lamp: computed(() => selector.selected.value === i),
        name: `${i + 1} ${cue.name} select`,
        action: () => selector.select(i),
      }),
    );
    button.object.position.set(x, y, 0.004);
    panel.add(button.object);
    const label = createMicroLabel(kit, `${i + 1} ${cue.name}`, {
      height: 0.008,
      ink: '#1c1d1e',
      maxWidth: 0.32,
    });
    label.position.set(x, y - 0.065, 0.002);
    panel.add(label);
  }
  const spot = new SpotLight('#fff3e2', 16 * m * m, 0, 0.5, 0.6, 2);
  spot.position.set(0, (CEILING - 0.1) * m, 1.1 * m);
  spot.target.position.set(0, 1.2 * m, 0);
  scene.add(spot, spot.target);
  room.updateMatrixWorld(true);

  const portals = createPortals('dev13', devPortals('dev13', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([room, portals.group], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = parts.uses.get(o);
      if (work) return () => work();
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number; y?: number }
  > = { room: { x: 0, z: 2.2 * m, yaw: 0, pitch: -0.1 } };
  for (let i = 1; i <= COMPUTER_CUES.length; i++) views[String(i)] = views.room;
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
      {
        minX: -HALF_WIDTH * m,
        maxX: HALF_WIDTH * m,
        minZ: -HALF_DEPTH * m,
        maxZ: HALF_DEPTH * m,
      },
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const go = (pose: (typeof views)[string]) =>
    walk.place(
      pose.x,
      pose.z,
      pose.yaw,
      pose.pitch,
      pose.y === undefined ? undefined : pose.y * m,
    );
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
  (window as unknown as { devBeeps: unknown }).devBeeps = {
    use: (x: number, y: number) => usableAt(x, y)?.(),
    view(name: string) {
      const pose = views[name];
      if (pose) go(pose);
    },
    select: (n: number) => selector.select(n - 1),
    selected: () =>
      selector.selected.value === null ? null : selector.selected.value + 1,
    cues: () => COMPUTER_CUES.map((cue, i) => `${i + 1} ${cue.id}`),
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
    selector.step(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devBeeps?: unknown }).devBeeps;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        go(view);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
