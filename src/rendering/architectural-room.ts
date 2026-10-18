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
import { partAudio } from '../audio/part-audio';
import { devPortals, devWalls } from '../game/dev-room-links';
import { ARCHITECTURAL_FITTINGS } from '../game/architectural-fittings';
import type { ArchitecturalKind } from '../game/architectural-fittings';
import { createArchitecturalServices } from '../game/warehouse-services';
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
import { architecturalPart } from './architectural-parts';
import { createFirstPerson } from './first-person';
import { createPartSet } from './parts';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -12, maxX: 12, minZ: -9, maxZ: 9 };
const CEILING = 7;
/** Each specimen's board, metres. */
const BOARD = { w: 2.6, h: 0.9 };
/** The full-size doors, along the north wall, and where. */
const DOORS: { kind: ArchitecturalKind; x: number }[] = [
  { kind: 'escapedoor', x: -7.5 },
  { kind: 'loadingdoor', x: 0 },
  { kind: 'utilitydoor', x: 7.5 },
];
/** Where boards hang: along a wall (its centre line), facing in, how high. */
interface Hang {
  x: number;
  z: number;
  facing: number;
  y: number;
}
const OFF = 0.15 + 0.04;
// Numbered in order walking round, each run left to right as seen: down
// the east wall, two rows along the south wall, up the west wall, all
// clear of the portals near the south corners.
const SIDE = [-7.2, -4.2, -1.2, 1.8, 4.8];
const ALONG = [-9, -6, -3, 0, 3, 6, 9];
const HANGS: Hang[] = [
  ...SIDE.map((z) => ({ x: FLOOR.maxX, z, facing: -Math.PI / 2, y: 1.5 })),
  ...[2.3, 1.15].flatMap((y) =>
    [...ALONG].reverse().map((x) => ({ x, z: FLOOR.maxZ, facing: Math.PI, y })),
  ),
  ...[...SIDE]
    .reverse()
    .map((z) => ({ x: FLOOR.minX, z, facing: Math.PI / 2, y: 1.5 })),
];
/** Everything but the doors, as specimens on boards. */
const SPECIMENS = (
  Object.keys(ARCHITECTURAL_FITTINGS) as ArchitecturalKind[]
).filter((kind) => !DOORS.some((door) => door.kind === kind));

/**
 * Dev18, Architectural Fittings: a plain box of a development room (not
 * the warehouse) showing every architectural fitting in the catalogue
 * (`src/game/architectural-fittings.ts`) at true size: the escape,
 * loading and utility doors full size along the north wall, and every
 * other fitting on a numbered board round the other walls at eye level,
 * labelled with its name and the product it copies. Each is the same
 * working part the warehouse installs (`architecturalPart`), on one shared
 * building-services model, so they work here too.
 */
export function startArchitecturalGalleryRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e8e6e0', 0.75));
  scene.add(new HemisphereLight('#f2f1ec', '#3a3a36', 0.8));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5d5f5c'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e6e4de'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  for (const x of [-8, 0, 8])
    for (const z of [-4.5, 4.5]) {
      const lamp = new PointLight('#fff6ea', 14, 14 * m);
      lamp.position.set(x * m, (CEILING - 0.25) * m, z * m);
      scene.add(lamp);
    }
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#efede8');
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
  const sign = createSectionBoard(kit, 'ARCHITECTURAL FITTINGS', 4.4);
  sign.position.set(0, 3.0, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The fittings ---------------------------------------------------------
  const services = createArchitecturalServices();
  const parts = createPartSet();
  const backing = kitPaint(kit, '#c9cec4');
  const caption = (
    parent: Object3D,
    text: string,
    x: number,
    y: number,
    width: number,
  ) => {
    const mesh = createMicroLabel(kit, text, {
      height: 0.03,
      ink: '#253a42',
      plate: '#eef0ea',
      maxWidth: width,
    });
    mesh.position.set(x, y, 0.03);
    parent.add(mesh);
  };
  // The doors, full size, standing in the north wall.
  const north = new Group();
  north.position.set(0, 0, FLOOR.minZ + 0.15);
  room.add(north);
  for (const { kind, x } of DOORS) {
    const part = parts.add(architecturalPart(kit, kind, services));
    part.object.position.set(x, 0, 0.04);
    north.add(part.object);
    const spec = ARCHITECTURAL_FITTINGS[kind];
    caption(
      north,
      `${spec.title}\n${spec.reference}`,
      x,
      kind === 'loadingdoor' ? 5.6 : 2.5,
      kind === 'loadingdoor' ? 4 : 1.8,
    );
  }
  // Everything else round the other walls: each fitting measured, so a
  // small one sits in the middle of a numbered board at eye level and a
  // tall one (an extinguisher, a riser, a ladder) stands on the floor
  // against a side wall with its label above it. The side walls' places
  // go to the tall ones first.
  const made = SPECIMENS.map((kind) => {
    const part = parts.add(
      architecturalPart(kit, kind, services, {
        testers: kind === 'socket',
        fallDistance: 1.5,
        length: 1.2,
      }),
    );
    part.object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(part.object);
    return { kind, part, box, tall: box.max.y - box.min.y > 0.85 };
  });
  const sides = HANGS.filter((h) => h.facing !== Math.PI);
  const south = HANGS.filter((h) => h.facing === Math.PI);
  const tall = made.filter((s) => s.tall);
  const small = made.filter((s) => !s.tall);
  const placed = [
    ...tall.map((s, i) => ({ ...s, hang: sides[i] })),
    ...small.map((s, i) => ({
      ...s,
      hang: [...sides.slice(tall.length), ...south][i],
    })),
  ].sort((a, b) => HANGS.indexOf(a.hang) - HANGS.indexOf(b.hang));
  placed.forEach(({ kind, part, box, tall: standing, hang }, i) => {
    if (!hang) return;
    const board = new Group();
    board.name = `Specimen: ${kind}`;
    board.position.set(
      hang.x + Math.sin(hang.facing) * OFF,
      hang.y,
      hang.z + Math.cos(hang.facing) * OFF,
    );
    board.rotation.y = hang.facing;
    room.add(board);
    const middle = box.getCenter(new Vector3());
    const height = box.max.y - box.min.y;
    // Its front against the board, centred on it; a tall one on the floor.
    part.object.position.set(
      part.object.position.x - middle.x,
      standing
        ? part.object.position.y - box.min.y - hang.y
        : part.object.position.y - middle.y + 0.05,
      part.object.position.z - box.min.z + 0.04,
    );
    board.add(part.object);
    const top = standing ? height - hang.y : BOARD.h / 2;
    if (!standing)
      board.add(new Mesh(new BoxGeometry(BOARD.w, BOARD.h, 0.035), backing));
    const spec = ARCHITECTURAL_FITTINGS[kind];
    caption(
      board,
      `${spec.title}\n${spec.reference}`,
      0,
      standing ? top + 0.2 : -BOARD.h / 2 - 0.1,
      BOARD.w,
    );
    const number = createMicroLabel(kit, String(i + 1), {
      height: 0.1,
      ink: '#f5f5f5',
      plate: '#141414',
    });
    number.position.set(
      -BOARD.w / 2 + 0.1,
      standing ? top + 0.2 : BOARD.h / 2 - 0.08,
      0.025,
    );
    board.add(number);
  });
  const numbered = placed.map((s) => s.kind);

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev18', devPortals('dev18', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, room], true)[0];
    if (hit && hit.distance > 4 * m) return null;
    if (!hit) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh) ?? parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: 0.12 },
  };
  HANGS.forEach((hang, i) => {
    // 3 m in front of each exhibit, facing it.
    views[String(i + 1)] = {
      x: (hang.x + Math.sin(hang.facing) * 3) * m,
      z: (hang.z + Math.cos(hang.facing) * 3) * m,
      yaw: -hang.facing,
      pitch: 0.02,
    };
  });
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
    solids: () => outer,
    use: (x, y) => portalAt(x, y)?.(),
    aimed: () => Boolean(portalAt(0, 0)),
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
  (window as unknown as { devFittingsGallery: unknown }).devFittingsGallery = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    fittings: () => numbered.map((k, i) => `${i + 1}. ${k}`),
  };

  // ---- Each frame -------------------------------------------------------------
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
    services.model.tick(delta);
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
    delete (window as unknown as { devFittingsGallery?: unknown })
      .devFittingsGallery;
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
