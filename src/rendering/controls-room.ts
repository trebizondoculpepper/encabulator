import {
  createRenderer,
  realistic,
  renderScale,
  useEnvironment,
} from './render-style';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import type { PartEvent } from '../game/world/components';
import { METRE } from '../game/units';
import { createPortals } from '../scene/portals';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { knobDirection } from '../scene/rotary-knob';
import { createControlSounds } from '../audio/control-sounds';
import type { ControlSound, ControlSounds } from '../audio/control-sounds';
import { createPartLoops } from '../audio/part-loops';
import { createFirstPerson } from './first-person';
import { createPs1Material, ps1Uniforms } from './ps1-material';
import { createControlsBoard, createDisplaysBoard } from './test-boards';
import type { TestFitting } from './test-boards';
import { createPedestals, PEDESTAL_WIDTH } from './device-pedestals';

/** The sounds that a part's own events make, whatever kind of part it is. */
const EVENT_SOUNDS: Partial<Record<PartEvent, ControlSound | null>> = {
  refused: 'locked',
  'end-stop': null,
  trip: 'trip',
  'pull-in': 'pull-in',
  'drop-out': 'drop-out',
  blow: 'blow',
  bulge: 'bulge',
  vent: 'vent',
  release: 'mushroom',
};
/** The sound each kind of part makes doing anything else. */
const PART_SOUNDS: Record<string, ControlSound | null> = {
  button: 'button',
  key: 'key',
  selector: 'selector',
  knob: 'knob',
  'key-switch': 'key-switch',
  mushroom: 'mushroom',
  handle: 'handle',
  door: 'isolator',
  overload: 'button',
  fuse: 'key-switch',
  capacitor: 'key-switch',
  contactor: null,
  motor: null,
};

/**
 * Dev0, Controls and Displays: the kinds of controls, displays and working
 * parts the game's machine will be built from, after the motor control
 * centre in Rockwell's Retro Encabulator film (an Allen-Bradley CENTERLINE
 * line-up). On the north wall, the CONTROLS board of 30 mm pilot devices
 * and the DISPLAYS board of indicators and displays, each driven by test
 * controls. Along the south wall, a pedestal for each working part of a
 * motor control unit, with a test panel to put it through what it does,
 * failures included. Every control is a component.
 */
export function startControlsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const half = { x: 6, z: 5 };
  const bounds: Footprint = {
    minX: -half.x * m,
    maxX: half.x * m,
    minZ: -half.z * m,
    maxZ: half.z * m,
  };
  const height = 3.4;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  renderer.setClearColor('#2a2c2b');
  const camera = new PerspectiveCamera(52, 1, 0.05, 40 * m);
  scene.add(new AmbientLight('#f4f6ff', 0.9));
  const key = new DirectionalLight('#f6f7ff', 1.6);
  key.position.set(-2, 6, 4);
  scene.add(key);
  // Sealed concrete, and walls in the pale institutional green of a plant.
  const floorMaterial = createPs1Material({ color: '#7b7d78' });
  const wallMaterial = createPs1Material({ color: '#b7c2b2' });
  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    wall = false,
  ) => {
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      wall ? wallMaterial : floorMaterial,
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };
  slab(2 * half.x * m, 0.1 * m, 2 * half.z * m, 0, -0.05 * m, 0);
  slab(
    2 * half.x * m,
    0.1 * m,
    2 * half.z * m,
    0,
    (height + 0.05) * m,
    0,
    true,
  );
  const doors = devPortals('dev0', bounds, m);
  const walls = devWalls(bounds, m, height * m);
  for (const wall of walls)
    slab(
      wall.maxX - wall.minX,
      wall.top - wall.bottom,
      wall.maxZ - wall.minZ,
      (wall.minX + wall.maxX) / 2,
      (wall.bottom + wall.top) / 2,
      (wall.minZ + wall.maxZ) / 2,
      true,
    );
  const passages = createPortals('dev0', doors, 0, m);
  scene.add(passages.group);

  // The boards on the north wall and the pedestals along the south.
  const kit = createPanelKit();
  const fittings: TestFitting[] = [];
  const footprints: Footprint[] = [];
  const place = (
    fitting: TestFitting,
    x: number,
    y: number,
    z: number,
    yaw = 0,
    footprint?: Footprint,
  ) => {
    fitting.group.scale.setScalar(m);
    fitting.group.position.set(x * m, y * m, z * m);
    fitting.group.rotation.y = yaw;
    scene.add(fitting.group);
    fittings.push(fitting);
    if (footprint) footprints.push(footprint);
  };
  const boardZ = -half.z + 0.25;
  const boardFootprint = (x: number, width: number): Footprint => ({
    minX: (x - width / 2) * m,
    maxX: (x + width / 2) * m,
    minZ: -half.z * m,
    maxZ: (boardZ + 0.1) * m,
  });
  place(createControlsBoard(kit), -3, 1.55, boardZ, 0, boardFootprint(-3, 3));
  place(
    createDisplaysBoard(kit),
    2.4,
    1.55,
    boardZ,
    0,
    boardFootprint(2.4, 3.2),
  );
  const pedestalZ = half.z - 1.9;
  createPedestals(kit).forEach((pedestal, i) => {
    const x = -4.6 + i * 1.6;
    const reach = PEDESTAL_WIDTH / 2 + 0.05;
    place(pedestal, x, 0, pedestalZ, Math.PI, {
      minX: (x - reach) * m,
      maxX: (x + reach) * m,
      minZ: (pedestalZ - reach - 0.1) * m,
      maxZ: (pedestalZ + reach) * m,
    });
  });

  // What was worked, and what it did.
  const log = document.createElement('ol');
  log.setAttribute('aria-label', 'Parts worked');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  Object.assign(log.style, {
    position: 'absolute',
    left: '12px',
    top: '64px',
    margin: '0',
    padding: '8px 12px',
    listStyle: 'none',
    pointerEvents: 'none',
    maxWidth: 'min(460px, calc(100% - 48px))',
    background: 'rgba(14,12,9,0.78)',
    color: '#e9e1c8',
    font: '13px/1.45 "Courier New", monospace',
  });
  log.hidden = true;
  canvas.parentElement?.append(log);
  const report = (name: string, event: string) => {
    const item = document.createElement('li');
    item.textContent = `${name}: ${event}`;
    log.prepend(item);
    while (log.children.length > 10) log.lastElementChild!.remove();
    log.hidden = false;
    console.info(`dev0: ${item.textContent}`);
  };

  // The parts' own sounds. Browsers allow sound only after a gesture.
  let audio: AudioContext | null = null;
  let resumeAudio = false;
  let sounds: ControlSounds | null = null;
  const soundButton = document.createElement('button');
  soundButton.type = 'button';
  soundButton.textContent = 'Sound: off';
  Object.assign(soundButton.style, {
    position: 'absolute',
    right: '12px',
    top: '12px',
    font: '13px monospace',
    padding: '4px 10px',
    cursor: 'pointer',
  });
  const loops = createPartLoops();
  const uses = new Map<Object3D, (direction?: number) => void>();
  for (const fitting of fittings) {
    for (const [object, use] of fitting.uses) uses.set(object, use);
    fitting.onHeld((sound, from) => loops.hold(from.uuid, sound));
    fitting.onSound((event, sound, part, from) => {
      let name = from.name;
      for (let p = from.parent; !name && p; p = p.parent) name = p.name;
      report(name || part, event);
      if (sound === null) return;
      const kind =
        (sound as ControlSound | undefined) ??
        (event in EVENT_SOUNDS ? EVENT_SOUNDS[event] : PART_SOUNDS[part]);
      if (kind) sounds?.play(kind);
    });
  }
  soundButton.addEventListener('click', () => {
    void loops.unlock();
    if (!audio) {
      audio = new AudioContext();
      sounds = createControlSounds(audio);
      sounds.output.connect(audio.destination);
    } else if (audio.state === 'running') {
      void audio.suspend();
      loops.setMuted(true);
    } else {
      void audio.resume();
      loops.setMuted(false);
    }
    window.setTimeout(() => {
      soundButton.textContent =
        audio?.state === 'running' ? 'Sound: on (click to mute)' : 'Sound: off';
    }, 50);
  });
  canvas.parentElement?.append(soundButton);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const use = (x: number, y: number) => {
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      [...passages.uses.keys(), ...uses.keys()],
      true,
    )[0];
    if (!hit) return;
    if (passages.uses.has(hit.object as Mesh)) {
      passages.uses.get(hit.object as Mesh)?.();
      return;
    }
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = uses.get(o);
      if (!work) continue;
      work(knobDirection(o, hit.point, camera));
      return;
    }
  };

  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    controls: { x: -3 * m, z: (boardZ + 2.2) * m, yaw: 0, pitch: -0.12 },
    displays: { x: 2.4 * m, z: (boardZ + 2.2) * m, yaw: 0, pitch: -0.12 },
    pedestals: {
      x: -0.6 * m,
      z: (pedestalZ - 2.6) * m,
      yaw: Math.PI,
      pitch: -0.3,
    },
  };
  /** A clickable object's name, or its nearest named ancestor's. */
  const partName = (object: Object3D) => {
    for (let o: Object3D | null = object; o; o = o.parent)
      if (o.name) return o.name;
    return '';
  };
  const params = new URLSearchParams(location.search);
  const startView = views[params.get('view') ?? ''];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: startView ??
      passages.arrival(params.get('from')) ?? { x: 0, z: 0, yaw: 0 },
    solids: () => [
      ...walls.filter((wall) => wall.bottom === 0),
      ...passages.solids(),
      ...footprints,
    ],
    use,
  });
  const notes = document.createElement('div');
  notes.textContent =
    'DEV0 · Controls and Displays: controls and displays on the north wall, working parts on pedestals to the south · Door: dev1 east · WASD: walk · E or click: work a part · Esc: cursor · P: PS1 resolution';
  Object.assign(notes.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: 'calc(100% - 260px)',
    padding: '10px',
    background: '#20302bdd',
    color: '#e8e2cc',
    font: '13px monospace',
  });
  canvas.parentElement?.append(notes);
  let ps1 = !realistic;
  const resize = () => {
    const { width, height: tall } = canvas.getBoundingClientRect();
    if (!width || !tall) return;
    const scale = ps1 ? renderScale(width, tall, true) : 1;
    const w = Math.round(width * scale),
      h = Math.round(tall * scale);
    renderer.setSize(w, h, false);
    ps1Uniforms.resolution.value.set(w, h);
    camera.aspect = width / tall;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onKey = (event: KeyboardEvent) => {
    if (canvas.parentElement?.hidden) return;
    if (event.key === 'p' || event.key === 'P') {
      ps1 = !ps1;
      resize();
    }
  };
  window.addEventListener('keydown', onKey);

  // A handle for scripted views and checks.
  (window as unknown as { devControls: unknown }).devControls = {
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
    setPs1(value: boolean) {
      ps1 = value;
      resize();
    },
    /** Work a part by its name, as a click would; returns whether found. */
    work(name: string, direction = 1) {
      for (const [object, work] of uses)
        if (partName(object) === name) {
          work(direction);
          return true;
        }
      return false;
    },
    /** The names of every part that takes a click. */
    parts: () => [...uses.keys()].map(partName).sort(),
    log: () => [...log.children].map((item) => item.textContent),
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
    passages.update(delta, walk.walker.x, walk.walker.z);
    for (const fitting of fittings)
      fitting.update(time / 1000, delta, reducedMotion?.matches ?? false);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    window.removeEventListener('keydown', onKey);
    walk.dispose();
    passages.dispose();
    notes.remove();
    log.remove();
    soundButton.remove();
    sounds?.dispose();
    void audio?.close();
    loops.dispose();
    for (const fitting of fittings) {
      fitting.dispose();
      disposeKit(kit, fitting.group);
    }
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    wallMaterial.dispose();
    floorMaterial.dispose();
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    suspend() {
      resumeAudio = audio?.state === 'running';
      if (resumeAudio) void audio?.suspend();
      loops.setVisible(false);
    },
    resume() {
      if (resumeAudio) void audio?.resume();
      loops.setVisible(true);
    },
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = passages.arrival(previous);
      if (pose) {
        walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
        walk.walker.crouched = false;
        walk.walker.lowCrouched = false;
      }
    },
  });
}
