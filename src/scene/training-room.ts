import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Material, MeshStandardMaterialParameters, Texture } from 'three';
import {
  BAY,
  CASSETTES,
  CEILING,
  FIRE_EXIT,
  FLOOR_BOXES,
  HEAD,
  LIGHTS,
  MOTION_SENSORS,
  SILL,
  SMOKE_DETECTORS,
  SPEAKERS,
  TILE,
  TRAINING_BOUNDS,
  bays,
  isFireExitBay,
} from '../game/training-room-plan';
import type { Footprint } from '../game/walk-collision';
import { createPs1Material } from '../rendering/ps1-material';
import type { PanelKit } from './eighties-controls';
import { mergeStatic } from './merge-static';
import { createCanvasTexture } from './screens';
import { seeded } from './worn-paint';

const SANS = 'Arial, Helvetica, sans-serif';
const { minX, maxX, minZ, maxZ } = TRAINING_BOUNDS;
/** Half the walls' thickness: their inner faces stand this far inside. */
const HALF_WALL = 0.15;

/**
 * The training room (see `training-room-plan.ts`): a large, unremarkable,
 * empty meeting room in an English trading-estate office of the 1990s,
 * kept clean and tidy by a respectable company. Magnolia plasterboard
 * walls; a suspended ceiling of speckled mineral tiles in a white grid,
 * with recessed Category 2 fluorescent fittings, air-conditioning
 * cassettes, smoke detectors, motion sensors and speakers; a hard vinyl
 * floor on a raised access floor with flip-lid floor boxes, all shut. Grey
 * aluminium ribbon windows on the south and east walls, their top vents on
 * restrictors, behind vertical blinds; low-surface-temperature radiators
 * under the window boards; a glazed fire exit in the east glazing under a
 * green running-man sign. On the internal walls: white dado trunking with
 * three-pin sockets, a clean whiteboard under a rolled-up projector
 * screen, a pinboard, a clock, the fire alarm call point, sounder and FIRE
 * ACTION notice, a light switch, an air-conditioning controller, a hearing
 * loop sign, a notice asking that the room be left as it was found, and
 * extinguishers on a stand. Stacked chairs, folding tables on their edges,
 * a flip chart with a clean pad and a bin are all the furniture.
 *
 * Outside is the trading estate (`buildOutside`).
 *
 * Built in metres, on the floor at y = 0. `update` runs the clock.
 */
export function createTrainingRoom(kit: PanelKit) {
  const group = new Group();
  group.name = 'Training room';
  const inside = new Group();
  const outside = new Group();
  group.add(inside, outside);
  const solids: Footprint[] = [];
  const random = seeded(1997);

  const paint = (
    color: string,
    roughness = 0.75,
    metalness = 0,
    extra: MeshStandardMaterialParameters = {},
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
  /** A self-lit material: lamps and lit signs. */
  const lit = (options: { color?: string; map?: Texture }) => {
    const material = createPs1Material(options, true, true);
    kit.materials.push(material);
    return material as MeshBasicMaterial;
  };
  const texture = (
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
    repeat = false,
  ) => {
    const { context, texture } = createCanvasTexture(width, height);
    draw(context, width, height);
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
  /** A plane facing +z, its UVs repeating every `tile` metres if given. */
  const plane = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    tile = 0,
  ) => {
    const geometry = new PlaneGeometry(w, h);
    if (tile) {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
    }
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A flat thing on the ground (or a ceiling), facing up or down. */
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
    const mesh = plane(parent, material, w, d, x, y, z, tile);
    mesh.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
    return mesh;
  };
  const cylinder = (
    parent: Object3D,
    material: Material,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    segments = 12,
  ) => {
    const mesh = new Mesh(new CylinderGeometry(r, r, h, segments), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** Lettering on a printed sheet or sign, `w` × `h` metres. */
  const sign = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
    pixels = 400,
    glow = false,
  ) => {
    const map = texture(Math.round(pixels), Math.round((pixels * h) / w), draw);
    const material = glow ? lit({ map }) : paint('#ffffff', 0.85, 0, { map });
    return new Mesh(new PlaneGeometry(w, h), material);
  };
  const solid = (x0: number, z0: number, x1: number, z1: number) =>
    solids.push({
      minX: Math.min(x0, x1),
      maxX: Math.max(x0, x1),
      minZ: Math.min(z0, z1),
      maxZ: Math.max(z0, z1),
    });

  // ---- Materials -----------------------------------------------------------
  const magnolia = paint('#ebe1c8', 0.88);
  const white = paint('#f2f1ea', 0.5);
  const whitePlastic = paint('#efeee6', 0.4);
  const alu = paint('#5c6267', 0.45, 0.45);
  const chrome = paint('#c9cccc', 0.2, 0.9);
  const black = paint('#1b1c1d', 0.6);
  const skirting = paint('#4c5054', 0.6);
  const red = paint('#b4231d', 0.45);
  const glass = paint('#a8b9bc', 0.04, 0, {
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  // ---- Floor: hard vinyl on a raised access floor --------------------------
  const vinyl = texture(
    256,
    256,
    (c, w, h) => {
      c.fillStyle = '#8b9497';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const tone = 110 + Math.floor(random() * 90);
        c.fillStyle = `rgba(${tone},${tone + 6},${tone + 8},0.35)`;
        c.fillRect(random() * w, random() * h, 1.5, 1.5);
      }
      // The access floor's panels show through the vinyl as faint joints.
      c.strokeStyle = 'rgba(40,46,50,0.35)';
      c.lineWidth = 1.5;
      c.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
    },
    true,
  );
  const floorMaterial = paint('#ffffff', 0.32, 0, { map: vinyl });
  flat(inside, floorMaterial, maxX - minX, maxZ - minZ, 0, 0, 0, TILE);

  // Flip-lid floor boxes: a grey lid in a steel trim, and one left open.
  const socketFace = texture(256, 160, (c, w, h) => {
    c.fillStyle = '#f4f3ee';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d9d8d0';
    c.lineWidth = 4;
    c.strokeRect(2, 2, w - 4, h - 4);
    for (const cx of [w * 0.27, w * 0.73]) {
      // A BS 1363 socket: earth above, line and neutral below; its switch.
      c.fillStyle = '#1c1c1c';
      c.fillRect(cx - 5, h * 0.42, 10, 24);
      c.fillRect(cx - 34, h * 0.68, 20, 9);
      c.fillRect(cx + 14, h * 0.68, 20, 9);
      c.fillStyle = '#e4e3dc';
      c.fillRect(cx - 14, h * 0.1, 28, 22);
      c.fillStyle = '#c4231c';
      c.fillRect(cx - 4, h * 0.13, 8, 5);
    }
  });
  const socketMaterial = paint('#ffffff', 0.45, 0, { map: socketFace });
  const dataFace = texture(128, 128, (c, w, h) => {
    c.fillStyle = '#f4f3ee';
    c.fillRect(0, 0, w, h);
    for (const cx of [w * 0.3, w * 0.7]) {
      c.fillStyle = '#2a2a2a';
      c.fillRect(cx - 14, h * 0.4, 28, 24);
      c.fillStyle = '#2f62b5';
      c.fillRect(cx - 14, h * 0.25, 28, 8);
    }
  });
  const dataMaterial = paint('#ffffff', 0.45, 0, { map: dataFace });
  const lidMaterial = paint('#7f888b', 0.4);
  const trim = paint('#9da3a4', 0.35, 0.6);
  const hole = paint('#141414', 0.9);
  for (const { x, z } of FLOOR_BOXES) {
    flat(inside, trim, 0.33, 0.33, x, 0.002, z);
    flat(inside, lidMaterial, 0.3, 0.3, x, 0.003, z);
    // The cable flap at the lid's edge, shut.
    flat(inside, hole, 0.12, 0.006, x, 0.004, z + 0.14);
  }

  // ---- Ceiling: 600 mm mineral tiles in a white grid ------------------------
  const ceilingTile = texture(
    128,
    128,
    (c, w, h) => {
      c.fillStyle = '#e7e4da';
      c.fillRect(0, 0, w, h);
      // Fissured mineral fibre: worm-like pits.
      for (let i = 0; i < 260; i++) {
        c.strokeStyle = `rgba(120,116,104,${0.25 + random() * 0.3})`;
        c.lineWidth = 0.8;
        const x = random() * w;
        const y = random() * h;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (random() - 0.5) * 5, y + (random() - 0.5) * 5);
        c.stroke();
      }
      c.strokeStyle = '#f6f6f2';
      c.lineWidth = 4;
      c.strokeRect(0, 0, w, h);
      c.strokeStyle = 'rgba(90,90,84,0.4)';
      c.lineWidth = 1;
      c.strokeRect(2.5, 2.5, w - 5, h - 5);
    },
    true,
  );
  const ceilingMaterial = paint('#ffffff', 0.95, 0, { map: ceilingTile });
  flat(
    inside,
    ceilingMaterial,
    maxX - minX,
    maxZ - minZ,
    0,
    CEILING,
    0,
    TILE,
    true,
  );

  // Category 2 fittings: four tubes behind a parabolic louvre.
  const louvre = texture(128, 128, (c, w, h) => {
    c.fillStyle = '#fbfbf6';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a6aaab';
    c.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo((i * w) / 4, 0);
      c.lineTo((i * w) / 4, h);
      c.stroke();
    }
    c.lineWidth = 1.5;
    for (let i = 1; i < 10; i++) {
      c.beginPath();
      c.moveTo(0, (i * h) / 10);
      c.lineTo(w, (i * h) / 10);
      c.stroke();
    }
  });
  const fitting = lit({ map: louvre, color: '#f4f6ef' });
  for (const { x, z } of LIGHTS) {
    flat(inside, white, TILE, TILE, x, CEILING - 0.003, z, 0, true);
    flat(inside, fitting, 0.56, 0.56, x, CEILING - 0.006, z, 0, true);
  }
  // Four-way cassettes: a square grille between four slot vents.
  const cassette = texture(128, 128, (c, w, h) => {
    c.fillStyle = '#efeee8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9c8c0';
    c.fillRect(w * 0.28, h * 0.28, w * 0.44, h * 0.44);
    c.strokeStyle = '#a9a8a0';
    for (let i = 0; i < 12; i++) {
      const y = h * 0.3 + (i * h * 0.4) / 12;
      c.beginPath();
      c.moveTo(w * 0.3, y);
      c.lineTo(w * 0.7, y);
      c.stroke();
    }
    c.fillStyle = '#3d3f40';
    c.fillRect(w * 0.18, h * 0.08, w * 0.64, h * 0.07);
    c.fillRect(w * 0.18, h * 0.85, w * 0.64, h * 0.07);
    c.fillRect(w * 0.08, h * 0.18, w * 0.07, h * 0.64);
    c.fillRect(w * 0.85, h * 0.18, w * 0.07, h * 0.64);
  });
  const cassetteMaterial = paint('#ffffff', 0.5, 0, { map: cassette });
  for (const { x, z } of CASSETTES) {
    box(inside, white, 0.62, 0.03, 0.62, x, CEILING - 0.015, z);
    flat(inside, cassetteMaterial, 0.6, 0.6, x, CEILING - 0.031, z, 0, true);
  }
  for (const { x, z } of SMOKE_DETECTORS) {
    cylinder(inside, whitePlastic, 0.05, 0.045, x, CEILING - 0.022, z, 16);
    const led = cylinder(
      inside,
      red,
      0.004,
      0.002,
      x + 0.02,
      CEILING - 0.046,
      z,
    );
    led.material = lit({ color: '#ff3a2a' });
  }
  for (const { x, z } of MOTION_SENSORS) {
    cylinder(inside, whitePlastic, 0.04, 0.012, x, CEILING - 0.006, z, 16);
    const dome = new Mesh(
      new SphereGeometry(0.028, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      whitePlastic,
    );
    dome.rotation.x = Math.PI;
    dome.position.set(x, CEILING - 0.012, z);
    inside.add(dome);
  }
  const grille = texture(64, 64, (c, w, h) => {
    c.fillStyle = '#f0efe8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#9a9a92';
    for (let y = 4; y < h; y += 5)
      for (let x = 4; x < w; x += 5) {
        if (Math.hypot(x - w / 2, y - h / 2) > w / 2 - 3) continue;
        c.fillRect(x, y, 2, 2);
      }
  });
  const speaker = paint('#ffffff', 0.5, 0, { map: grille });
  for (const { x, z } of SPEAKERS) {
    const face = new Mesh(new CylinderGeometry(0.11, 0.11, 0.01, 24), speaker);
    face.position.set(x, CEILING - 0.005, z);
    inside.add(face);
  }

  // ---- Walls ---------------------------------------------------------------
  const wallHeight = CEILING + 0.4;
  const northFace = minZ + HALF_WALL;
  const westFace = minX + HALF_WALL;
  box(
    inside,
    magnolia,
    maxX - minX + 0.3,
    wallHeight,
    0.3,
    0,
    wallHeight / 2,
    minZ,
  );
  box(
    inside,
    magnolia,
    0.3,
    wallHeight,
    maxZ - minZ + 0.3,
    minX,
    wallHeight / 2,
    0,
  );
  // Coved vinyl skirting.
  box(inside, skirting, maxX - minX, 0.1, 0.012, 0, 0.05, northFace + 0.006);
  box(inside, skirting, 0.012, 0.1, maxZ - minZ, westFace + 0.006, 0.05, 0);

  /**
   * A window wall: `along` is the wall's length, centred on the origin of
   * a frame whose +z faces outside; the wall's centre line is z = 0.
   */
  const windowWall = (
    length: number,
    origin: [number, number],
    yaw: number,
    fireExit: boolean,
  ) => {
    const wall = new Group();
    wall.position.set(origin[0], 0, origin[1]);
    wall.rotation.y = yaw;
    inside.add(wall);
    const half = length / 2;
    const allBays = bays(-half, half);
    // Local x runs the other way on the east wall: the fire exit's bay.
    const exitBay = fireExit
      ? allBays.find(([s, e]) => isFireExitBay([-e, -s]))
      : undefined;
    // The wall below the sill and above the head.
    const lowRuns: [number, number][] = exitBay
      ? [
          [-half - HALF_WALL, exitBay[0]],
          [exitBay[1], half + HALF_WALL],
        ]
      : [[-half - HALF_WALL, half + HALF_WALL]];
    for (const [s, e] of lowRuns)
      box(wall, magnolia, e - s, SILL, 0.3, (s + e) / 2, SILL / 2, 0);
    box(
      wall,
      magnolia,
      length + 0.3,
      wallHeight - HEAD,
      0.3,
      0,
      (HEAD + wallHeight) / 2,
      0,
    );
    for (const [s, e] of lowRuns)
      box(
        wall,
        skirting,
        e - s,
        0.1,
        0.012,
        (s + e) / 2,
        0.05,
        -HALF_WALL - 0.006,
      );
    // The frame: sill and head rails, mullions, transoms and vents.
    box(wall, alu, length, 0.07, 0.12, 0, HEAD - 0.035, 0);
    const transom = 2.02;
    allBays.forEach(([s, e], i) => {
      const door = exitBay && s === exitBay[0];
      const mid = (s + e) / 2;
      const bottom = door ? 0 : SILL;
      box(wall, alu, 0.06, HEAD - bottom, 0.12, s, (HEAD + bottom) / 2, 0);
      if (i === allBays.length - 1)
        box(wall, alu, 0.06, HEAD - SILL, 0.12, e, (HEAD + SILL) / 2, 0);
      if (door) {
        fireExitDoor(wall, mid, s, e);
        return;
      }
      box(wall, alu, BAY, 0.06, 0.12, mid, SILL + 0.03, 0);
      box(wall, alu, BAY, 0.05, 0.1, mid, transom, 0);
      plane(
        wall,
        glass,
        BAY - 0.06,
        transom - SILL - 0.06,
        mid,
        (transom + SILL) / 2,
        0.01,
      );
      // The top-hung vent: open a hand's width on its restrictor in some.
      const vent = new Group();
      vent.position.set(mid, HEAD - 0.07, 0.03);
      vent.rotation.x = i % 3 === 1 ? -0.16 : 0;
      wall.add(vent);
      const vh = HEAD - 0.07 - transom - 0.025;
      for (const [w, h, x, y] of [
        [BAY - 0.08, 0.04, 0, -0.02],
        [BAY - 0.08, 0.04, 0, -vh + 0.02],
        [0.04, vh, -(BAY - 0.08) / 2 + 0.02, -vh / 2],
        [0.04, vh, (BAY - 0.08) / 2 - 0.02, -vh / 2],
      ] as const)
        box(vent, alu, w, h, 0.05, x, y, 0);
      plane(vent, glass, BAY - 0.14, vh - 0.06, 0, -vh / 2, 0.005);
      // Inside: the window board and a radiator under it.
      box(wall, white, BAY, 0.025, 0.25, mid, SILL + 0.0125, -HALF_WALL);
      if (i % 2 === 0 || i === allBays.length - 1)
        radiator(wall, mid + (i === allBays.length - 1 ? 0 : BAY / 2), i);
    });
    blinds(wall, allBays, exitBay);
    // The building's own brick below the sill, outside.
    for (const [s, e] of lowRuns)
      plane(
        wall,
        brick,
        e - s,
        SILL,
        (s + e) / 2,
        SILL / 2,
        HALF_WALL + 0.005,
        0.5,
      );
    return wall;
  };

  // Bricks outside, for the plinth under every window band.
  const brickTexture = texture(
    128,
    128,
    (c, w, h) => {
      c.fillStyle = '#b8b2a6';
      c.fillRect(0, 0, w, h);
      const rows = 8;
      for (let r = 0; r < rows; r++)
        for (let k = -1; k < 3; k++) {
          const x = k * 64 + (r % 2 ? 32 : 0);
          const tone = 120 + Math.floor(random() * 40);
          c.fillStyle = `rgb(${tone + 40},${tone - 30},${tone - 50})`;
          c.fillRect(x + 1, r * 16 + 1, 62, 14);
        }
    },
    true,
  );
  const brick = paint('#ffffff', 0.9, 0, { map: brickTexture });

  const radiatorTop = texture(256, 32, (c, w, h) => {
    c.fillStyle = '#efeee6';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#8c8b84';
    for (let x = 6; x < w - 6; x += 6) c.fillRect(x, 8, 3, h - 16);
  });
  const radiatorGrille = paint('#ffffff', 0.5, 0, { map: radiatorTop });
  function radiator(wall: Group, x: number, i: number) {
    const length = i % 2 === 0 ? 2.0 : 1.0;
    box(wall, white, length, 0.6, 0.1, x, 0.42, -HALF_WALL - 0.065);
    flat(
      wall,
      radiatorGrille,
      length - 0.04,
      0.08,
      x,
      0.721,
      -HALF_WALL - 0.065,
    );
  }

  /** Vertical blinds: 89 mm slats on a headrail, mostly turned open. */
  function blinds(
    wall: Group,
    allBays: [number, number][],
    exitBay: [number, number] | undefined,
  ) {
    const top = HEAD - 0.06;
    const bottom = SILL + 0.06;
    const z = -HALF_WALL - 0.2;
    const slats: Matrix4[] = [];
    const q = new Quaternion();
    const turn = new Vector3(0, 1, 0);
    allBays.forEach(([s, e]) => {
      if (exitBay && s === exitBay[0]) return;
      const mode = random();
      // Drawn back to one side, turned open, or half turned.
      const drawn = mode > 0.94;
      const angle = mode > 0.86 && !drawn ? 1.0 : Math.PI / 2 - 0.12;
      const pitch = drawn ? 0.018 : 0.08;
      const count = drawn ? 15 : Math.round(BAY / 0.08);
      for (let k = 0; k < count; k++) {
        const x = s + 0.04 + k * pitch;
        q.setFromAxisAngle(turn, angle);
        slats.push(
          new Matrix4().compose(
            new Vector3(x, (top + bottom) / 2, z),
            q,
            new Vector3(1, 1, 1),
          ),
        );
      }
      box(wall, whitePlastic, e - s, 0.04, 0.06, (s + e) / 2, HEAD - 0.04, z);
    });
    const mesh = new InstancedMesh(
      new BoxGeometry(0.089, top - bottom, 0.003),
      paint('#e6e2d4', 0.85, 0, { side: DoubleSide }),
      slats.length,
    );
    slats.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    wall.add(mesh);
  }

  /** The fire exit: a glazed aluminium door with a panic bar. */
  function fireExitDoor(wall: Group, mid: number, s: number, e: number) {
    const w = FIRE_EXIT.width;
    const h = FIRE_EXIT.height;
    box(wall, alu, e - s, 0.06, 0.12, mid, h + 0.03, 0);
    plane(wall, glass, e - s - 0.06, HEAD - h - 0.1, mid, (HEAD + h) / 2, 0.01);
    // Packers either side of the leaf.
    const packer = (e - s - w) / 2;
    for (const x of [s + packer / 2, e - packer / 2])
      box(wall, alu, packer, h, 0.1, x, h / 2, 0);
    const leaf = new Group();
    leaf.position.set(mid, 0, 0.02);
    wall.add(leaf);
    for (const [bw, bh, x, y] of [
      [w, 0.1, 0, h - 0.05],
      [w, 0.32, 0, 0.16],
      [0.09, h, -w / 2 + 0.045, h / 2],
      [0.09, h, w / 2 - 0.045, h / 2],
    ] as const)
      box(leaf, alu, bw, bh, 0.06, x, y, 0);
    plane(leaf, glass, w - 0.18, h - 0.42, 0, 0.32 + (h - 0.42) / 2, 0.005);
    // The panic bar, on the inside.
    box(leaf, chrome, w - 0.2, 0.035, 0.035, 0, 1.0, -0.09);
    for (const x of [-(w - 0.24) / 2, (w - 0.24) / 2])
      box(leaf, alu, 0.05, 0.08, 0.07, x, 1.0, -0.06);
    const push = sign(0.32, 0.06, (c, cw, ch) => {
      c.fillStyle = '#16834a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#ffffff';
      c.font = `bold ${ch * 0.6}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Push bar to open', cw / 2, ch / 2);
    });
    push.position.set(0, 1.12, -0.04);
    push.rotation.y = Math.PI;
    leaf.add(push);
    // The running-man sign over it, lit.
    const exit = sign(
      0.6,
      0.2,
      (c, cw, ch) => {
        c.fillStyle = '#138a43';
        c.fillRect(0, 0, cw, ch);
        c.strokeStyle = '#ffffff';
        c.fillStyle = '#ffffff';
        c.lineWidth = ch * 0.07;
        c.lineCap = 'round';
        // A door, a figure running into it, an arrow pointing down.
        const u = ch / 10;
        c.strokeRect(u * 1.2, u * 1.2, u * 4, u * 7.6);
        c.beginPath();
        c.arc(u * 7.4, u * 2.2, u * 0.9, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(u * 7, u * 3.4);
        c.lineTo(u * 6.2, u * 6.2);
        c.lineTo(u * 4.6, u * 8.6);
        c.moveTo(u * 6.2, u * 6.2);
        c.lineTo(u * 7.8, u * 7.2);
        c.lineTo(u * 8.4, u * 8.8);
        c.moveTo(u * 7, u * 3.8);
        c.lineTo(u * 5.4, u * 4.6);
        c.moveTo(u * 7, u * 3.8);
        c.lineTo(u * 8.6, u * 5.4);
        c.stroke();
        c.beginPath();
        c.moveTo(u * 11.5, u * 2);
        c.lineTo(u * 11.5, u * 7);
        c.stroke();
        c.beginPath();
        c.moveTo(u * 10.2, u * 6);
        c.lineTo(u * 11.5, u * 8.2);
        c.lineTo(u * 12.8, u * 6);
        c.fill();
        c.font = `bold ${u * 4}px ${SANS}`;
        c.textBaseline = 'middle';
        c.fillText('Fire exit', u * 14, ch / 2);
      },
      480,
      true,
    );
    exit.position.set(mid, HEAD + 0.13, -HALF_WALL - 0.02);
    exit.rotation.y = Math.PI;
    wall.add(exit);
  }

  windowWall(maxX - minX, [0, maxZ], 0, false);
  windowWall(maxZ - minZ, [maxX, 0], Math.PI / 2, true);
  // Radiators and boards along both window walls.
  solid(minX, maxZ - HALF_WALL - 0.3, maxX, maxZ);
  solid(maxX - HALF_WALL - 0.3, minZ, maxX, FIRE_EXIT.z - BAY / 2);
  solid(maxX - HALF_WALL - 0.3, FIRE_EXIT.z + BAY / 2, maxX, maxZ);

  // ---- Fittings on the internal walls ---------------------------------------
  /** Mount `object` (facing +z) on the north or west wall. */
  const mount = (
    object: Object3D,
    wall: 'north' | 'west',
    along: number,
    y: number,
    standoff = 0,
  ) => {
    if (wall === 'north') object.position.set(along, y, northFace + standoff);
    else {
      object.position.set(westFace + standoff, y, along);
      object.rotation.y = Math.PI / 2;
    }
    inside.add(object);
    return object;
  };
  const assembly = (build: (g: Group) => void) => {
    const g = new Group();
    build(g);
    return g;
  };

  // White dado trunking, with twin sockets and data outlets along it.
  const trunking = (wall: 'north' | 'west', from: number, to: number) => {
    const length = to - from;
    const run = assembly((g) => {
      box(g, whitePlastic, length, 0.15, 0.055, 0, 0, 0.0275);
      box(g, paint('#dcdbd2', 0.5), length, 0.008, 0.002, 0, 0, 0.056);
    });
    mount(run, wall, (from + to) / 2, 0.95);
    for (let a = from + 0.6; a < to - 0.3; a += 2.4) {
      const outlet = assembly((g) => {
        const s = new Mesh(new PlaneGeometry(0.146, 0.086), socketMaterial);
        s.position.set(0, 0, 0.058);
        g.add(s);
        const d = new Mesh(new PlaneGeometry(0.086, 0.086), dataMaterial);
        d.position.set(0.14, 0, 0.058);
        g.add(d);
      });
      mount(outlet, wall, a, 0.95);
    }
  };
  trunking('north', -4.35, maxX - HALF_WALL);
  trunking('west', minZ + HALF_WALL, -1.0);
  trunking('west', 2.2, maxZ - HALF_WALL);

  // The whiteboard, wiped clean.
  const board = assembly((g) => {
    plane(g, paint('#fbfbf8', 0.18), 2.4, 1.2, 0, 0, 0.012);
    for (const [w, h, x, y] of [
      [2.44, 0.025, 0, 0.6],
      [2.44, 0.025, 0, -0.6],
      [0.025, 1.22, -1.21, 0],
      [0.025, 1.22, 1.21, 0],
    ] as const)
      box(g, chrome, w, h, 0.02, x, y, 0.012);
    box(g, chrome, 0.9, 0.02, 0.06, 0.4, -0.62, 0.04);
    // A marker and an eraser in the tray.
    const pen = cylinder(
      g,
      paint('#1f3f9a', 0.4),
      0.009,
      0.13,
      0.25,
      -0.6,
      0.045,
    );
    pen.rotation.z = Math.PI / 2;
    box(g, paint('#2b2b2b', 0.8), 0.12, 0.03, 0.05, 0.6, -0.6, 0.045);
  });
  mount(board, 'west', 0.6, 1.65);
  // The projector screen, rolled up in its case, its pull cord hanging.
  const screen = assembly((g) => {
    box(g, white, 2.1, 0.09, 0.09, 0, 0, 0.06);
    box(g, black, 1.97, 0.02, 0.02, 0, -0.055, 0.06);
    cylinder(g, black, 0.004, 0.25, 0, -0.19, 0.06);
  });
  mount(screen, 'west', 0.6, CEILING - 0.06);
  // The projector on its drop pole, pointing at the screen.
  cylinder(inside, white, 0.02, 0.4, -3.0, CEILING - 0.2, 0.6);
  box(
    inside,
    paint('#d9d8d1', 0.5),
    0.32,
    0.1,
    0.26,
    -3.0,
    CEILING - 0.45,
    0.6,
  );
  const lens = cylinder(
    inside,
    black,
    0.035,
    0.03,
    -3.17,
    CEILING - 0.45,
    0.66,
    16,
  );
  lens.rotation.z = Math.PI / 2;

  // Pinboard with a couple of things pinned to it.
  const pinboard = assembly((g) => {
    box(g, paint('#a67b4b', 0.95), 1.2, 0.9, 0.012, 0, 0, 0.006);
    for (const [w, h, x, y] of [
      [1.22, 0.02, 0, 0.45],
      [1.22, 0.02, 0, -0.45],
      [0.02, 0.92, -0.6, 0],
      [0.02, 0.92, 0.6, 0],
    ] as const)
      box(g, alu, w, h, 0.02, x, y, 0.01);
    const memo = sign(0.21, 0.297, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#222222';
      c.font = `bold ${w * 0.08}px ${SANS}`;
      c.fillText('CAR PARK', w * 0.1, h * 0.12);
      c.font = `${w * 0.05}px ${SANS}`;
      [
        'Please do not park in',
        'bays marked VISITORS.',
        'Cars will be clamped.',
        '',
        'Facilities',
      ].forEach((line, i) =>
        c.fillText(line, w * 0.1, h * 0.22 + i * w * 0.08),
      );
    });
    memo.position.set(-0.25, 0.05, 0.014);
    memo.rotation.z = 0.03;
    g.add(memo);
    const flyer = sign(0.21, 0.15, (c, w, h) => {
      c.fillStyle = '#f6e25b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#333333';
      c.font = `bold ${w * 0.09}px ${SANS}`;
      c.fillText('CHARITY QUIZ', w * 0.08, h * 0.35);
      c.font = `${w * 0.06}px ${SANS}`;
      c.fillText('Friday, the Red Lion', w * 0.08, h * 0.65);
    });
    flyer.position.set(0.25, 0.12, 0.014);
    flyer.rotation.z = -0.05;
    g.add(flyer);
  });
  mount(pinboard, 'west', -2.9, 1.5);

  // Beside the door (at x = -5.1 on the north wall): switches and notices.
  const plate = (w: number, h: number, material: Material) =>
    assembly((g) => box(g, material, w, h, 0.01, 0, 0, 0.005));
  const switchFace = texture(96, 96, (c, w, h) => {
    c.fillStyle = '#f2f1ea';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e0dfd6';
    c.strokeStyle = '#c8c7be';
    for (const x of [w * 0.3, w * 0.7]) {
      c.fillRect(x - 12, h * 0.25, 24, h * 0.5);
      c.strokeRect(x - 12, h * 0.25, 24, h * 0.5);
    }
  });
  mount(
    plate(0.146, 0.086, paint('#ffffff', 0.4, 0, { map: switchFace })),
    'north',
    -4.2,
    1.2,
  );
  const callPoint = assembly((g) => {
    box(g, red, 0.09, 0.09, 0.05, 0, 0, 0.025);
    const face = sign(
      0.07,
      0.07,
      (c, w, h) => {
        c.fillStyle = '#e8ebe8';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#c0261f';
        c.textAlign = 'center';
        c.font = `bold ${w * 0.16}px ${SANS}`;
        c.fillText('FIRE', w / 2, h * 0.32);
        c.font = `bold ${w * 0.1}px ${SANS}`;
        c.fillText('PUSH HERE', w / 2, h * 0.62);
      },
      128,
    );
    face.position.z = 0.051;
    g.add(face);
  });
  mount(callPoint, 'north', -3.75, 1.4);
  const controller = assembly((g) => {
    box(g, whitePlastic, 0.12, 0.12, 0.025, 0, 0, 0.0125);
    const lcd = sign(
      0.06,
      0.03,
      (c, w, h) => {
        c.fillStyle = '#9cb08a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#26301f';
        c.font = `bold ${h * 0.7}px monospace`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('21°C', w / 2, h / 2);
      },
      96,
    );
    lcd.position.set(0, 0.02, 0.026);
    g.add(lcd);
    for (const x of [-0.03, 0, 0.03])
      box(g, paint('#c9c8c0', 0.4), 0.02, 0.012, 0.006, x, -0.03, 0.026);
  });
  mount(controller, 'north', -3.3, 1.45);
  const loop = sign(
    0.15,
    0.15,
    (c, w, h) => {
      c.fillStyle = '#1d4f9c';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ffffff';
      c.lineWidth = w * 0.05;
      c.beginPath();
      c.arc(w * 0.45, h * 0.38, w * 0.18, Math.PI, Math.PI * 2.3);
      c.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.35, h * 0.75);
      c.stroke();
      c.beginPath();
      c.moveTo(w * 0.2, h * 0.85);
      c.lineTo(w * 0.8, h * 0.15);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.font = `bold ${w * 0.18}px ${SANS}`;
      c.fillText('T', w * 0.72, h * 0.88);
    },
    128,
  );
  mount(loop, 'north', -4.2, 1.65, 0.003);
  const fireAction = sign(0.3, 0.42, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b4aa0';
    c.fillRect(0, 0, w, h * 0.13);
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.08}px ${SANS}`;
    c.textAlign = 'center';
    c.fillText('FIRE ACTION', w / 2, h * 0.095);
    c.textAlign = 'left';
    c.fillStyle = '#1b4aa0';
    const lines = [
      ['b', 'If you discover a fire:'],
      ['', '1. Raise the alarm at the'],
      ['', '    nearest call point.'],
      ['', '2. Dial 999 for the fire brigade.'],
      ['', '3. Leave by the nearest exit.'],
      ['b', 'On hearing the alarm:'],
      ['', 'Leave at once. Do not stop'],
      ['', 'to collect belongings.'],
      ['', 'Do not use the lifts.'],
      ['b', 'Assembly point:'],
      ['', 'CAR PARK, BY THE BARRIER'],
      ['', 'Do not re-enter the building'],
      ['', 'until told it is safe.'],
    ];
    lines.forEach(([style, text], i) => {
      c.font = `${style ? 'bold ' : ''}${h * 0.042}px ${SANS}`;
      c.fillText(text, w * 0.07, h * 0.2 + i * h * 0.059);
    });
  });
  mount(fireAction, 'north', -2.6, 1.5, 0.002);
  const leaveIt = sign(0.297, 0.21, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#111111';
    c.textAlign = 'center';
    c.font = `bold ${h * 0.09}px ${SANS}`;
    c.fillText('PLEASE LEAVE THIS ROOM', w / 2, h * 0.17);
    c.fillText('AS YOU FOUND IT', w / 2, h * 0.29);
    c.font = `${h * 0.065}px ${SANS}`;
    [
      'Tables folded and stacked',
      'Chairs stacked (no more than 8)',
      'Whiteboard wiped',
      'Projector OFF',
    ].forEach((line, i) => c.fillText(line, w / 2, h * 0.45 + i * h * 0.1));
    c.font = `italic ${h * 0.065}px ${SANS}`;
    c.fillText('Thank you! Facilities', w / 2, h * 0.92);
  });
  mount(leaveIt, 'north', -1.6, 1.45, 0.002).rotation.z = -0.025;
  // The fire alarm sounder with its beacon, high up.
  const sounder = assembly((g) => {
    const base = cylinder(g, red, 0.055, 0.06, 0, 0, 0.03, 20);
    base.rotation.x = Math.PI / 2;
    const beacon = cylinder(
      g,
      paint('#d8463c', 0.2, 0, { transparent: true, opacity: 0.85 }),
      0.03,
      0.04,
      0,
      0,
      0.08,
      16,
    );
    beacon.rotation.x = Math.PI / 2;
  });
  mount(sounder, 'north', -3.0, 2.4);
  // Two extinguishers on a stand, with their signs.
  const extinguisher = (x: number, band: string, horn: boolean) => {
    cylinder(inside, red, 0.075, 0.5, x, 0.33, northFace + 0.15, 16);
    cylinder(
      inside,
      paint(band, 0.5),
      0.0755,
      0.08,
      x,
      0.45,
      northFace + 0.15,
      16,
    );
    cylinder(inside, black, 0.02, 0.08, x, 0.62, northFace + 0.15);
    if (horn) {
      const h = cylinder(
        inside,
        black,
        0.012,
        0.25,
        x + 0.09,
        0.45,
        northFace + 0.15,
      );
      h.rotation.z = 0.2;
    }
  };
  box(
    inside,
    paint('#2e2f31', 0.6),
    0.45,
    0.04,
    0.3,
    -6.45,
    0.02,
    northFace + 0.15,
  );
  box(
    inside,
    paint('#2e2f31', 0.6),
    0.45,
    0.6,
    0.02,
    -6.45,
    0.3,
    northFace + 0.01,
  );
  extinguisher(-6.57, '#efe3b8', false);
  extinguisher(-6.32, '#1b1b1b', true);
  for (const [x, label, ink, plateColour] of [
    [-6.57, 'FOAM', '#222222', '#efe3b8'],
    [-6.32, 'CO2', '#ffffff', '#1b1b1b'],
  ] as const) {
    const id = sign(
      0.12,
      0.08,
      (c, w, h) => {
        c.fillStyle = '#c0261f';
        c.fillRect(0, 0, w, h);
        c.fillStyle = plateColour;
        c.fillRect(0, h * 0.55, w, h * 0.45);
        c.fillStyle = ink;
        c.font = `bold ${h * 0.3}px ${SANS}`;
        c.textAlign = 'center';
        c.fillText(label, w / 2, h * 0.9);
        c.fillStyle = '#ffffff';
        c.font = `bold ${h * 0.22}px ${SANS}`;
        c.fillText('FIRE', w / 2, h * 0.35);
      },
      128,
    );
    mount(id, 'north', x, 1.2, 0.002);
  }
  solid(-6.75, northFace, -6.15, northFace + 0.3);

  // A clock, keeping time.
  const clockFace = texture(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111111';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${w * 0.1}px ${SANS}`;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillText(
        String(i),
        w / 2 + Math.sin(a) * w * 0.36,
        h / 2 - Math.cos(a) * h * 0.36,
      );
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 ? 0.45 : 0.43;
      c.fillRect(
        w / 2 + Math.sin(a) * w * r0 - 1,
        h / 2 - Math.cos(a) * h * r0 - 1,
        2,
        2,
      );
    }
  });
  const clock = assembly((g) => {
    const rim = cylinder(g, black, 0.16, 0.04, 0, 0, 0.02, 32);
    rim.rotation.x = Math.PI / 2;
    const face = new Mesh(
      new PlaneGeometry(0.3, 0.3),
      paint('#ffffff', 0.5, 0, { map: clockFace, transparent: true }),
    );
    face.position.z = 0.041;
    g.add(face);
  });
  mount(clock, 'north', 0.6, 2.2);
  const hand = (length: number, width: number, colour: Material, z: number) => {
    const pivot = new Group();
    pivot.position.set(0.6, 2.2, northFace + z);
    const arm = box(
      pivot,
      colour,
      width,
      length,
      0.002,
      0,
      length / 2 - 0.015,
      0,
    );
    void arm;
    inside.add(pivot);
    return pivot;
  };
  const hourHand = hand(0.08, 0.012, black, 0.044);
  const minuteHand = hand(0.12, 0.008, black, 0.046);
  const secondHand = hand(0.13, 0.003, red, 0.048);

  // ---- Furniture: what is left in an empty training room -----------------
  const fabric = paint('#2c4775', 0.95);
  const chairShell = paint('#1d1f22', 0.6);
  const chairStack = (x: number, z: number, count: number, yaw: number) => {
    const stack = new Group();
    stack.position.set(x, 0, z);
    stack.rotation.y = yaw;
    inside.add(stack);
    for (let i = 0; i < count; i++) {
      const y = 0.45 + i * 0.075;
      box(stack, fabric, 0.46, 0.05, 0.44, 0, y, 0);
      const back = box(stack, fabric, 0.44, 0.34, 0.04, 0, y + 0.3, -0.23);
      back.rotation.x = -0.12;
      box(stack, chairShell, 0.47, 0.012, 0.45, 0, y - 0.03, 0);
      for (const sx of [-0.21, 0.21]) {
        cylinder(stack, chrome, 0.011, 0.47, sx, y - 0.24, 0.19, 8);
        const rear = cylinder(
          stack,
          chrome,
          0.011,
          0.82,
          sx,
          y + 0.02,
          -0.22,
          8,
        );
        rear.rotation.x = 0.1;
      }
    }
    solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
  };
  chairStack(6.45, northFace + 0.4, 8, 0.1);
  chairStack(5.75, northFace + 0.4, 6, -0.06);
  chairStack(6.5, northFace + 1.05, 9, 1.5);
  // Folding tables stood on their long edges against the north wall.
  const beech = paint('#c8a573', 0.55);
  for (let i = 0; i < 4; i++) {
    const table = new Group();
    table.position.set(3.2, 0, northFace + 0.06 + i * 0.07);
    table.rotation.x = -0.06 + i * 0.01;
    inside.add(table);
    box(table, beech, 1.6, 0.75, 0.025, 0, 0.375, 0);
    box(table, chairShell, 1.6, 0.03, 0.03, 0, 0.015, 0.02);
    for (const sx of [-0.7, 0.7])
      box(table, chrome, 0.03, 0.6, 0.03, sx, 0.4, 0.04);
  }
  solid(2.35, northFace, 4.05, northFace + 0.4);
  // A flip chart on its easel, its pad clean.
  const easel = new Group();
  easel.position.set(-6.2, 0, 3.3);
  easel.rotation.y = 1.1;
  inside.add(easel);
  for (const [x, z, rx, rz] of [
    [-0.3, 0.12, -0.08, 0.08],
    [0.3, 0.12, -0.08, -0.08],
    [0, -0.35, 0.28, 0],
  ] as const) {
    const leg = cylinder(easel, alu, 0.012, 1.85, x, 0.92, z, 8);
    leg.rotation.set(rx, 0, rz);
  }
  box(easel, alu, 0.7, 0.03, 0.06, 0, 0.95, 0.06);
  const blank = texture(256, 340, (c, w, h) => {
    c.fillStyle = '#fdfdfb';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d7d9e8';
    for (let x = 16; x < w; x += 16) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
  });
  const pad = new Mesh(
    new PlaneGeometry(0.66, 0.88),
    paint('#ffffff', 0.9, 0, { map: blank }),
  );
  pad.position.set(0, 1.42, 0.1);
  pad.rotation.x = -0.08;
  easel.add(pad);
  solid(-6.6, 2.9, -5.8, 3.7);
  // The bin by the door, and a dead spider plant on a window board.
  cylinder(
    inside,
    paint('#3b3e40', 0.6),
    0.15,
    0.36,
    -4.25,
    0.18,
    northFace + 0.25,
    16,
  );
  solid(-4.4, northFace, -4.1, northFace + 0.4);
  const pot = cylinder(
    inside,
    paint('#b4553a', 0.8),
    0.07,
    0.12,
    3.0,
    SILL + 0.085,
    maxZ - HALF_WALL - 0.1,
    12,
  );
  void pot;
  const leafMaterial = paint('#8a8a52', 0.9, 0, { side: DoubleSide });
  for (let i = 0; i < 9; i++) {
    const leaf = new Mesh(new PlaneGeometry(0.015, 0.22), leafMaterial);
    const a = (i / 9) * Math.PI * 2;
    leaf.position.set(
      3.0 + Math.cos(a) * 0.05,
      SILL + 0.16,
      maxZ - HALF_WALL - 0.1 + Math.sin(a) * 0.05,
    );
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    inside.add(leaf);
  }

  buildOutside();

  /**
   * The trading estate outside, under a grey sky: paving and shrub beds
   * round this building, a strip of lawn, the estate road, and beyond it
   * the other units, each a plain box with rows of windows, with car parks
   * between them. Every parked car is at least 30 m from the windows, so
   * none is seen clearly; the view is nothing special.
   */
  function buildOutside() {
    const ground = (color: string, rough = 0.95) => paint(color, rough);
    flat(outside, ground('#6c7550'), 900, 900, 0, -0.04, 0);
    const tarmacTexture = texture(
      256,
      256,
      (c, w, h) => {
        c.fillStyle = '#4b4d4f';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) {
          const tone = 50 + Math.floor(random() * 50);
          c.fillStyle = `rgba(${tone},${tone},${tone + 2},0.6)`;
          c.fillRect(random() * w, random() * h, 1.2, 1.2);
        }
      },
      true,
    );
    const tarmac = paint('#ffffff', 0.92, 0, { map: tarmacTexture });
    const slabTexture = texture(
      128,
      128,
      (c, w, h) => {
        c.fillStyle = '#a5a29a';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#7d7a72';
        c.lineWidth = 2;
        c.strokeRect(1, 1, w - 2, h - 2);
      },
      true,
    );
    const paving = paint('#ffffff', 0.9, 0, { map: slabTexture });
    const kerb = paint('#a9a69e', 0.85);
    const soil = paint('#4b3a2c', 1);
    const hedge = paint('#334a2a', 0.95);
    const line = paint('#e6e4da', 0.8);
    const column = paint('#5d6265', 0.5, 0.5);
    const lantern = paint('#2d3134', 0.5, 0.4);
    const stripes = texture(
      64,
      64,
      (c, w, h) => {
        c.fillStyle = '#6f8550';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#788d56';
        c.fillRect(0, 0, w / 2, h);
      },
      true,
    );
    const lawn = paint('#ffffff', 0.95, 0, { map: stripes });
    /** A ground rectangle from (x0, z0) to (x1, z1). */
    const patch = (
      material: Material,
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      y: number,
      tile: number,
    ) =>
      flat(
        outside,
        material,
        x1 - x0,
        z1 - z0,
        (x0 + x1) / 2,
        y,
        (z0 + z1) / 2,
        tile,
      );

    // Round this building: paving, then shrub beds with a kerb.
    const edgeZ = maxZ + HALF_WALL;
    const edgeX = maxX + HALF_WALL;
    patch(paving, -70, edgeZ, edgeX + 2.4, edgeZ + 2.4, 0, 0.6);
    patch(paving, edgeX, -70, edgeX + 2.4, edgeZ, 0, 0.6);
    const beds: [number, number, number, number][] = [
      [-70, edgeZ + 2.4, -4, edgeZ + 3.6],
      [-2.2, edgeZ + 2.4, edgeX + 3.6, edgeZ + 3.6],
      [edgeX + 2.4, -70, edgeX + 3.6, FIRE_EXIT.z - 0.8],
      [edgeX + 2.4, FIRE_EXIT.z + 0.8, edgeX + 3.6, edgeZ + 2.4],
    ];
    for (const [x0, z0, x1, z1] of beds) {
      box(
        outside,
        soil,
        x1 - x0,
        0.12,
        z1 - z0,
        (x0 + x1) / 2,
        0.06,
        (z0 + z1) / 2,
      );
      box(
        outside,
        hedge,
        x1 - x0 - 0.3,
        0.55,
        z1 - z0 - 0.4,
        (x0 + x1) / 2,
        0.38,
        (z0 + z1) / 2,
      );
      for (const z of [z0, z1])
        box(outside, kerb, x1 - x0, 0.14, 0.12, (x0 + x1) / 2, 0.07, z);
      for (const x of [x0, x1])
        box(outside, kerb, 0.12, 0.14, z1 - z0, x, 0.07, (z0 + z1) / 2);
    }

    // A strip of mown lawn, then the estate road with its footways, south
    // and east, meeting at a corner.
    const roadNear = 16;
    const roadFar = roadNear + 7.3;
    const southRoad = edgeZ + roadNear;
    const eastRoad = edgeX + roadNear;
    patch(lawn, -90, edgeZ + 3.6, eastRoad - 2, southRoad - 2, 0.0005, 3);
    patch(lawn, edgeX + 3.6, -90, eastRoad - 2, southRoad - 2, 0.0004, 3);
    for (const [x0, z0, x1, z1] of [
      [-90, southRoad - 2, eastRoad + 9.3, southRoad],
      [-90, edgeZ + roadFar, eastRoad + 9.3, edgeZ + roadFar + 2],
      [eastRoad - 2, -90, eastRoad, southRoad],
      [edgeX + roadFar, -90, edgeX + roadFar + 2, southRoad],
    ] as const)
      patch(paving, x0, z0, x1, z1, 0.03, 0.6);
    patch(tarmac, -90, southRoad, 140, edgeZ + roadFar, 0.002, 6);
    patch(tarmac, eastRoad, -90, edgeX + roadFar, southRoad, 0.0021, 6);
    for (let x = -88; x < 138; x += 6)
      flat(outside, line, 3, 0.1, x, 0.004, (southRoad + edgeZ + roadFar) / 2);
    for (let z = -88; z < southRoad - 3; z += 6)
      flat(outside, line, 0.1, 3, (eastRoad + edgeX + roadFar) / 2, 0.004, z);
    // Paths from the front door and the fire exit to the footway.
    patch(paving, -4, edgeZ + 3.6, -2.2, southRoad - 2, 0.001, 0.6);
    patch(
      paving,
      edgeX + 3.6,
      FIRE_EXIT.z - 0.8,
      eastRoad - 2,
      FIRE_EXIT.z + 0.8,
      0.001,
      0.6,
    );
    // Street lights along the road.
    const streetLight = (x: number, z: number, yaw: number) => {
      cylinder(outside, column, 0.08, 8, x, 4, z, 8);
      const head = box(outside, lantern, 0.7, 0.15, 0.3, x, 8, z);
      head.rotation.y = yaw;
    };
    for (let x = -60; x < 60; x += 25) streetLight(x, southRoad - 1, 0);
    for (let z = -70; z < 0; z += 25) streetLight(eastRoad - 1, z, Math.PI / 2);

    // Low-poly cars, only ever seen from afar.
    const carColours = [
      '#b9bcbe',
      '#a8acae',
      '#1d2b4a',
      '#7d1d22',
      '#e9e9e4',
      '#1b1b1c',
      '#24402f',
      '#5e2633',
      '#c2b49a',
      '#3c5a7a',
      '#8e9394',
      '#a83a24',
    ].map((c) => paint(c, 0.32, 0.35));
    const carGlass = paint('#20282c', 0.1, 0.4);
    const tyre = paint('#141414', 0.85);
    const profile = new Shape();
    profile.moveTo(-1.15, 0);
    profile.lineTo(1.0, 0);
    profile.lineTo(0.45, 0.45);
    profile.lineTo(-0.8, 0.45);
    profile.closePath();
    const cabin = new ExtrudeGeometry(profile, {
      depth: 1.5,
      bevelEnabled: false,
    });
    cabin.rotateY(Math.PI / 2);
    cabin.translate(-0.75, 0, 0);
    const wheel = new CylinderGeometry(0.31, 0.31, 0.2, 8);
    wheel.rotateZ(Math.PI / 2);
    const car = (x: number, z: number, yaw: number) => {
      const c = new Group();
      c.position.set(x, 0, z);
      c.rotation.y = yaw;
      outside.add(c);
      const body = carColours[Math.floor(random() * carColours.length)];
      if (random() > 0.92) {
        box(c, body, 1.95, 1.5, 4.9, 0, 1.1, 0);
        return;
      }
      box(c, body, 1.72, 0.62, 4.2, 0, 0.55, 0);
      const top = new Mesh(cabin, carGlass);
      top.position.set(0, 0.86, -0.1);
      c.add(top);
      for (const sx of [-0.8, 0.8])
        for (const sz of [-1.35, 1.35]) {
          const w = new Mesh(wheel, tyre);
          w.position.set(sx, 0.31, sz);
          c.add(w);
        }
    };
    /**
     * A car park from (x0, z0) to (x1, z1): rows of bays 2.4 m wide and
     * 4.8 m deep along x, back to back across 6 m aisles, about half full.
     */
    const carPark = (x0: number, z0: number, x1: number, z1: number) => {
      patch(tarmac, x0, z0, x1, z1, 0.003, 6);
      for (
        let z = z0 + 0.5;
        z + 4.8 <= z1;
        z += 4.8 + (Math.round((z - z0) / 4.8) % 2 ? 6 : 0)
      ) {
        for (let x = x0 + 1; x + 2.4 <= x1 - 1; x += 2.4) {
          flat(outside, line, 0.1, 4.8, x, 0.005, z + 2.4);
          if (random() > 0.5) continue;
          car(
            x + 1.2 + (random() - 0.5) * 0.2,
            z + 2.4,
            (random() > 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.06,
          );
        }
      }
    };

    // The other units: boxes clad in one colour, with rows of windows.
    const windowsTexture = texture(
      128,
      128,
      (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#2b3439';
        c.fillRect(w * 0.12, h * 0.3, w * 0.76, h * 0.42);
        c.fillStyle = '#4c585e';
        c.fillRect(w * 0.12, h * 0.3, w * 0.76, h * 0.06);
      },
      true,
    );
    const windows = paint('#ffffff', 0.25, 0.3, {
      map: windowsTexture,
      transparent: true,
      alphaTest: 0.5,
    });
    const storey = 3.6;
    const unit = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      storeys: number,
      colour: string,
      glazed = true,
    ) => {
      const w = x1 - x0;
      const d = z1 - z0;
      const h = storeys * storey + 0.8;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      box(outside, paint(colour, 0.75, 0.15), w, h, d, cx, h / 2, cz);
      box(
        outside,
        paint('#3a3e41', 0.7),
        w + 0.2,
        0.3,
        d + 0.2,
        cx,
        h + 0.15,
        cz,
      );
      if (!glazed) return;
      const faces: [number, number, number, number, number][] = [
        [w, cx, cz + d / 2 + 0.02, 0, 0],
        [w, cx, cz - d / 2 - 0.02, Math.PI, 0],
        [d, cx + w / 2 + 0.02, cz, Math.PI / 2, 0],
        [d, cx - w / 2 - 0.02, cz, -Math.PI / 2, 0],
      ];
      for (const [length, x, z, yaw] of faces) {
        const glass = plane(
          outside,
          windows,
          length - 2,
          storeys * storey,
          x,
          (storeys * storey) / 2 + 0.3,
          z,
          storey,
        );
        glass.rotation.y = yaw;
      }
    };
    // South of the road: two office units with a car park between them,
    // and more car parks and units behind.
    const s0 = edgeZ + roadFar + 6;
    unit(-62, s0, -14, s0 + 18, 2, '#9aa3a6');
    carPark(-10, s0 + 4, 30, s0 + 38);
    unit(34, s0, 70, s0 + 22, 3, '#c3c0b4');
    carPark(-62, s0 + 26, -20, s0 + 50);
    unit(-14, s0 + 46, 38, s0 + 70, 1, '#7d8c96', false);
    unit(48, s0 + 30, 90, s0 + 70, 2, '#8f9a8c');
    // East of the road: a unit, a car park, and a big shed beyond.
    const e0 = edgeX + roadFar + 6;
    unit(e0, -64, e0 + 20, -24, 2, '#b2aea2');
    carPark(e0, -20, e0 + 34, s0 - 14);
    unit(e0 + 26, -66, e0 + 70, -26, 1, '#6f8090', false);
    unit(e0 + 40, -18, e0 + 64, s0 - 14, 2, '#a3a9a2');
    // A sign at the estate's corner, and a TO LET board on the lawn.
    const estate = sign(4, 1.4, (c, w, h) => {
      c.fillStyle = '#1e2d4f';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.26}px ${SANS}`;
      c.fillText('BRACKNELL ROAD', w / 2, h * 0.36);
      c.fillText('TRADING ESTATE', w / 2, h * 0.66);
      c.font = `${h * 0.12}px ${SANS}`;
      c.fillText('Units 1-14', w / 2, h * 0.88);
    });
    estate.position.set(eastRoad - 5, 1.6, southRoad - 4);
    estate.rotation.y = -Math.PI / 4;
    outside.add(estate);
    const toLet = sign(1.8, 0.9, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c4271f';
      c.font = `bold ${h * 0.4}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('TO LET', w / 2, h * 0.5);
      c.fillStyle = '#1b2f5a';
      c.font = `bold ${h * 0.13}px ${SANS}`;
      c.fillText('OFFICES 4,500 sq ft', w / 2, h * 0.8);
    });
    toLet.position.set(12, 2.6, s0 - 3);
    toLet.rotation.y = Math.PI;
    outside.add(toLet);
    for (const x of [11.2, 12.8])
      cylinder(outside, column, 0.04, 3.1, x, 1.55, s0 - 3, 6);
    // A few trees in the verges.
    const bark = paint('#4a3d31', 0.9);
    const leafy = [
      paint('#4c6236', 0.9),
      paint('#5b6d3c', 0.9),
      paint('#3f5531', 0.9),
    ];
    const crown = new IcosahedronGeometry(1, 0);
    const tree = (x: number, z: number, size: number) => {
      cylinder(outside, bark, 0.12 * size, 2.4 * size, x, 1.2 * size, z, 6);
      const c = new Mesh(crown, leafy[Math.floor(random() * leafy.length)]);
      c.position.set(x, 3.2 * size, z);
      c.scale.set(1.8 * size, 2.0 * size, 1.8 * size);
      c.rotation.set(random(), random(), random());
      outside.add(c);
    };
    for (const [x, z, size] of [
      [-30, edgeZ + 9, 1.2],
      [-9, edgeZ + 10, 0.9],
      [8, edgeZ + 9, 1.0],
      [edgeX + 9, -20, 1.1],
      [edgeX + 10, -45, 1.3],
      [-48, edgeZ + 10, 1.0],
    ] as const)
      tree(x, z, size);
    // A smoking shelter on the lawn by the fire exit path.
    const shelter = new Group();
    shelter.position.set(edgeX + 8, 0, FIRE_EXIT.z - 6);
    outside.add(shelter);
    for (const [x, z] of [
      [-1.2, -0.8],
      [1.2, -0.8],
      [-1.2, 0.8],
      [1.2, 0.8],
    ] as const)
      cylinder(shelter, column, 0.04, 2.3, x, 1.15, z, 6);
    box(
      shelter,
      paint('#a9b8bd', 0.1, 0, { transparent: true, opacity: 0.4 }),
      2.6,
      0.03,
      1.8,
      0,
      2.32,
      0,
    );

    // The rest of our own building, west and north of this room: two
    // storeys of brick, grey cladding and ribbon windows.
    const ribbon = texture(
      256,
      64,
      (c, w, h) => {
        c.fillStyle = '#29343a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#58656b';
        for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 3, h);
      },
      true,
    );
    const windowBand = paint('#ffffff', 0.2, 0.3, { map: ribbon });
    const cladding = paint('#8d969b', 0.6, 0.2);
    const facade = (length: number, x: number, z: number, yaw: number) => {
      const f = new Group();
      f.position.set(x, 0, z);
      f.rotation.y = yaw;
      outside.add(f);
      box(f, paint('#8a5a44', 0.9), length, SILL, 0.3, 0, SILL / 2, 0);
      plane(f, brick, length, SILL, 0, SILL / 2, 0.155, 0.5);
      plane(f, windowBand, length, HEAD - SILL, 0, (HEAD + SILL) / 2, 0.02, 4);
      box(f, cladding, length, 7.6 - HEAD, 0.3, 0, (7.6 + HEAD) / 2, 0);
      plane(f, windowBand, length, 1.6, 0, 4.6, 0.16, 4);
    };
    facade(60, minX - 30 - HALF_WALL, maxZ, 0);
    facade(60, maxX, minZ - 30 - HALF_WALL, Math.PI / 2);
    // Above this room the building goes on: the upper storey's face.
    box(
      outside,
      cladding,
      maxX - minX + 0.3,
      7.6 - wallHeight,
      0.3,
      0,
      (7.6 + wallHeight) / 2,
      maxZ,
    );
    box(
      outside,
      cladding,
      0.3,
      7.6 - wallHeight,
      maxZ - minZ + 0.3,
      maxX,
      (7.6 + wallHeight) / 2,
      0,
    );
  }

  // Flatten everything that never moves into a few meshes.
  const keep = new Set<Object3D>([hourHand, minuteHand, secondHand]);
  mergeStatic(inside, 3, keep);
  mergeStatic(outside, 30);

  /** Where the room's lights are, for the room to light them. */
  const lights = LIGHTS.map(({ x, z }) => ({ x, y: CEILING - 0.05, z }));
  return {
    group,
    solids,
    lights,
    /** Run the clock. */
    update(_delta: number, now = new Date()) {
      const fast = now;
      const s = fast.getSeconds();
      const m = fast.getMinutes() + s / 60;
      const h = (fast.getHours() % 12) + m / 60;
      secondHand.rotation.z = -(s / 60) * Math.PI * 2;
      minuteHand.rotation.z = -(m / 60) * Math.PI * 2;
      hourHand.rotation.z = -(h / 12) * Math.PI * 2;
    },
  };
}

export type TrainingRoom = ReturnType<typeof createTrainingRoom>;
