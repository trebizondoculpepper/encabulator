import { computed, signal } from '@preact/signals-core';
import {
  AmbientLight,
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
import { partAudio } from '../audio/part-audio';
import { CASTORS } from '../audio/part-loops';
import { devPortals, devWalls } from '../game/dev-room-links';
import {
  STAND_RADIUS,
  createWanderingButton,
  stepStand,
} from '../game/mobile-pedestal';
import type { Stand } from '../game/mobile-pedestal';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import {
  createCaption,
  createControlStation,
  createMark,
  createMobileStand,
  createSectionBoard,
} from '../scene/building-fittings';
import {
  createPanelKit,
  disposeKit,
  kitGlow,
  kitPaint,
} from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { knobDirection } from '../scene/rotary-knob';
import { createFirstPerson } from './first-person';
import { createPartSet, ledPushbutton, pilotLight, selector } from './parts';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
const CEILING = 2.8;
const HOME = { x: 0, z: 0.5 };

/**
 * Dev9, the Wandering Button: a red illuminated push button on a mobile
 * floor stand, and on the north wall a small control station with its mode
 * knob (NORMAL, EAGER, SKITTISH) and a PRESSED lamp. Normal, the stand
 * stays in the middle of the room; eager, it creeps to wherever you look;
 * skittish, it rolls away from you, a little faster than you can follow
 * (`src/game/mobile-pedestal.ts`).
 */
export function startWanderingRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e9ece9', 0.45));
  scene.add(new HemisphereLight('#dfe4ea', '#4a4a44', 0.6));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const model = createWanderingButton();
  const parts = createPartSet();

  // ---- The room ----------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#7f888b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e9e7df'));
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
  const wallPaint = kitPaint(kit, '#e6e2d6');
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
  const panel = kitGlow(kit, '#f4f6ef');
  for (const x of [-4, 0, 4])
    for (const z of [-3, 2]) {
      const tile = new Mesh(new PlaneGeometry(0.6, 0.6), panel);
      tile.rotation.x = Math.PI / 2;
      tile.position.set(x, CEILING - 0.004, z);
      room.add(tile);
      const light = new PointLight('#f3f5ee', 1.2 * m * m, 12 * m);
      light.position.set(x * m, (CEILING - 0.3) * m, z * m);
      scene.add(light);
    }

  // ---- The wall station: the mode knob and the PRESSED lamp ---------------
  const northFace = FLOOR.minZ + 0.154;
  const sign = createSectionBoard(kit, 'THE WANDERING BUTTON', 4.2);
  sign.position.set(0, 2.3, northFace);
  room.add(sign);
  const station = createControlStation(kit, 2);
  station.group.position.set(0, 1.4, northFace);
  room.add(station.group);
  // Its devices are Schneider's 22 mm Harmony XB4 ones, at true size.
  const knob = selector(kit, {
    positions: 3,
    name: 'MODE selector',
    bound: model.mode,
    series: 'xb4',
  });
  station.mounts[0].add(knob.object);
  parts.add(knob);
  for (const [text, x, y] of [
    ['NORMAL', -0.0205, 0.0165],
    ['EAGER', 0, 0.019],
    ['SKITTISH', 0.0205, 0.0165],
  ] as const) {
    const mark = createMark(kit, text);
    mark.position.set(x, y, 0.0012);
    station.mounts[0].add(mark);
  }
  const lamp = pilotLight(kit, {
    colour: 'amber',
    name: 'PRESSED pilot light',
    drive: model.indicator,
    series: 'xb4',
  });
  station.mounts[1].add(lamp.object);
  parts.add(lamp);
  const pressedMark = createMark(kit, 'PRESSED');
  pressedMark.position.set(0, -0.0185, 0.0012);
  station.mounts[1].add(pressedMark);
  const caption = createCaption(kit, 'MODE');
  caption.position.set(0, 1.4 + station.height / 2 + 0.025, northFace);
  room.add(caption);

  // ---- The stand ---------------------------------------------------------
  const stand = createMobileStand(kit);
  room.add(stand.group);
  const button = ledPushbutton(kit, {
    colour: 'red',
    name: 'the wandering button',
    bound: {
      get value() {
        return model.indicator.value;
      },
      set: (on: boolean) => {
        if (on) model.press();
      },
    },
  });
  stand.mount.add(button.object);
  parts.add(button);
  const rolling = signal(false);
  let state: Stand & { speed: number } = {
    x: HOME.x,
    z: HOME.z,
    heading: Math.PI,
    speed: 0,
  };
  const place = () => {
    stand.group.position.set(state.x, 0, state.z);
    // The stand's front is +z; a heading of 0 faces −z.
    stand.group.rotation.y = Math.PI - state.heading;
  };
  place();
  const castorSound = computed(() => rolling.value);
  const castorOwner = {};
  let castorsHeard = false;

  // ---- Walking and working -----------------------------------------------
  const portals = createPortals('dev9', devPortals('dev9', bounds, m), 0, m);
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
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.15 },
    knob: { x: 0, z: (FLOOR.minZ + 1.2) * m, yaw: 0, pitch: -0.35 },
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
      {
        minX: (state.x - STAND_RADIUS) * m,
        maxX: (state.x + STAND_RADIUS) * m,
        minZ: (state.z - STAND_RADIUS) * m,
        maxZ: (state.z + STAND_RADIUS) * m,
      },
    ],
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
  (window as unknown as { devWandering: unknown }).devWandering = {
    model,
    stand: () => ({ ...state }),
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
  };

  // ---- Each frame ----------------------------------------------------------
  let last = 0;
  let was = { x: walk.walker.x, z: walk.walker.z };
  const look = new Vector3();
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    const { x, z } = walk.walker;
    const speed = delta > 0 ? Math.hypot(x - was.x, z - was.z) / m / delta : 0;
    was = { x, z };
    camera.getWorldDirection(look);
    const before = state;
    state = stepStand(
      state,
      model.mood.value,
      {
        x: x / m,
        y: camera.position.y / m,
        z: z / m,
        dx: look.x,
        dy: look.y,
        dz: look.z,
        speed,
      },
      FLOOR,
      HOME,
      delta,
    );
    const moved = Math.hypot(state.x - before.x, state.z - before.z);
    // The castors turn to the way it goes, in its own frame.
    const way = Math.atan2(state.x - before.x, state.z - before.z);
    stand.roll(way - stand.group.rotation.y, moved);
    place();
    rolling.value = state.speed > 0.05;
    if (castorSound.value !== castorsHeard) {
      castorsHeard = castorSound.value;
      partAudio.hold(castorOwner, castorsHeard ? CASTORS : null, stand.group);
    }
    model.tick(delta);
    parts.update(delta);
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
    partAudio.hold(castorOwner, null);
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devWandering?: unknown }).devWandering;
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
    suspend: () => {
      parts.setAudible(false);
      partAudio.hold(castorOwner, null);
      castorsHeard = false;
    },
    resume: () => parts.setAudible(true),
  });
}
