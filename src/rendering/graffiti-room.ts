import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../audio/part-audio';
import { devPortals, devWalls } from '../game/dev-room-links';
import { GRAFFITI, GRAFFITI_KIND_NAMES } from '../game/graffiti';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import { createSectionBoard } from '../scene/building-fittings';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../scene/eighties-controls';
import { GRAFFITI_ASPECT, graffitiTexture } from '../scene/graffiti';
import { createPortals } from '../scene/portals';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

const FLOOR = { minX: -18, maxX: 18, minZ: -11, maxZ: 11 };
const CEILING = 4.2;
/** Each exhibit's concrete panel, metres, and the height of its middle. */
const PANEL = { w: 2.1, h: 1.4, y: 1.55 };
/**
 * The free-standing partitions down the middle, white like the walls: each
 * this long, tall and thick, at these places along the room.
 */
const DIVIDER = { length: 6, height: 2.7, thick: 0.15 };
const DIVIDERS = [-11.25, -3.75, 3.75, 11.25];
/**
 * Where exhibits hang: along a wall or a partition (its centre line at x,
 * z), facing into the room, and how far the panel stands off that line.
 */
interface Hang {
  x: number;
  z: number;
  facing: number;
  off: number;
}
const WALL_OFF = 0.15 + 0.06;
const DIVIDER_OFF = DIVIDER.thick / 2 + 0.05;
// Numbered in order walking round: along the north wall from the west,
// down the east end, back along the south wall, up the west end, then
// each partition from the west, its north face and then its south,
// each run left to right as it is seen.
const ALONG = Array.from({ length: 9 }, (_, i) => -14.4 + i * 3.6);
const ENDS = [-8, -4.5, -1, 2.5, 6];
const HANGS: Hang[] = [
  ...ALONG.map((x) => ({ x, z: FLOOR.minZ, facing: 0, off: WALL_OFF })),
  // The ends keep clear of the portals near their south corners.
  ...ENDS.map((z) => ({
    x: FLOOR.maxX,
    z,
    facing: -Math.PI / 2,
    off: WALL_OFF,
  })),
  ...[...ALONG]
    .reverse()
    .map((x) => ({ x, z: FLOOR.maxZ, facing: Math.PI, off: WALL_OFF })),
  ...[...ENDS].reverse().map((z) => ({
    x: FLOOR.minX,
    z,
    facing: Math.PI / 2,
    off: WALL_OFF,
  })),
  ...DIVIDERS.flatMap((x) => [
    ...[1.5, -1.5].map((dx) => ({
      x: x + dx,
      z: 0,
      facing: Math.PI,
      off: DIVIDER_OFF,
    })),
    ...[-1.5, 1.5].map((dx) => ({
      x: x + dx,
      z: 0,
      facing: 0,
      off: DIVIDER_OFF,
    })),
  ]),
];

/**
 * Dev16, Graffiti Gallery: an exhibition hall for the graffiti collection
 * (`src/game/graffiti.ts`), street art of our own invention to be sprayed
 * on things in the game. A big hall, 36 × 22 m, with four white
 * partitions down the middle; every piece of the collection (tags,
 * throw-ups, worked pieces, stencils, stickers, characters, hearts, tags
 * gone over, marker messages and roller letters) drawn on its own grey
 * concrete panel (`src/scene/graffiti.ts`), round the walls and on both
 * faces of the partitions, with a gallery label under it. Nothing here
 * works: it is a room to look round.
 */
export function startGraffitiRoom(canvas: HTMLCanvasElement) {
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
  for (const x of [-13.5, -4.5, 4.5, 13.5])
    for (const z of [-5.5, 5.5]) {
      const lamp = new PointLight('#fff6ea', 11, 13 * m);
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
  const sign = createSectionBoard(kit, 'GRAFFITI GALLERY', 4.4);
  sign.position.set(0, 3.0, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The partitions -------------------------------------------------------
  const frame = kitPaint(kit, '#b9bcbf', 0.6);
  const dividers: Footprint[] = DIVIDERS.map((x) => {
    const board = new Mesh(
      new BoxGeometry(DIVIDER.length, DIVIDER.height, DIVIDER.thick),
      wallPaint,
    );
    board.position.set(x, DIVIDER.height / 2 + 0.05, 0);
    room.add(board);
    // An aluminium edge round it, and a foot under each end.
    const cap = new Mesh(
      new BoxGeometry(DIVIDER.length + 0.04, 0.04, DIVIDER.thick + 0.02),
      frame,
    );
    cap.position.set(x, DIVIDER.height + 0.07, 0);
    room.add(cap);
    for (const end of [-1, 1]) {
      const edge = new Mesh(
        new BoxGeometry(0.04, DIVIDER.height, DIVIDER.thick + 0.02),
        frame,
      );
      edge.position.set(
        x + (end * (DIVIDER.length + 0.02)) / 2,
        DIVIDER.height / 2 + 0.05,
        0,
      );
      room.add(edge);
      const foot = new Mesh(new BoxGeometry(0.12, 0.05, 0.7), frame);
      foot.position.set(x + (end * (DIVIDER.length - 0.3)) / 2, 0.025, 0);
      room.add(foot);
    }
    return {
      minX: (x - DIVIDER.length / 2 - 0.05) * m,
      maxX: (x + DIVIDER.length / 2 + 0.05) * m,
      minZ: -0.4 * m,
      maxZ: 0.4 * m,
    };
  });

  // ---- The exhibits ---------------------------------------------------------
  const concrete = kitPaint(kit, '#8f8c85');
  const artMaterials: MeshStandardMaterial[] = [];
  GRAFFITI.forEach((art, i) => {
    // More art than places, and the rest waits for more room.
    const hang = HANGS[i];
    if (!hang) return;
    const exhibit = new Group();
    exhibit.name = `Graffiti: ${art.title}`;
    // Standing off the wall's face, turned to face into the room.
    exhibit.position.set(
      hang.x + Math.sin(hang.facing) * hang.off,
      0,
      hang.z + Math.cos(hang.facing) * hang.off,
    );
    exhibit.rotation.y = hang.facing;
    room.add(exhibit);
    const panel = new Mesh(new BoxGeometry(PANEL.w, PANEL.h, 0.06), concrete);
    panel.position.y = PANEL.y;
    exhibit.add(panel);
    const width = PANEL.w - 0.12;
    const material = new MeshStandardMaterial({
      map: graffitiTexture(art),
      transparent: true,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    artMaterials.push(material);
    const paint = new Mesh(
      new PlaneGeometry(width, width / GRAFFITI_ASPECT),
      material,
    );
    paint.position.set(0, PANEL.y, 0.031);
    exhibit.add(paint);
    // The gallery label, on a little white card under it.
    const card = new Mesh(
      new BoxGeometry(0.42, 0.13, 0.006),
      kitPaint(kit, '#fbfaf6'),
    );
    card.position.set(PANEL.w / 2 - 0.25, PANEL.y - PANEL.h / 2 - 0.16, 0);
    exhibit.add(card);
    const label = createMicroLabel(
      kit,
      `${i + 1}. ${art.title.toUpperCase()}\n${GRAFFITI_KIND_NAMES[art.kind]}`,
      { height: 0.022, ink: '#1d1f21', maxWidth: 0.38 },
    );
    label.position.set(card.position.x, card.position.y, 0.004);
    exhibit.add(label);
    // Its number, big, on a black plate at the panel's top left corner,
    // so it can be named from across the room.
    const number = createMicroLabel(kit, String(i + 1), {
      height: 0.16,
      ink: '#f5f5f5',
      plate: '#141414',
    });
    number.position.set(
      -PANEL.w / 2 + 0.16,
      PANEL.y + PANEL.h / 2 - 0.14,
      0.035,
    );
    exhibit.add(number);
  });

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev16', devPortals('dev16', bounds, m), 0, m);
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
    room: { x: 0, z: 9 * m, yaw: 0, pitch: 0 },
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
    solids: () => [...outer, ...dividers],
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
  (window as unknown as { devGraffiti: unknown }).devGraffiti = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    pieces: () => GRAFFITI.map((p, i) => `${i + 1}. ${p.title} (${p.kind})`),
    /**
     * Lay every piece out, numbered, on one sheet over the view, to look
     * through them at once; `sheet(false)` takes it away.
     */
    sheet(show = true) {
      document.getElementById('graffiti-sheet')?.remove();
      if (!show) return;
      const columns = 7;
      const cell = { w: 240, h: 150 + 22 };
      const sheet = document.createElement('canvas');
      sheet.id = 'graffiti-sheet';
      sheet.width = columns * cell.w;
      sheet.height = Math.ceil(GRAFFITI.length / columns) * cell.h;
      Object.assign(sheet.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#8f8c85',
        zIndex: '10',
      });
      const ctx = sheet.getContext('2d')!;
      ctx.fillStyle = '#8f8c85';
      ctx.fillRect(0, 0, sheet.width, sheet.height);
      GRAFFITI.forEach((art, i) => {
        const x = (i % columns) * cell.w;
        const y = Math.floor(i / columns) * cell.h;
        const image = graffitiTexture(art).image as HTMLCanvasElement;
        ctx.drawImage(image, x + 4, y + 22, cell.w - 8, 150 - 4);
        ctx.fillStyle = '#141414';
        ctx.fillRect(x + 4, y + 2, cell.w - 8, 20);
        ctx.fillStyle = '#f5f5f5';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${i + 1}. ${art.title}`, x + 10, y + 17, cell.w - 20);
      });
      document.body.append(sheet);
    },
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
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    for (const material of artMaterials) material.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devGraffiti?: unknown }).devGraffiti;
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
