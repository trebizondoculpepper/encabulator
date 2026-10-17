import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Frustum,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../audio/part-audio';
import { skipToVanish } from '../game/appearing-skips';
import type { AppearingSkip } from '../game/appearing-skips';
import { devPortals, devWalls } from '../game/dev-room-links';
import {
  CARD_DESIGNATIONS,
  EXPANSION_CARD_KINDS,
} from '../game/machine-components';
import type { MachineComponentKind } from '../game/machine-components';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import { createSectionBoard } from '../scene/building-fittings';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { turningKnob } from '../scene/rotary-knob';
import { createSkip } from '../scene/skip';
import { createBinTossing } from './bin-tossing';
import type { TossBin } from './bin-tossing';
import { createFirstPerson } from './first-person';
import { machineComponent } from './machine-components';
import type { MachineDevice } from './machine-components';
import type { PortableObject } from './object-handling';
import { createPartSet } from './parts';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -7, maxX: 7, minZ: -6, maxZ: 6 };
const CEILING = 3.2;
/** How far behind the player a skip appears, middle to eye, metres. */
const BEHIND = [2.4, 3.2, 4.2];
/** Turns off straight behind to try when straight behind will not do. */
const TURNS = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05];
/** The one plinth, where it stands, metres, and its size. */
const PLINTH = { x: 0, z: -1.5, w: 0.5, h: 0.95, d: 0.5 };
/** The boards it offers, one after another: dev14's eight. */
const KINDS: readonly MachineComponentKind[] = [
  ...EXPANSION_CARD_KINDS,
  'plc-comms',
  'capacitors',
  'drive-power',
];
const TITLES: Partial<Record<MachineComponentKind, string>> = {
  capacitors: 'DC BUS CAPACITORS',
  'drive-power': 'DRIVE POWER STAGE',
};
const title = (kind: MachineComponentKind) =>
  (kind in CARD_DESIGNATIONS
    ? CARD_DESIGNATIONS[kind as keyof typeof CARD_DESIGNATIONS].name
    : TITLES[kind])!.toUpperCase();

/**
 * Dev15, The Appearing Skip: the trick Level 2 plays once, played over
 * and over. Every use (a click, E, a tap or A; a portal still travels)
 * puts a mini skip (dev14's) immediately behind the player, out of view,
 * facing them, so it is there when they turn round; and whenever they
 * look away from a skip while there is more than one, the oldest skip out
 * of view quietly goes (`src/game/appearing-skips.ts`), so no skip is
 * ever seen to come or go, and whatever was thrown into it goes with it.
 * A single plinth offers one board at a time: throw it in a skip and the
 * next appears on the plinth.
 */
export function startAppearingSkipRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.5));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.7));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#6a6d6b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2c2e31'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  for (const x of [-4, 0, 4])
    for (const z of [-3, 3]) {
      const lamp = new PointLight('#fff3e2', 10, 9 * m);
      lamp.position.set(x * m, (CEILING - 0.2) * m, z * m);
      scene.add(lamp);
    }
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#5a5547');
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
  const sign = createSectionBoard(kit, 'THE APPEARING SKIP', 4.4);
  sign.position.set(-2.2, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The plinth and its board ---------------------------------------------
  const parts = createPartSet();
  const plinth = new Group();
  plinth.position.set(PLINTH.x, 0, PLINTH.z);
  room.add(plinth);
  const body = new Mesh(
    new BoxGeometry(PLINTH.w, PLINTH.h - 0.03, PLINTH.d),
    kitPaint(kit, '#d9d6cc'),
  );
  body.position.y = (PLINTH.h - 0.03) / 2;
  plinth.add(body);
  // A dark deck that a dropped board can land on.
  const deck = new Mesh(
    new BoxGeometry(PLINTH.w + 0.02, 0.03, PLINTH.d + 0.02),
    kitPaint(kit, '#2b2d30'),
  );
  deck.position.y = PLINTH.h - 0.015;
  deck.userData.boardSupport = true;
  plinth.add(deck);
  const spot = new SpotLight('#fff3e2', 8 * m * m, 0, 0.3, 0.6, 2);
  spot.position.set(PLINTH.x * m, (CEILING - 0.1) * m, (PLINTH.z + 0.6) * m);
  spot.target.position.set(PLINTH.x * m, PLINTH.h * m, PLINTH.z * m);
  scene.add(spot, spot.target);
  let label: Object3D | null = null;
  let offered = 0;
  const boards = new Map<Object3D, MachineDevice>();
  /** Put the next board on the plinth, labelled on its front. */
  const stock = () => {
    const kind = KINDS[offered++ % KINDS.length];
    const device = parts.add(
      machineComponent(kit, kind, {
        name: `${title(kind)} on plinth`,
        attachment: 'detachable',
      }),
    );
    // A card stands as it does in its slot: turned to show its face.
    if (kind.startsWith('plc-')) device.object.rotation.y = Math.PI / 2;
    device.object.updateMatrixWorld(true);
    const envelope = new Box3().setFromObject(device.object);
    device.object.position.set(
      -(envelope.min.x + envelope.max.x) / 2,
      PLINTH.h - envelope.min.y,
      -(envelope.min.z + envelope.max.z) / 2,
    );
    plinth.add(device.object);
    boards.set(device.object, device);
    if (label) plinth.remove(label);
    label = createMicroLabel(kit, title(kind), {
      height: 0.018,
      ink: '#1d1f21',
      maxWidth: PLINTH.w - 0.04,
    });
    label.position.set(0, PLINTH.h - 0.12, PLINTH.d / 2 + 0.001);
    plinth.add(label);
  };
  stock();

  // ---- The skips ------------------------------------------------------------
  /** What has landed in each skip, to go with it when it goes. */
  const contents = new Map<TossBin, Object3D[]>();
  const tossing = createBinTossing({
    camera,
    metre: m,
    // In a skip: the plinth offers the next board.
    onLanded: (object, bin) => {
      contents.get(bin)?.push(object);
      stock();
    },
  });
  // One model, cloned: every skip shares its geometry and paint.
  const model = createSkip(kit);
  const half = { x: model.footprint.x / 2, z: model.footprint.z / 2 };
  const skips: (AppearingSkip & {
    group: Object3D;
    box: Box3;
    plan: Footprint;
    bin: TossBin;
  })[] = [];
  const plinthPlan = {
    minX: PLINTH.x - PLINTH.w / 2,
    maxX: PLINTH.x + PLINTH.w / 2,
    minZ: PLINTH.z - PLINTH.d / 2,
    maxZ: PLINTH.z + PLINTH.d / 2,
  };
  let born = 0;
  let nextId = 0;
  const frustum = new Frustum();
  const viewMatrix = new Matrix4();
  const updateFrustum = () => {
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(
      viewMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
  };
  const eye = new Vector3();
  /** Put a skip behind the player, out of view; false if nowhere will do. */
  const conjure = () => {
    updateFrustum();
    camera.getWorldPosition(eye).divideScalar(m);
    const yaw = walk.walker.yaw;
    const group = model.group.clone();
    // Long side square to the player, so it faces them when they turn.
    group.rotation.y = -yaw;
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const hx = c * half.x + s * half.z;
    const hz = s * half.x + c * half.z;
    for (const turn of TURNS)
      for (const distance of BEHIND) {
        // Behind is the opposite of the way they face, (sin yaw, -cos yaw).
        const x = eye.x - Math.sin(yaw + turn) * distance;
        const z = eye.z + Math.cos(yaw + turn) * distance;
        const plan = {
          minX: x - hx,
          maxX: x + hx,
          minZ: z - hz,
          maxZ: z + hz,
        };
        const inside =
          plan.minX > FLOOR.minX + 0.2 &&
          plan.maxX < FLOOR.maxX - 0.2 &&
          plan.minZ > FLOOR.minZ + 0.2 &&
          plan.maxZ < FLOOR.maxZ - 0.2;
        const clear = [plinthPlan, ...skips.map((o) => o.plan)].every(
          (other) =>
            plan.maxX < other.minX - 0.1 ||
            plan.minX > other.maxX + 0.1 ||
            plan.maxZ < other.minZ - 0.1 ||
            plan.minZ > other.maxZ + 0.1,
        );
        if (!inside || !clear) continue;
        group.position.set(x, 0, z);
        room.add(group);
        const box = new Box3().setFromObject(group);
        if (frustum.intersectsBox(box)) {
          room.remove(group);
          continue;
        }
        // Boards heaped above the rim count as the skip, for being seen.
        box.max.y += 0.3 * m;
        const id = nextId++;
        const bin = tossing.add({
          name: `skip ${id}`,
          group,
          shape: model.shape,
          footprint: model.footprint,
          x,
          z,
        });
        contents.set(bin, []);
        skips.push({ id, born: born++, group, box, plan, bin });
        return true;
      }
    return false;
  };

  // ---- Walking and working --------------------------------------------------
  const portals = createPortals('dev15', devPortals('dev15', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(portals.group, true)[0];
    if (!hit) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return travel;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 2 * m, yaw: 0, pitch: -0.05 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    divert: tossing.divert,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [
      ...outer,
      {
        minX: (plinthPlan.minX - 0.07) * m,
        maxX: (plinthPlan.maxX + 0.07) * m,
        minZ: (plinthPlan.minZ - 0.07) * m,
        maxZ: (plinthPlan.maxZ + 0.07) * m,
      },
      ...skips.map((skip) => ({
        minX: (skip.plan.minX - 0.05) * m,
        maxX: (skip.plan.maxX + 0.05) * m,
        minZ: (skip.plan.minZ - 0.05) * m,
        maxZ: (skip.plan.maxZ + 0.05) * m,
      })),
    ],
    // A use anywhere conjures a skip (a click, E, a tap or A, but not the
    // knob-turning shoulder buttons); on a portal, it travels.
    use: (x, y) => {
      const travel = portalAt(x, y);
      if (travel) travel();
      else if (!turningKnob()) conjure();
    },
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
  (window as unknown as { devSkips: unknown }).devSkips = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Conjure a skip behind the player, as a use does. */
    conjure,
    /** Throw the plinth's board straight into the newest skip. */
    throw() {
      const board = [...boards.values()].find(
        (device) =>
          (device.object.userData.portable as PortableObject).component.phase
            .value === 'installed',
      );
      const newest = skips.at(-1);
      if (!board || !newest) return false;
      const portable = board.object.userData.portable as PortableObject;
      portable.component.pickUp();
      portable.detach();
      scene.attach(board.object);
      portable.component.drop();
      tossing.toss(board.object, portable, newest.bin.name);
      return true;
    },
    /** The skips there now, oldest first, and which are in view. */
    skips: () =>
      skips.map((skip) => ({
        id: skip.id,
        x: Number(skip.group.position.x.toFixed(2)),
        z: Number(skip.group.position.z.toFixed(2)),
        seen: seen.has(skip.id),
      })),
  };

  // ---- Each frame -------------------------------------------------------------
  let seen = new Set<number>();
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
    tossing.update(delta);
    parts.update(delta);
    // Whatever is out of view may go: the oldest, when one is looked away
    // from and there is more than one.
    updateFrustum();
    // A skip with a board on its way into it counts as seen: it stays.
    const inView = new Set(
      skips
        .filter(
          (skip) =>
            frustum.intersectsBox(skip.box) || tossing.incoming(skip.bin),
        )
        .map((skip) => skip.id),
    );
    const gone = skipToVanish(skips, seen, inView);
    if (gone !== null) {
      const at = skips.findIndex((skip) => skip.id === gone);
      const skip = skips[at];
      room.remove(skip.group);
      skips.splice(at, 1);
      tossing.remove(skip.bin);
      // What was thrown in it goes with it.
      for (const object of contents.get(skip.bin) ?? []) {
        object.removeFromParent();
        const device = boards.get(object);
        if (device) parts.remove(device);
        boards.delete(object);
      }
      contents.delete(skip.bin);
    }
    seen = inView;
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
    for (const skip of skips) room.remove(skip.group);
    room.add(model.group);
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devSkips?: unknown }).devSkips;
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
