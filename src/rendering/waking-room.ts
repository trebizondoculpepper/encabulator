import {
  AmbientLight,
  BoxGeometry,
  Euler,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../audio/part-audio';
import { devPortals, devWalls } from '../game/dev-room-links';
import { createDreamRooms } from '../game/dream-rooms';
import type { DreamRoom, NinetiesPattern } from '../game/dream-rooms';
import { createWaking } from '../game/waking';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import { createSectionBoard } from '../scene/building-fittings';
import {
  createPanelKit,
  disposeKit,
  kitGlow,
  kitPaint,
} from '../scene/eighties-controls';
import {
  PATTERN_TILE_METRES,
  createNinetiesPattern,
} from '../scene/nineties-patterns';
import { createPortals } from '../scene/portals';
import { knobDirection } from '../scene/rotary-knob';
import { createEyelidOverlay } from './eyelid-overlay';
import { createFirstPerson } from './first-person';
import { createPartSet } from './parts';
import { createPs1Material, ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
const CEILING = 2.8;
/**
 * Where the head turns, from the eyes, in metres in the eyes' own frame
 * (x right, y up, z back): the top of the spine, below and behind them.
 */
const NECK = new Vector3(0, -0.12, 0.09);
/** The dream's plain walls, before the first waking. */
const DREAM_WALLS = '#e6e2d6';

/**
 * Repeat a box's texture once every `PATTERN_TILE_METRES` on each face,
 * whatever its size, so a pattern keeps its scale. The box is `w`, `h`
 * and `d` metres; BoxGeometry's faces run +x, −x, +y, −y, +z, −z, four
 * corners each.
 */
function tileFaces(box: BoxGeometry, w: number, h: number, d: number) {
  const uv = box.attributes.uv;
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let i = 0; i < uv.count; i++) {
    const [across, up] = faces[Math.floor(i / 4)];
    uv.setXY(
      i,
      (uv.getX(i) * across) / PATTERN_TILE_METRES,
      (uv.getY(i) * up) / PATTERN_TILE_METRES,
    );
  }
  uv.needsUpdate = true;
}

/**
 * Dev10, Waking Up from the Dream: here, a use does not work anything; it
 * wakes the player, and what has happened so far was a dream. The eyes
 * shut, and while they are shut the player is moved and the room changes,
 * so neither is seen; they open somewhere else, looking down, dizzily
 * blinking, before the head shakes itself awake and the player has the
 * camera back (`src/game/waking.ts`, drawn by `eyelid-overlay.ts`). Each
 * waking is into a different room, its walls a garish early-1990s pattern
 * (`src/game/dream-rooms.ts`, `src/scene/nineties-patterns.ts`), and the
 * room before was a dream. Entering the room again starts the dream again,
 * with plain walls. A click on a portal still travels.
 */
export function startWakingRoom(canvas: HTMLCanvasElement) {
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
  // The walls' own material carries the pattern, so it runs on under the
  // portals.
  const wallPaint = createPs1Material({ color: DREAM_WALLS, roughness: 0.85 });
  const wallGeometries: BoxGeometry[] = [];
  for (const piece of outer) {
    const box = new BoxGeometry(
      piece.maxX - piece.minX,
      piece.top - piece.bottom,
      piece.maxZ - piece.minZ,
    );
    tileFaces(
      box,
      (piece.maxX - piece.minX) / m,
      (piece.top - piece.bottom) / m,
      (piece.maxZ - piece.minZ) / m,
    );
    wallGeometries.push(box);
    const mesh = new Mesh(box, wallPaint);
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
  const sign = createSectionBoard(kit, 'WAKING UP FROM THE DREAM', 4.2);
  sign.position.set(0, 2.3, FLOOR.minZ + 0.154);
  room.add(sign);

  /** Paper the walls with `dream`'s pattern, or the plain dream's paint. */
  let current: DreamRoom | null = null;
  const paper = (dream: DreamRoom | null) => {
    current = dream;
    wallPaint.map?.dispose();
    wallPaint.map = dream
      ? createNinetiesPattern(dream.pattern, dream.seed)
      : null;
    wallPaint.color.set(dream ? '#ffffff' : DREAM_WALLS);
    wallPaint.needsUpdate = true;
  };

  // ---- Waking --------------------------------------------------------------
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const eyelids = createEyelidOverlay(renderer);
  const rooms = createDreamRooms();
  // While the eyes are shut: a different room, and the player somewhere
  // else in it.
  const waking = createWaking(() => {
    const next = rooms.next();
    paper(next);
    walk.walker.zoom = 1;
    walk.walker.crouched = false;
    walk.walker.lowCrouched = false;
    const { x, z, yaw, pitch } = next.pose;
    walk.place(x * m, z * m, yaw, pitch);
  });
  let frozen = false;
  const wake = () => {
    if (waking.begin()) walk.hold(true);
  };

  // ---- Walking and working -----------------------------------------------
  const portals = createPortals('dev10', devPortals('dev10', bounds, m), 0, m);
  /** Back in the dream: not woken, the player free. */
  const dream = () => {
    waking.reset();
    rooms.reset();
    if (current) paper(null);
    frozen = false;
    walk.hold(false);
  };
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
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.1 },
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
    solids: () => outer,
    // Every use wakes, except a click on a portal, which travels.
    use: (x, y) => (usableAt(x, y) ?? wake)(),
    aimed: () => true,
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
  (window as unknown as { devWaking: unknown }).devWaking = {
    /** Wake, as a use in the dream does. */
    wake,
    /** Make it a dream again, back where it began. */
    dream,
    frame: () => waking.frame,
    /** The room woken into last: its pattern, seed and where. */
    room: () => current,
    /** Paper the walls with `pattern` laid out by `seed`, without waking. */
    paper: (pattern: NinetiesPattern, seed = 1) =>
      paper({ pattern, seed, pose: rooms.next().pose }),
    /** Hold the waking still at `t` seconds, to look at; `at(null)` lets it run. */
    at(t: number | null) {
      frozen = t !== null;
      if (t === null) return;
      walk.hold(true);
      waking.seek(t);
    },
    /** Work whatever is at screen point (x, y), −1 to 1, as a click does. */
    use: (x: number, y: number) => usableAt(x, y)?.(),
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
  const headTurn = new Quaternion();
  const shakeAngles = new Euler(0, 0, 0, 'YXZ');
  const swing = new Vector3();
  const neckAt = new Vector3();
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    const was = waking.frame.holding;
    const eyes = waking.update(frozen ? 0 : delta);
    if (was && !eyes.holding) walk.hold(false);
    walk.update(delta);
    // The head's shake turns it on top of where the player looks, about
    // the top of the spine, so the eyes swing as well as turn.
    if (!reducedMotion.matches) {
      headTurn.setFromEuler(
        shakeAngles.set(eyes.shake.pitch, -eyes.shake.yaw, eyes.shake.roll),
      );
      swing.copy(NECK).multiplyScalar(m);
      swing.sub(neckAt.copy(swing).applyQuaternion(headTurn));
      camera.position.add(swing.applyQuaternion(camera.quaternion));
      camera.quaternion.multiply(headTurn);
    }
    parts.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
    eyelids.draw(eyes.open, eyes.haze);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    eyelids.dispose();
    wallPaint.map?.dispose();
    wallPaint.dispose();
    for (const box of wallGeometries) box.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devWaking?: unknown }).devWaking;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      dream();
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
