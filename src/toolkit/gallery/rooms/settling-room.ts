import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { click, partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { EXPANSION_CARD_KINDS } from '../../components/industrial-control/logic/machine-components';
import type { MachineComponentKind } from '../../components/industrial-control/logic/machine-components';
import { dressSkip } from '../../components/site-dressing/logic/skip-dressing';
import { createSkipPile } from '../../components/site-dressing/logic/skip-pile';
import type { Slab } from '../../components/site-dressing/logic/skip-pile';
import { binArc } from '../../components/site-dressing/logic/bin-toss';
import { METRE } from '../../components/core/logic/units';
import { materialiseAt } from '../../components/core/logic/materialise';
import { createMaterialise } from '../../components/core/views/materialise';
import { mergeStatic } from '../../components/core/views/merge-static';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  addSkipGraffiti,
  addSkipLamps,
  createSkip,
  SKIP_INSIDE,
} from '../../components/site-dressing/views/skip';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import type { MachineDevice } from '../../components/industrial-control/parts/machine-components';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const CEILING = 4;
/** Seconds between one thing thrown in and the next. */
const EVERY = 1;
/** The emitter: a ring this far round the skip's middle, this high above its rim. */
const RING = 1.2;
const ABOVE = 2;
/** Seconds a thing takes to boil in from nothing. */
const MATERIALISE = 0.7;
/** Once the pile stands this far above the rim, the skip is emptied. */
const HEAPED = 0.3;
/** Seconds a heaped skip is left to be looked at before it is emptied. */
const ADMIRE = 4;
/** What is thrown in: the boards from dev14. */
const KINDS: readonly MachineComponentKind[] = [
  ...EXPANSION_CARD_KINDS,
  'plc-comms',
  'capacitors',
  'drive-power',
];

// Landing in the skip: a hollow clang, as in `bin-tossing.ts`.
const clang = click({
  band: 820,
  q: 7,
  decay: 0.45,
  level: 0.18,
  thump: [72, 0.16],
});

/** A seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dev21, Settling Objects into Skips: an emitter over a mini skip throws
 * something in every second, to see how a skip fills when lots of things
 * go into it. Each, one of dev14's boards, boils in from nothing
 * (`createMaterialise`) at a point on a ring two metres over the skip and
 * is thrown straight in; where it lands it settles on the pile by the
 * skip's settling rule (`src/toolkit/components/site-dressing/logic/skip-pile.ts`): flat on a level
 * heap, tipped onto its highest supports on an uneven one, sliding off
 * anything too steep, so flat things pack down and a skip takes many
 * before it is full. Once the heap stands well above the rim the skip is
 * left a few seconds to be looked at, then emptied, and it starts again.
 */
export function startSettlingRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.45));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.6));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const random = seeded(2121);

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
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#474c55');
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
  const sign = createSectionBoard(kit, 'SETTLING OBJECTS INTO SKIPS', 4.8);
  sign.position.set(-2.2, 3, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The skip and its pile -----------------------------------------------
  const skip = createSkip(kit);
  room.add(skip.group);
  const dressing = dressSkip(random);
  const graffiti = addSkipGraffiti(kit, skip.group, dressing.tags);
  const lamps = addSkipLamps(kit, skip.group, dressing.lamps);
  const pile = createSkipPile(SKIP_INSIDE);
  const light = new SpotLight('#fff3e2', 22 * m * m, 0, 0.45, 0.6, 2);
  light.position.set(0, (CEILING - 0.1) * m, 1 * m);
  light.target.position.set(0, 0.4 * m, 0);
  scene.add(light, light.target);
  // The emitter's ring, faint, so it can be seen where things come from.
  const ringPaint = kitPaint(kit, '#4f8fbf');
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const dot = new Mesh(new BoxGeometry(0.03, 0.006, 0.03), ringPaint);
    dot.position.set(
      Math.cos(a) * RING,
      SKIP_INSIDE.rim + ABOVE,
      Math.sin(a) * RING,
    );
    room.add(dot);
  }

  // ---- The emitter ----------------------------------------------------------
  const reducedMotion = () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;
  /** Everything thrown in, from the moment it appears until it is emptied out. */
  const thrown: {
    kit: PanelKit;
    device: MachineDevice;
    object: Object3D;
    effect: ReturnType<typeof createMaterialise>;
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    fromQ: Quaternion;
    toQ: Quaternion;
    /** Its middle, in its own frame. */
    middle: Vector3;
    age: number;
    seconds: number;
    landed: boolean;
    merged: boolean;
  }[] = [];
  let paused = false;
  let every = EVERY;
  let since = 0;
  let heapedFor = 0;

  /** Throw one more thing in. */
  const emit = () => {
    const kind = KINDS[Math.floor(random() * KINDS.length)];
    const own = createPanelKit();
    const device = machineComponent(own, kind, {
      name: `${kind} thrown in`,
      attachment: 'fixed',
    });
    const object = device.object;
    // It is rubbish now: nothing picks it up again.
    delete object.userData.portable;
    // Its sizes, and how it lies flat: thinnest side up, longest along.
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const middle = box.getCenter(new Vector3());
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => size.dot(p) - size.dot(q));
    const [thin, mid, long] = axes;
    const slab: Slab = {
      length: size.dot(long),
      width: size.dot(mid),
      thickness: size.dot(thin),
    };
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    // Where it settles, by the pile's rule.
    const rest = pile.settle(slab, {
      x: (random() * 2 - 1) * (SKIP_INSIDE.topHalfX - 0.2),
      z: (random() * 2 - 1) * (SKIP_INSIDE.halfZ - 0.15),
      yaw: random() * Math.PI * 2,
    });
    const toQ = new Quaternion()
      .setFromRotationMatrix(
        new Matrix4().makeBasis(
          new Vector3(rest.along.x, rest.along.y, rest.along.z),
          new Vector3(rest.up.x, rest.up.y, rest.up.z),
          new Vector3(rest.across.x, rest.across.y, rest.across.z),
        ),
      )
      .multiply(lay);
    // Where it appears: a point on the ring, turned any way.
    const a = random() * Math.PI * 2;
    const from = {
      x: Math.cos(a) * RING,
      y: SKIP_INSIDE.rim + ABOVE,
      z: Math.sin(a) * RING,
    };
    const fromQ = new Quaternion().setFromAxisAngle(
      new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      random() * Math.PI * 2,
    );
    object.quaternion.copy(fromQ);
    object.position
      .set(from.x, from.y, from.z)
      .sub(middle.clone().applyQuaternion(fromQ));
    room.add(object);
    const distance = Math.hypot(from.x - rest.centre.x, from.z - rest.centre.z);
    thrown.push({
      kit: own,
      device,
      object,
      effect: createMaterialise(object, {
        seconds: MATERIALISE,
        reduced: reducedMotion(),
      }),
      from,
      to: rest.centre,
      fromQ,
      toQ,
      middle,
      age: 0,
      seconds: 0.6 + 0.2 * distance,
      landed: false,
      merged: false,
    });
  };

  /** Empty the skip: everything thrown in goes. */
  const empty = () => {
    for (const t of thrown) {
      t.effect.finish();
      room.remove(t.object);
      t.device.dispose();
      disposeKit(t.kit, t.object as Group);
    }
    thrown.length = 0;
    pile.reset();
    heapedFor = 0;
  };

  /** Fly, settle and tidy up everything on its way in. */
  const fly = (delta: number) => {
    for (const t of thrown) {
      t.effect.update(delta);
      if (!t.landed) {
        t.age += delta;
        const k = Math.min(1, t.age / t.seconds);
        const at = binArc(t.from, t.to, k, 0.15);
        // It turns to its resting pose as it falls, mostly at the end.
        t.object.quaternion.copy(t.fromQ).slerp(t.toQ, materialiseAt(k, 1));
        t.object.position
          .set(at.x, at.y, at.z)
          .sub(t.middle.clone().applyQuaternion(t.object.quaternion));
        if (k >= 1) {
          t.landed = true;
          partAudio.play(clang, t.object);
        }
      }
      // Landed and whole: a few meshes, not dozens, from now on.
      if (t.landed && !t.merged && !t.effect.running) {
        t.merged = true;
        mergeStatic(t.object, Infinity, new Set(), { share: true });
      }
    }
  };

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev21', devPortals('dev21', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.12 },
    // Beside the skip, looking down into it.
    skip: { x: 0, z: 1.6 * m, yaw: 0, pitch: -0.75 },
    // Across the skip's length, to see the pile's profile.
    end: { x: 3 * m, z: 0, yaw: -Math.PI / 2, pitch: -0.25 },
  };
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
      views.room,
    solids: () => [
      ...outer,
      {
        minX: (-skip.footprint.x / 2 - 0.05) * m,
        maxX: (skip.footprint.x / 2 + 0.05) * m,
        minZ: (-skip.footprint.z / 2 - 0.05) * m,
        maxZ: (skip.footprint.z / 2 + 0.05) * m,
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
  // Development only: these bind no input.
  (window as unknown as { devSettling: unknown }).devSettling = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Stop or start the emitter. */
    pause: () => (paused = true),
    resume: () => (paused = false),
    /** Throw something in every `seconds`. */
    every: (seconds: number) => (every = Math.max(0.05, seconds)),
    /** Throw `n` things in at once. */
    throw(n = 1) {
      for (let i = 0; i < n; i++) emit();
    },
    empty,
    /** How many are in, and how high the pile stands over the skip's floor. */
    state: () => ({
      count: pile.count,
      top: pile.top(),
      rim: SKIP_INSIDE.rim,
    }),
  };

  // ---- Each frame ------------------------------------------------------------
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
    lamps.update(time / 1000);
    if (pile.top() > SKIP_INSIDE.rim + HEAPED) {
      // Heaped: left a while to be looked at, then emptied.
      heapedFor += delta;
      if (heapedFor > ADMIRE) empty();
    } else if (!paused) {
      since += delta;
      if (since >= every) {
        since = 0;
        emit();
      }
    }
    fly(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    empty();
    lamps.dispose();
    graffiti.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devSettling?: unknown }).devSettling;
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
