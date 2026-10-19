import { signal, computed } from '@preact/signals-core';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { createCanvasTexture } from '../../components/core/views/screens';
import { seeded } from '../../components/core/views/worn-paint';
import { mergeStatic } from '../../components/core/views/merge-static';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { brandById } from '../../components/core/logic/brands';
import { createPartSet } from '../../components/core/parts/parts';
import {
  radiator,
  thermostat,
} from '../../components/architectural/parts/building-parts';
import { callPoint } from '../../components/fire/parts/fire-parts';
import { architecturalPart } from '../../components/architectural/parts/architectural-parts';
import {
  securedDoor,
  slidingEntrance,
} from '../../components/architectural/parts/reception-parts';
import {
  createAirCurtain,
  createWayfindingSign,
} from '../../components/architectural/views/reception-fittings';
import { sensed } from '../../components/architectural/logic/sliding-door';
import {
  createBadgeTray,
  createBrochureRack,
  createCourseRegister,
  createDeskMonitor,
  createDeskPhone,
  createKeyboard,
  createLowTable,
  createReceptionChair,
  createReceptionDesk,
  createVisitorBook,
  createWallClock,
  onArc,
  place,
} from '../../components/site-dressing/views/reception-props';
import { createOfficeChair } from '../../components/site-dressing/views/office-chair';
import { devWalls } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * dev23, the Reception: the front of house of the training and
 * distribution office, fitted out in the late 1990s and still doing its
 * job today. Built in metres, the floor at y = 0, north (−z) the wall
 * behind the desk, east (+x) the glazed entrance onto the trading estate,
 * west the way through to the corridor (the room's spring door, which the
 * gallery's portals draw) and the secured door upstairs.
 */
export const RECEPTION_BOUNDS = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
/** The suspended ceiling's height, metres. */
export const RECEPTION_CEILING = 2.7;
/** The middle of the entrance along the east wall, metres. */
export const ENTRANCE_Z = 0.5;
/** The wall's inner face, where fittings hang. */
const FACE = 0.15;
/** The window in the east wall: from z0 to z1, sill and head heights. */
const WINDOW = { z0: -4.4, z1: -1.8, sill: 0.9, head: 2.2 };
/** The curved desk: the middle of its ring, its radius, and its sweep. */
export const DESK = { x: -1.4, z: -5.4, radius: 2.9, from: -0.96, to: 0.66 };
/** The waiting area's three chairs, along the south wall. */
const CHAIRS = [1.4, 2.1, 2.8];
/** The low table in front of them. */
const TABLE = { x: 2.1, z: 3.55 };
/** Where the secured door to the first floor is, on the west wall. */
const UPSTAIRS_Z = -2.2;
/** The ceiling's recessed 1200 × 600 fittings, on the 600 mm grid. */
export const FITTINGS = [-3.6, 0, 3.6].flatMap((x) =>
  [-2.9, 0.1, 3.1].map((z) => ({ x, z })),
);
/** The company whose reception this is. */
const BRAND = 'neumann-dynamik' as const;

/** Named places to stand, metres: x, z, yaw (0 north, π/2 east), pitch. */
export const RECEPTION_VIEWS: Record<
  string,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  entrance: { x: 4.4, z: ENTRANCE_Z, yaw: -Math.PI / 2, pitch: -0.05 },
  desk: { x: -1.2, z: -1.2, yaw: 0, pitch: -0.18 },
  behind: { x: -1.4, z: -4.0, yaw: Math.PI * 0.85, pitch: -0.1 },
  waiting: { x: 2.1, z: 1.9, yaw: Math.PI, pitch: -0.15 },
  upstairs: { x: -3.9, z: UPSTAIRS_Z - 0.3, yaw: -Math.PI / 2, pitch: -0.05 },
  outside: { x: 4.6, z: ENTRANCE_Z, yaw: Math.PI / 2, pitch: -0.02 },
  room: { x: 5.2, z: 4.3, yaw: -Math.PI / 4, pitch: -0.1 },
};

export function createReception(kit: PanelKit) {
  const group = new Group();
  group.name = 'Reception';
  const inside = new Group();
  const outside = new Group();
  /** What moves, works or is lit: never merged. */
  const working = new Group();
  group.add(inside, outside, working);
  const solids: Footprint[] = [];
  const parts = createPartSet();
  const random = seeded(1998);
  const { minX, maxX, minZ, maxZ } = RECEPTION_BOUNDS;
  const H = RECEPTION_CEILING;

  // ---- Drawing tools -------------------------------------------------------
  const paint = (
    color: string,
    roughness = 0.75,
    metalness = 0,
    extra: Record<string, unknown> = {},
  ) => {
    const material = createPs1Material({
      color,
      roughness,
      metalness,
      ...extra,
    });
    kit.materials.push(material);
    return material;
  };
  const lit = (options: { color?: string; map?: Texture }) => {
    const material = createPs1Material(options, true, true);
    kit.materials.push(material);
    return material;
  };
  const texture = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
    repeat = false,
  ) => {
    const { context, texture } = createCanvasTexture(w, h);
    draw(context, w, h);
    texture.needsUpdate = true;
    if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
    kit.textures.push(texture);
    return texture;
  };
  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A horizontal plane, its UVs repeating every `tile` metres if given. */
  const flat = (
    parent: Object3D,
    material: Material,
    w: number,
    d: number,
    x: number,
    y: number,
    z: number,
    tile = 0,
    down = false,
  ) => {
    const geometry = new PlaneGeometry(w, d);
    if (tile) {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    }
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A solid footprint, metres, from (x0, z0) to (x1, z1). */
  const solid = (x0: number, z0: number, x1: number, z1: number) =>
    solids.push({
      minX: Math.min(x0, x1),
      maxX: Math.max(x0, x1),
      minZ: Math.min(z0, z1),
      maxZ: Math.max(z0, z1),
    });
  /** Hang `object` on a wall's inner face, facing into the room. */
  const onWall = (
    parent: Object3D,
    object: Object3D,
    wall: 'north' | 'south' | 'east' | 'west',
    along: number,
    y: number,
    off = 0,
  ) => {
    const d = FACE + off;
    if (wall === 'north') place(parent, object, along, y, minZ + d, 0);
    if (wall === 'south') place(parent, object, along, y, maxZ - d, Math.PI);
    if (wall === 'west') place(parent, object, minX + d, y, along, Math.PI / 2);
    if (wall === 'east')
      place(parent, object, maxX - d, y, along, -Math.PI / 2);
    return object;
  };

  // ---- Materials -----------------------------------------------------------
  const wallPaint = paint('#efe7d6', 0.9);
  const skirting = paint('#b7bbbc', 0.5);
  const alu = paint('#a9adb0', 0.35, 0.6);
  const whitePlastic = paint('#f1f0ea', 0.45);
  const glass = paint('#b9c9cc', 0.05, 0, {
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });

  // ---- Floor: muted teal carpet tiles, 500 mm, laid quarter-turned -----------
  const carpet = texture(
    256,
    256,
    (c, w, h) => {
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * (w / 2);
        const y = Math.floor(i / 2) * (h / 2);
        c.fillStyle = i % 3 ? '#3f6a72' : '#3b646d';
        c.fillRect(x, y, w / 2, h / 2);
        // The pile's rows, turned a quarter on alternate tiles.
        c.strokeStyle = 'rgba(30,52,58,0.35)';
        for (let k = 2; k < w / 2; k += 3) {
          c.beginPath();
          if (i % 3) {
            c.moveTo(x + k, y);
            c.lineTo(x + k, y + h / 2);
          } else {
            c.moveTo(x, y + k);
            c.lineTo(x + w / 2, y + k);
          }
          c.stroke();
        }
      }
      for (let i = 0; i < 3000; i++) {
        const tone = 70 + Math.floor(random() * 80);
        c.fillStyle = `rgba(${tone - 20},${tone + 30},${tone + 40},0.3)`;
        c.fillRect(random() * w, random() * h, 1.2, 1.2);
      }
      c.strokeStyle = 'rgba(25,40,45,0.5)';
      c.lineWidth = 1;
      c.strokeRect(0.5, 0.5, w / 2 - 1, h / 2 - 1);
      c.strokeRect(w / 2 + 0.5, h / 2 + 0.5, w / 2 - 1, h / 2 - 1);
    },
    true,
  );
  flat(
    inside,
    paint('#ffffff', 0.98, 0, { map: carpet }),
    maxX - minX,
    maxZ - minZ,
    0,
    0,
    0,
    1,
  );
  // Inside the doors, a recessed barrier mat in an aluminium frame.
  const matTexture = texture(
    128,
    128,
    (c, w, h) => {
      c.fillStyle = '#3a3532';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a2624';
      for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 3, h);
    },
    true,
  );
  const mat = {
    x0: 4.05,
    x1: maxX - FACE,
    z0: ENTRANCE_Z - 1.2,
    z1: ENTRANCE_Z + 1.2,
  };
  flat(
    inside,
    paint('#ffffff', 1, 0, { map: matTexture }),
    mat.x1 - mat.x0,
    mat.z1 - mat.z0,
    (mat.x0 + mat.x1) / 2,
    0.003,
    ENTRANCE_Z,
    0.4,
  );
  for (const z of [mat.z0, mat.z1])
    box(
      inside,
      alu,
      mat.x1 - mat.x0,
      0.006,
      0.02,
      (mat.x0 + mat.x1) / 2,
      0.003,
      z,
    );
  box(inside, alu, 0.02, 0.006, mat.z1 - mat.z0, mat.x0, 0.003, ENTRANCE_Z);
  // Modest wear: the pile a little flattened off the mat and before the desk.
  const wear = texture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(150,170,170,0.16)');
    g.addColorStop(1, 'rgba(150,170,170,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const worn = paint('#ffffff', 1, 0, {
    map: wear,
    transparent: true,
    depthWrite: false,
  });
  flat(inside, worn, 1.4, 1.8, mat.x0 - 0.6, 0.002, ENTRANCE_Z, 0);
  flat(
    inside,
    worn,
    1.8,
    1.0,
    DESK.x + 0.2,
    0.002,
    DESK.z + DESK.radius + 0.6,
    0,
  );

  // ---- Ceiling: 600 mm mineral tiles, recessed fittings -----------------------
  const tile = texture(
    128,
    128,
    (c, w, h) => {
      c.fillStyle = '#e8e5dc';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 240; i++) {
        c.fillStyle = `rgba(120,116,104,${0.2 + random() * 0.3})`;
        c.fillRect(random() * w, random() * h, 1.4, 1.4);
      }
      c.strokeStyle = '#f7f7f3';
      c.lineWidth = 4;
      c.strokeRect(0, 0, w, h);
      c.strokeStyle = 'rgba(90,90,84,0.35)';
      c.lineWidth = 1;
      c.strokeRect(2.5, 2.5, w - 5, h - 5);
    },
    true,
  );
  flat(
    inside,
    paint('#ffffff', 0.95, 0, { map: tile }),
    maxX - minX,
    maxZ - minZ,
    0,
    H,
    0,
    0.6,
    true,
  );
  // 1200 × 600 Category 2 fittings: three tubes behind a parabolic louvre.
  const louvre = texture(256, 128, (c, w, h) => {
    c.fillStyle = '#fbfbf5';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a6aaab';
    c.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(0, (i * h) / 3);
      c.lineTo(w, (i * h) / 3);
      c.stroke();
    }
    c.lineWidth = 1.5;
    for (let i = 1; i < 20; i++) {
      c.beginPath();
      c.moveTo((i * w) / 20, 0);
      c.lineTo((i * w) / 20, h);
      c.stroke();
    }
  });
  const fitting = lit({ map: louvre, color: '#f4f6ef' });
  const trim = paint('#f2f1ea', 0.5);
  for (const { x, z } of FITTINGS) {
    flat(inside, trim, 1.2, 0.6, x, H - 0.003, z, 0, true);
    flat(inside, fitting, 1.16, 0.56, x, H - 0.006, z, 0, true);
  }
  // Smoke detectors and emergency downlights in the tiles.
  for (const [x, z] of [
    [-3.0, 1.6],
    [2.4, -1.6],
  ]) {
    const head = new Mesh(
      new CylinderGeometry(0.05, 0.05, 0.045, 16),
      whitePlastic,
    );
    head.position.set(x, H - 0.022, z);
    inside.add(head);
  }
  for (const [x, z] of [
    [4.8, ENTRANCE_Z - 1.6],
    [-4.8, 3.9],
    [-4.6, UPSTAIRS_Z],
  ])
    flat(
      inside,
      lit({ color: '#f6f6f0' }),
      0.085,
      0.085,
      x,
      H - 0.004,
      z,
      0,
      true,
    );

  // ---- Walls ---------------------------------------------------------------
  const wallHeight = H + 0.3;
  const walls = devWalls(RECEPTION_BOUNDS, 1, wallHeight);
  // North, south and west are solid; the east is built round its openings.
  for (const piece of walls.slice(0, 3))
    box(
      inside,
      wallPaint,
      piece.maxX - piece.minX,
      piece.top - piece.bottom,
      piece.maxZ - piece.minZ,
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
  const entrance0 = ENTRANCE_Z - 1.7;
  const entrance1 = ENTRANCE_Z + 1.7;
  const eastPiece = (z0: number, z1: number, y0: number, y1: number) =>
    box(
      inside,
      wallPaint,
      0.3,
      y1 - y0,
      z1 - z0,
      maxX,
      (y0 + y1) / 2,
      (z0 + z1) / 2,
    );
  eastPiece(minZ - 0.15, WINDOW.z0, 0, wallHeight);
  eastPiece(WINDOW.z0, WINDOW.z1, 0, WINDOW.sill);
  eastPiece(WINDOW.z0, WINDOW.z1, WINDOW.head, wallHeight);
  eastPiece(WINDOW.z1, entrance0, 0, wallHeight);
  eastPiece(entrance0, entrance1, 2.25, wallHeight);
  eastPiece(entrance1, maxZ + 0.15, 0, wallHeight);
  // Light-grey skirting, 100 mm, round every wall but the openings.
  const skirt = (x0: number, z0: number, x1: number, z1: number) => {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    box(
      inside,
      skirting,
      along ? Math.abs(x1 - x0) : 0.015,
      0.1,
      along ? 0.015 : Math.abs(z1 - z0),
      (x0 + x1) / 2,
      0.05,
      (z0 + z1) / 2,
    );
  };
  skirt(minX, minZ + FACE + 0.0075, maxX, minZ + FACE + 0.0075);
  skirt(minX, maxZ - FACE - 0.0075, maxX, maxZ - FACE - 0.0075);
  // The west wall's skirting stops at its two doors.
  const westX = minX + FACE + 0.0075;
  skirt(westX, minZ, westX, UPSTAIRS_Z - 0.58);
  skirt(westX, UPSTAIRS_Z + 0.58, westX, maxZ - 1.1 - 0.56);
  skirt(westX, maxZ - 1.1 + 0.56, westX, maxZ);
  const eastX = maxX - FACE - 0.0075;
  skirt(eastX, minZ, eastX, entrance0);
  skirt(eastX, entrance1, eastX, maxZ);

  // The window: natural-anodised aluminium, a mullion, a window board.
  const wz = (WINDOW.z0 + WINDOW.z1) / 2;
  const ww = WINDOW.z1 - WINDOW.z0;
  const wh = WINDOW.head - WINDOW.sill;
  const pane = new Mesh(new PlaneGeometry(ww, wh), glass);
  pane.rotation.y = -Math.PI / 2;
  pane.position.set(maxX, (WINDOW.sill + WINDOW.head) / 2, wz);
  inside.add(pane);
  for (const y of [WINDOW.sill + 0.03, WINDOW.head - 0.03])
    box(inside, alu, 0.1, 0.06, ww, maxX, y, wz);
  for (const z of [WINDOW.z0 + 0.03, wz, WINDOW.z1 - 0.03])
    box(inside, alu, 0.1, wh, 0.06, maxX, (WINDOW.sill + WINDOW.head) / 2, z);
  box(
    inside,
    paint('#e9e6dc', 0.4),
    0.2,
    0.025,
    ww + 0.1,
    maxX - FACE - 0.02,
    WINDOW.sill,
    wz,
  );

  // ---- The entrance: sliding doors, their air curtain, a call point ---------
  const entrance = parts.add(slidingEntrance(kit));
  onWall(working, entrance.object, 'east', ENTRANCE_Z, 0);
  const curtain = createAirCurtain(kit);
  onWall(inside, curtain.group, 'east', ENTRANCE_Z, 2.42);
  const call = signal(false);
  const callPart = parts.add(
    callPoint(kit, {
      latched: call,
      press: () => (call.value = true),
      reset: () => (call.value = false),
    }),
  );
  onWall(working, callPart.object, 'east', entrance1 + 0.45, 1.4);
  // A maintained exit sign hung over the way out, facing those leaving.
  const exit = parts.add(architecturalPart(kit, 'exit'));
  place(working, exit.object, maxX - 1.6, H - 0.3, ENTRANCE_Z, -Math.PI / 2);
  for (const dz of [-0.15, 0.15])
    box(
      inside,
      alu,
      0.006,
      0.2,
      0.006,
      maxX - 1.6 + 0.03,
      H - 0.1,
      ENTRANCE_Z + dz,
    );
  // The window's radiator under it.
  const valve = bind(3);
  const radiatorPart = parts.add(
    radiator(kit, { valve, heat: computed(() => valve.value / 5) }),
  );
  onWall(working, radiatorPart.object, 'east', wz, 0);
  solid(maxX - FACE - 0.15, wz - 0.55, maxX, wz + 0.55);

  // ---- The desk, and the company behind it ---------------------------------
  const desk = createReceptionDesk(kit, DESK);
  desk.group.position.set(DESK.x, 0, DESK.z);
  inside.add(desk.group);
  const at = (r: number, a: number) => {
    const p = onArc(r, a);
    return { x: DESK.x + p.x, z: DESK.z + p.z };
  };
  // Its footprint: squares along the ring.
  for (let a = DESK.from; a <= DESK.to + 0.01; a += 0.12) {
    const p = at(DESK.radius - 0.42, a);
    solid(p.x - 0.42, p.z - 0.42, p.x + 0.42, p.z + 0.42);
  }
  // A return from its west end to the wall, so the way behind is at the
  // east end: the receptionist's opening.
  const westEnd = at(DESK.radius, DESK.from);
  const returnZ0 = minZ + FACE;
  box(
    inside,
    paint('#d2b088', 0.55),
    0.025,
    1.08,
    westEnd.z - returnZ0,
    westEnd.x,
    0.54,
    (westEnd.z + returnZ0) / 2,
  );
  solid(westEnd.x - 0.1, returnZ0, westEnd.x + 0.1, westEnd.z);
  const surface = 0.745;
  const counter = 1.11;
  const inward = (a: number) => a + Math.PI;
  const monitor = createDeskMonitor(kit);
  let p = at(DESK.radius - 0.52, -0.12);
  place(inside, monitor.group, p.x, surface, p.z, inward(-0.12));
  p = at(DESK.radius - 0.72, -0.1);
  place(inside, createKeyboard(kit), p.x, surface, p.z, inward(-0.1));
  p = at(DESK.radius - 0.6, 0.22);
  place(inside, createDeskPhone(kit), p.x, surface, p.z, inward(0.22) - 0.3);
  p = at(DESK.radius - 0.14, 0.04);
  place(inside, createVisitorBook(kit), p.x, counter, p.z, 0.04);
  p = at(DESK.radius - 0.16, -0.24);
  place(inside, createBadgeTray(kit), p.x, counter, p.z, -0.24);
  p = at(DESK.radius - 0.17, 0.32);
  place(inside, createCourseRegister(kit, BRAND), p.x, counter, p.z, 0.25);
  const chair = createOfficeChair(1);
  place(
    inside,
    chair.group,
    DESK.x - 0.1,
    0,
    DESK.z + DESK.radius - 1.45,
    Math.PI,
  );
  // The company's logo on the wall behind the desk, and its name below.
  const logo = createBrandBadge(kit, BRAND, { height: 0.36 });
  onWall(inside, logo, 'north', DESK.x, 1.78, 0.004);
  const name = makeStrapline(
    kit,
    brandById(BRAND).tagline,
    brandById(BRAND).colours[0],
  );
  onWall(inside, name, 'north', DESK.x, 1.48, 0.004);

  // ---- Waiting area ----------------------------------------------------------
  for (const x of CHAIRS) {
    const seat = createReceptionChair(kit, '#4b4466');
    place(inside, seat, x, 0, maxZ - FACE - 0.34, Math.PI);
  }
  solid(CHAIRS[0] - 0.35, maxZ - FACE - 0.65, CHAIRS[2] + 0.35, maxZ);
  place(inside, createLowTable(kit), TABLE.x, 0, TABLE.z);
  solid(TABLE.x - 0.52, TABLE.z - 0.3, TABLE.x + 0.52, TABLE.z + 0.3);
  onWall(inside, createBrochureRack(kit, BRAND), 'south', 0.45, 0.95);
  // A wall clock over the chairs, keeping time.
  const clock = createWallClock(kit);
  onWall(inside, clock.face, 'south', TABLE.x, 2.15);
  onWall(working, clock.hands, 'south', TABLE.x, 2.15);

  // ---- West wall: the way to the corridor, and upstairs ------------------------
  const wayfinding = createWayfindingSign(kit, {
    title: 'Ground floor',
    lines: [
      ['Training rooms', -90],
      ['Warehouse', -90],
      ['Toilets', -90],
    ],
    colour: brandById(BRAND).colours[0],
    accent: brandById(BRAND).colours[1],
    w: 0.7,
    h: 0.46,
  });
  onWall(inside, wayfinding, 'west', maxZ - 1.1 - 1.25, 1.55);
  const upstairs = parts.add(securedDoor(kit, 'First floor offices'));
  onWall(working, upstairs.object, 'west', UPSTAIRS_Z, 0);
  const setPoint = bind(20);
  const stat = parts.add(
    thermostat(kit, {
      bound: setPoint,
      calling: computed(() => setPoint.value > 19),
    }),
  );
  onWall(working, stat.object, 'west', -3.6, 1.5);

  // ---- Outside: the trading estate through the glass --------------------------
  buildOutside();

  // Flatten everything still into a few meshes.
  group.updateMatrixWorld(true);
  mergeStatic(inside, 16, new Set(), { share: true });
  mergeStatic(outside, 80, new Set(), { share: true });
  for (const leaf of entrance.leaves) mergeStatic(leaf, 16);
  mergeStatic(entrance.object, 16, new Set(entrance.leaves));

  return {
    group,
    solids,
    parts,
    entrance,
    /** Where the fittings are, for the room to light from. */
    lights: FITTINGS.map(({ x, z }) => ({ x, y: H - 0.1, z })),
    /** Run the clock and the doors' sensor; `x`, `z` where the walker is, metres. */
    update(delta: number, x: number, z: number, now = new Date()) {
      entrance.sense(sensed(maxX - FACE - x, z - ENTRANCE_Z));
      parts.update(delta);
      clock.set(now);
    },
    dispose() {
      parts.dispose();
      chair.dispose();
    },
  };

  /**
   * The trading estate east of the entrance, under a grey sky: block
   * paving, a kerb and a row of visitor bays (empty this early), the
   * estate road, and across it the opposite unit behind its car park.
   * Every parked car stands 30 m or more from the glass.
   */
  function buildOutside() {
    const ground = paint('#6c7550', 0.95);
    flat(outside, ground, 600, 600, 0, -0.04, 0);
    const blocks = texture(
      128,
      128,
      (c, w, h) => {
        c.fillStyle = '#8a7a6c';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#6a5d52';
        c.lineWidth = 2;
        // 200 × 100 mm blocks laid in herringbone, roughly: stretcher rows.
        for (let row = 0; row < 8; row++) {
          const y = (row * h) / 8;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(w, y);
          c.stroke();
          for (let k = 0; k < 4; k++) {
            const x = ((k + (row % 2) * 0.5) * w) / 4;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x, y + h / 8);
            c.stroke();
          }
        }
        for (let i = 0; i < 900; i++) {
          const tone = 110 + Math.floor(random() * 50);
          c.fillStyle = `rgba(${tone},${tone - 12},${tone - 24},0.4)`;
          c.fillRect(random() * w, random() * h, 2, 2);
        }
      },
      true,
    );
    const paving = paint('#ffffff', 0.9, 0, { map: blocks });
    const tarmacMap = texture(
      128,
      128,
      (c, w, h) => {
        c.fillStyle = '#4b4d4f';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) {
          const tone = 50 + Math.floor(random() * 50);
          c.fillStyle = `rgba(${tone},${tone},${tone + 2},0.6)`;
          c.fillRect(random() * w, random() * h, 1.2, 1.2);
        }
      },
      true,
    );
    const tarmac = paint('#ffffff', 0.92, 0, { map: tarmacMap });
    const kerb = paint('#a9a69e', 0.85);
    const line = paint('#e6e4da', 0.8);
    const brick = paint('#8a5a44', 0.9);
    const x0 = maxX + 0.15;
    // Block paving in front, 8 m out and 30 m along.
    flat(outside, paving, 8, 30, x0 + 4, 0.002, 0, 0.8);
    box(outside, kerb, 0.15, 0.12, 30, x0 + 8, 0.06, 0);
    // Visitor bays: 2.4 × 4.8 m, white lines, VISITOR on two.
    flat(outside, tarmac, 11, 60, x0 + 13.5, 0.001, 0, 6);
    for (let z = -12; z <= 12; z += 2.4)
      flat(outside, line, 4.8, 0.1, x0 + 10.5, 0.005, z);
    flat(outside, line, 0.1, 24, x0 + 12.9, 0.005, 0);
    const visitor = createStencil(kit, 'VISITOR');
    for (const z of [-0.0, 2.4]) {
      const v = visitor.clone();
      v.position.set(x0 + 11.5, 0.006, z + 1.2);
      outside.add(v);
    }
    // The estate road and its footways.
    flat(outside, paving, 2, 200, x0 + 20, 0.03, 0, 0.8);
    flat(outside, tarmac, 7.3, 200, x0 + 24.65, 0.0, 0, 6);
    for (let z = -96; z < 96; z += 9)
      flat(outside, line, 0.1, 3, x0 + 24.65, 0.004, z);
    flat(outside, paving, 2, 200, x0 + 29.3, 0.03, 0, 0.8);
    // Street lights along the far footway.
    const column = paint('#5d6265', 0.5, 0.5);
    for (const z of [-30, 0, 30]) {
      box(outside, column, 0.14, 8, 0.14, x0 + 29.6, 4, z);
      box(outside, column, 0.7, 0.15, 0.3, x0 + 29.3, 8, z);
    }
    // Across the road: the opposite unit's car park and the unit.
    const parkX = x0 + 31;
    flat(outside, tarmac, 18, 80, parkX + 9, 0.001, 0, 6);
    const carColours = [
      '#b9bcbe',
      '#1d2b4a',
      '#7d1d22',
      '#e9e9e4',
      '#1b1b1c',
      '#3c5a7a',
    ].map((c) => paint(c, 0.32, 0.35));
    const carGlass = paint('#20282c', 0.1, 0.4);
    for (let z = -30; z <= 30; z += 2.4) {
      flat(outside, line, 4.8, 0.1, parkX + 3, 0.005, z);
      if (random() > 0.55) continue;
      const body = carColours[Math.floor(random() * carColours.length)];
      box(outside, body, 4.2, 0.62, 1.72, parkX + 3, 0.55, z + 1.2);
      box(outside, carGlass, 2.1, 0.45, 1.5, parkX + 2.9, 1.08, z + 1.2);
    }
    const unitX = parkX + 18;
    box(outside, paint('#a3a9a2', 0.75, 0.15), 26, 8.4, 70, unitX + 13, 4.2, 0);
    box(outside, paint('#3a3e41', 0.7), 26.2, 0.3, 70.2, unitX + 13, 8.55, 0);
    // Its face: a band of offices and a loading door.
    const facade = texture(512, 128, (c, w, h) => {
      c.fillStyle = '#a3a9a2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#2b3439';
      for (let x = 8; x < w * 0.55; x += 24)
        c.fillRect(x, h * 0.3, 18, h * 0.22);
      c.fillStyle = '#8c9396';
      for (let x = w * 0.62; x < w; x += 70) {
        c.fillRect(x, h * 0.25, 52, h * 0.75);
        c.strokeStyle = '#7a8184';
        for (let y = h * 0.25; y < h; y += 4) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 52, y);
          c.stroke();
        }
      }
      c.fillStyle = '#1e2d4f';
      c.fillRect(w * 0.08, h * 0.08, w * 0.18, h * 0.12);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.09}px Arial, Helvetica, sans-serif`;
      c.fillText('UNIT 9', w * 0.1, h * 0.17);
    });
    const face = new Mesh(
      new PlaneGeometry(70, 8.4),
      paint('#ffffff', 0.8, 0, { map: facade }),
    );
    face.rotation.y = -Math.PI / 2;
    face.position.set(unitX - 0.02, 4.2, 0);
    outside.add(face);
    // This building's own brick, either side of the room.
    for (const [z0, z1] of [
      [-40, minZ - 0.15],
      [maxZ + 0.15, 40],
    ])
      box(outside, brick, 0.3, 7.6, z1 - z0, maxX, 3.8, (z0 + z1) / 2);
    box(
      outside,
      brick,
      0.3,
      7.6 - wallHeight,
      maxZ - minZ + 0.3,
      maxX,
      (7.6 + wallHeight) / 2,
      0,
    );
  }
}

/** The company's tagline under its logo, in its own colour. */
function makeStrapline(kit: PanelKit, text: string, colour: string) {
  const { context: c, texture } = createCanvasTexture(512, 48);
  c.clearRect(0, 0, 512, 48);
  c.fillStyle = colour;
  c.font = 'italic 30px Georgia, serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 24);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  kit.materials.push(material);
  return new Mesh(new PlaneGeometry(1.0, 0.094), material);
}

/** Lettering painted on the tarmac, read from the bay's end. */
function createStencil(kit: PanelKit, text: string) {
  const { context: c, texture } = createCanvasTexture(256, 64);
  c.clearRect(0, 0, 256, 64);
  c.fillStyle = '#e6e4da';
  c.font = 'bold 48px Arial, Helvetica, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 128, 34);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    transparent: true,
    alphaTest: 0.4,
  });
  kit.materials.push(material);
  const mesh = new Mesh(new PlaneGeometry(1.6, 0.4), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}

/** A value a part can show and set. */
function bind<T>(initial: T) {
  const value = signal(initial);
  return Object.assign(value, {
    set(next: T) {
      value.value = next;
    },
  });
}

export type Reception = ReturnType<typeof createReception>;
