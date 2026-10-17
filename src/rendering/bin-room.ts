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
import { click, partAudio } from '../audio/part-audio';
import { aimsAtBin, arcSeconds, binArc, binRest } from '../game/bin-toss';
import type { Point3 } from '../game/bin-toss';
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
import { createOfficeBin } from '../scene/office-bin';
import { createPortals } from '../scene/portals';
import { knobDirection } from '../scene/rotary-knob';
import { createFirstPerson } from './first-person';
import { machineComponent } from './machine-components';
import type { MachineDevice } from './machine-components';
import type { PortableObject } from './object-handling';
import { createPartSet } from './parts';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const CEILING = 3.2;
/** The plinths stand in a ring this far from the bin, metres. */
const RING = 3;
const PLINTH = { w: 0.5, h: 0.95, d: 0.5 };
/** Seconds after its board is taken before a plinth has a fresh one. */
const RESTOCK = 3;
/** The boards on the plinths: the Pepperdyne cards and their neighbours. */
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
 * Dev14, Putting Things in the Bin: the boards we have built stand on
 * plinths round a single large office waste-paper bin. Let go of one
 * facing the bin within a metre and a half (`src/game/bin-toss.ts`) and it
 * flies in a parabola into the bin and lands on whatever is already there;
 * let go anywhere else and it clatters to the floor as dropped things do.
 * Each plinth has a fresh board a few seconds after its board is taken, so
 * the bin can be filled, and over-filled, with expensive circuit boards.
 */
export function startBinRoom(canvas: HTMLCanvasElement) {
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
  const parts = createPartSet();
  const random = seeded(1313);

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
  const wallPaint = kitPaint(kit, '#4a4f47');
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
  const sign = createSectionBoard(kit, 'PUTTING THINGS IN THE BIN', 4.4);
  sign.position.set(-2.2, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The bin --------------------------------------------------------------
  const bin = createOfficeBin(kit);
  room.add(bin.group);
  const binLight = new SpotLight('#fff3e2', 16 * m * m, 0, 0.42, 0.6, 2);
  binLight.position.set(0, (CEILING - 0.1) * m, 0.8 * m);
  binLight.target.position.set(0, 0.4 * m, 0);
  scene.add(binLight, binLight.target);

  // ---- The plinths and their boards ---------------------------------------
  const plinthPaint = kitPaint(kit, '#d9d6cc');
  const deckPaint = kitPaint(kit, '#2b2d30');
  const plinths = KINDS.map((kind, i) => {
    // Round the bin, leaving the south side open for the way in.
    const angle = Math.PI + ((i + 0.5) / KINDS.length) * Math.PI * 2;
    const x = Math.sin(angle) * RING;
    const z = -Math.cos(angle) * RING;
    const group = new Group();
    group.position.set(x, 0, z);
    // Each faces the bin.
    group.rotation.y = Math.atan2(-x, -z);
    room.add(group);
    const body = new Mesh(
      new BoxGeometry(PLINTH.w, PLINTH.h - 0.03, PLINTH.d),
      plinthPaint,
    );
    body.position.y = (PLINTH.h - 0.03) / 2;
    group.add(body);
    // A dark deck that dropped boards can land on.
    const deck = new Mesh(
      new BoxGeometry(PLINTH.w + 0.02, 0.03, PLINTH.d + 0.02),
      deckPaint,
    );
    deck.position.y = PLINTH.h - 0.015;
    deck.userData.boardSupport = true;
    group.add(deck);
    const label = createMicroLabel(kit, title(kind), {
      height: 0.018,
      ink: '#1d1f21',
      maxWidth: PLINTH.w - 0.04,
    });
    label.position.set(0, PLINTH.h - 0.12, PLINTH.d / 2 + 0.001);
    group.add(label);
    const spot = new SpotLight('#fff3e2', 8 * m * m, 0, 0.3, 0.6, 2);
    spot.position.set(x * 0.8 * m, (CEILING - 0.1) * m, z * 0.8 * m);
    spot.target.position.set(x * m, PLINTH.h * m, z * m);
    scene.add(spot, spot.target);
    return {
      kind,
      x,
      z,
      group,
      board: null as MachineDevice | null,
      taken: 0,
    };
  });
  /** Put a fresh board on plinth `p`, sitting on its deck. */
  const stock = (p: (typeof plinths)[number]) => {
    const device = parts.add(
      machineComponent(kit, p.kind, {
        name: `${title(p.kind)} on plinth`,
        attachment: 'detachable',
      }),
    );
    device.object.updateMatrixWorld(true);
    const envelope = new Box3().setFromObject(device.object);
    device.object.position.set(
      -(envelope.min.x + envelope.max.x) / 2,
      PLINTH.h - envelope.min.y,
      -(envelope.min.z + envelope.max.z) / 2,
    );
    p.group.add(device.object);
    p.board = device;
    p.taken = 0;
  };
  for (const p of plinths) stock(p);
  const portableOf = (device: MachineDevice) =>
    device.object.userData.portable as PortableObject | undefined;

  // ---- Tossing into the bin -------------------------------------------------
  const tosses: {
    object: Object3D;
    portable: PortableObject;
    from: Point3;
    to: Point3;
    fromQ: Quaternion;
    toQ: Quaternion;
    centre: Vector3;
    age: number;
    seconds: number;
  }[] = [];
  let filled = 0;
  const eye = new Vector3();
  const look = new Vector3();
  const binThud = click({
    band: 420,
    q: 1.1,
    decay: 0.09,
    level: 0.22,
    thump: [105, 0.09],
  });
  /** Where an object's middle is, in its own frame, scaled. */
  const middleOf = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const centre = box.getCenter(new Vector3());
    return object.worldToLocal(centre).multiply(object.scale);
  };
  /** Send `object` into the bin from where it is now. */
  const toss = (object: Object3D, portable: PortableObject) => {
    const centre = middleOf(object);
    const start = object.position
      .clone()
      .add(centre.clone().applyQuaternion(object.quaternion))
      .divideScalar(m);
    const rest = binRest(filled++, bin.shape, random);
    const to = { x: rest.x, y: rest.y + 0.02, z: rest.z };
    // Lying flat (its thinnest side up) with its length along the bin,
    // then tipped up at the end as the bin fills, and turned a little.
    const turned = object.quaternion.clone();
    object.quaternion.identity();
    object.updateMatrixWorld(true);
    const own = new Box3().setFromObject(object).getSize(new Vector3());
    object.quaternion.copy(turned);
    object.updateMatrixWorld(true);
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => own.dot(p) - own.dot(q));
    const thin = axes[0];
    const long = axes[2];
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    const toQ = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), rest.yaw)
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rest.tilt),
      )
      .multiply(lay);
    tosses.push({
      object,
      portable,
      from: { x: start.x, y: start.y, z: start.z },
      to,
      fromQ: object.quaternion.clone(),
      toQ,
      centre,
      age: 0,
      seconds: arcSeconds(Math.hypot(start.x - to.x, start.z - to.z)),
    });
  };
  const divert = (object: Object3D, portable: PortableObject) => {
    camera.getWorldPosition(eye).divideScalar(m);
    camera.getWorldDirection(look);
    if (
      !aimsAtBin(
        { x: eye.x, z: eye.z },
        { x: look.x, z: look.z },
        { x: 0, z: 0 },
      )
    )
      return false;
    toss(object, portable);
    return true;
  };
  const flight = (delta: number) => {
    for (let i = tosses.length - 1; i >= 0; i--) {
      const t = tosses[i];
      t.age += delta;
      const k = Math.min(1, t.age / t.seconds);
      const at = binArc(t.from, t.to, k);
      t.object.quaternion.copy(t.fromQ).slerp(t.toQ, k);
      t.object.position
        .set(at.x * m, at.y * m, at.z * m)
        .sub(t.centre.clone().applyQuaternion(t.object.quaternion));
      if (k < 1) continue;
      // Landed: on the bin's bottom, or on the boards already in it.
      tosses.splice(i, 1);
      t.portable.component.impact(1.4, 0);
      t.portable.component.settle();
      t.portable.component.setLocked(true);
      partAudio.play(binThud, t.object);
    }
  };

  // ---- Walking and working ------------------------------------------------
  const portals = createPortals('dev14', devPortals('dev14', bounds, m), 0, m);
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
    // A metre south of the bin, looking down into it.
    bin: { x: 0, z: 1 * m, yaw: 0, pitch: -0.7 },
  };
  for (const [i, p] of plinths.entries()) {
    // Standing in front of the plinth, between it and the bin.
    const along = (RING - 0.75) / RING;
    views[String(i + 1)] = {
      x: p.x * along * m,
      z: p.z * along * m,
      yaw: Math.atan2(p.x, -p.z),
      pitch: -0.45,
    };
  }
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    divert,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [
      ...outer,
      {
        minX: -(bin.footprint.x / 2 + 0.05) * m,
        maxX: (bin.footprint.x / 2 + 0.05) * m,
        minZ: -(bin.footprint.z / 2 + 0.05) * m,
        maxZ: (bin.footprint.z / 2 + 0.05) * m,
      },
      ...plinths.map((p) => ({
        minX: (p.x - 0.32) * m,
        maxX: (p.x + 0.32) * m,
        minZ: (p.z - 0.32) * m,
        maxZ: (p.z + 0.32) * m,
      })),
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
  (window as unknown as { devBin: unknown }).devBin = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** How many things have gone in the bin. */
    fill: () => filled,
    /** Throw plinth boards straight into the bin, `n` of them. */
    throw(n = 1) {
      for (let k = 0; k < n; k++) {
        const p = plinths[(filled + k) % plinths.length];
        const board = p.board;
        const portable = board && portableOf(board);
        if (
          !board ||
          !portable ||
          portable.component.phase.value !== 'installed'
        )
          continue;
        portable.component.pickUp();
        portable.detach();
        scene.attach(board.object);
        portable.component.drop();
        toss(board.object, portable);
      }
    },
  };

  // ---- Each frame ----------------------------------------------------------
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
    flight(delta);
    // A plinth whose board has gone has a fresh one a little later.
    for (const p of plinths) {
      const portable = p.board && portableOf(p.board);
      if (!portable || portable.component.phase.value === 'installed') continue;
      p.taken += delta;
      if (p.taken > RESTOCK) stock(p);
    }
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
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devBin?: unknown }).devBin;
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
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
