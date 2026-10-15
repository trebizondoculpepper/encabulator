import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from 'three';
import type { Material, Object3D } from 'three';
import type { Footprint } from '../game/walk-collision';
import { corridorWalls } from '../game/corridor-plan';
import { createMicroLabel, kitGlow, kitPaint } from './eighties-controls';
import type { PanelKit } from './eighties-controls';
import { createPs1Material } from '../rendering/ps1-material';

/** Painted service passages seen in the owner's 24 underground photographs. */
export function createUndergroundCorridor(kit: PanelKit) {
  const group = new Group();
  group.name = 'Underground service corridor';
  const solids: Footprint[] = [];
  const mat = {
    concrete: kitPaint(kit, '#777b7b'),
    ceiling: kitPaint(kit, '#bbbdbb'),
    base: kitPaint(kit, '#5f6262'),
    teal: kitPaint(kit, '#138c91'),
    magenta: kitPaint(kit, '#a53b83'),
    purple: kitPaint(kit, '#343a80'),
    orange: kitPaint(kit, '#e27532'),
    yellow: kitPaint(kit, '#d6af24'),
    greyDoor: kitPaint(kit, '#939da1', 0.35),
    steel: kitPaint(kit, '#989e9e', 0.55),
    dark: kitPaint(kit, '#303638'),
    duct: kitPaint(kit, '#b8bfbd', 0.48),
    green: kitPaint(kit, '#255b3c'),
    blue: kitPaint(kit, '#345282'),
    cream: kitPaint(kit, '#e8e7dc'),
    fluorescent: kitGlow(kit, '#f5f7ee'),
    red: kitPaint(kit, '#a94036'),
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
  const cylinder = (
    parent: Object3D,
    material: Material,
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    axis: 'x' | 'z',
  ) => {
    const mesh = new Mesh(
      new CylinderGeometry(radius, radius, length, 10),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2;
    parent.add(mesh);
  };
  const label = (
    parent: Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    height: number,
    ink = '#f2f2e8',
    plate: string | null = null,
    yaw = 0,
  ) => {
    const mark = createMicroLabel(kit, text, { height, ink, plate });
    mark.position.set(x, y, z);
    mark.rotation.y = yaw;
    parent.add(mark);
    return mark;
  };
  // A small repeating canvas paints mortar joints, rather than one mesh per block.
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#d8d9d2';
  c.fillRect(0, 0, 128, 64);
  c.strokeStyle = '#b9bdb7';
  c.lineWidth = 2;
  for (const y of [0, 32, 63]) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(128, y);
    c.stroke();
  }
  for (const [x, y1, y2] of [
    [0, 0, 32],
    [64, 0, 32],
    [32, 32, 64],
    [96, 32, 64],
  ]) {
    c.beginPath();
    c.moveTo(x, y1);
    c.lineTo(x, y2);
    c.stroke();
  }
  const blocks = new CanvasTexture(canvas);
  blocks.colorSpace = SRGBColorSpace;
  blocks.wrapS = blocks.wrapT = RepeatWrapping;
  kit.textures.push(blocks);
  const blockMaterial = createPs1Material({ map: blocks, roughness: 0.88 });
  kit.materials.push(blockMaterial);
  mat.teal.side = DoubleSide;
  mat.magenta.side = DoubleSide;
  box(group, mat.concrete, 32, 0.12, 24, 0, -0.06, 0);
  box(group, mat.ceiling, 32, 0.12, 24, 0, 3.38, 0);
  for (const run of corridorWalls()) {
    const length = run.end - run.start;
    const geometry = new BoxGeometry(
      run.axis === 'x' ? 0.18 : length,
      2.78,
      run.axis === 'x' ? length : 0.18,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * length, uv.getY(i) * (2.78 / 0.4));
    const mesh = new Mesh(geometry, blockMaterial);
    const middle = (run.start + run.end) / 2;
    mesh.position.set(
      run.axis === 'x' ? run.position : middle,
      1.39,
      run.axis === 'x' ? middle : run.position,
    );
    group.add(mesh);
    // Dark painted skirting and corner guards seen throughout the photographs.
    box(
      group,
      mat.base,
      run.axis === 'x' ? 0.196 : length,
      0.16,
      run.axis === 'x' ? length : 0.196,
      mesh.position.x,
      0.08,
      mesh.position.z,
    );
    const t = 0.09;
    solids.push(
      run.axis === 'x'
        ? {
            minX: run.position - t,
            maxX: run.position + t,
            minZ: run.start,
            maxZ: run.end,
          }
        : {
            minX: run.start,
            maxX: run.end,
            minZ: run.position - t,
            maxZ: run.position + t,
          },
    );
  }

  // Low, practical routes for the exposed cable and HVAC services.
  const routes = [
    { axis: 'x', from: -16, to: -7, other: 10.5 },
    { axis: 'z', from: 2, to: 12, other: -8.5 },
    { axis: 'x', from: -10, to: 10, other: 3.5 },
    { axis: 'z', from: -5, to: 5, other: 8.5 },
    { axis: 'x', from: -10, to: 10, other: -3.5 },
    { axis: 'z', from: -12, to: -2, other: -8.5 },
    { axis: 'x', from: -16, to: -7, other: -10 },
  ] as const;
  for (const route of routes) {
    const length = route.to - route.from;
    const middle = (route.from + route.to) / 2;
    const x = route.axis === 'x' ? middle : route.other;
    const z = route.axis === 'x' ? route.other : middle;
    // Cable tray with two raised side rails and repeating cross members.
    box(
      group,
      mat.steel,
      route.axis === 'x' ? length : 0.55,
      0.025,
      route.axis === 'x' ? 0.55 : length,
      x,
      3.03,
      z,
    );
    for (const side of [-1, 1]) {
      const sx = x + (route.axis === 'z' ? side * 0.26 : 0);
      const sz = z + (route.axis === 'x' ? side * 0.26 : 0);
      box(
        group,
        mat.steel,
        route.axis === 'x' ? length : 0.02,
        0.09,
        route.axis === 'x' ? 0.02 : length,
        sx,
        3.09,
        sz,
      );
      cylinder(
        group,
        side === 1 ? mat.orange : mat.dark,
        0.012,
        length,
        sx,
        3.1,
        sz,
        route.axis,
      );
    }
    for (let at = route.from + 0.5; at < route.to; at += 2) {
      const hx = route.axis === 'x' ? at : route.other;
      const hz = route.axis === 'x' ? route.other : at;
      box(
        group,
        mat.steel,
        route.axis === 'x' ? 0.04 : 0.75,
        0.04,
        route.axis === 'x' ? 0.75 : 0.04,
        hx,
        3.2,
        hz,
      );
      for (const side of [-1, 1])
        box(
          group,
          mat.steel,
          0.014,
          0.24,
          0.014,
          hx + (route.axis === 'x' ? 0 : side * 0.32),
          3.2,
          hz + (route.axis === 'x' ? side * 0.32 : 0),
        );
    }
    // Foil-covered ducts and dark sprinkler pipe run beside the tray.
    cylinder(
      group,
      mat.duct,
      0.13,
      length,
      x + (route.axis === 'z' ? 0.75 : 0),
      2.93,
      z + (route.axis === 'x' ? 0.75 : 0),
      route.axis,
    );
    cylinder(
      group,
      mat.red,
      0.026,
      length,
      x + (route.axis === 'z' ? -0.72 : 0),
      3.18,
      z + (route.axis === 'x' ? -0.72 : 0),
      route.axis,
    );
  }

  // Wall-mounted fluorescent battens, repeated down the long runs.
  const fixtures = [
    [-12, 10.5, 0],
    [-8.5, 7, 1],
    [-6, 3.5, 0],
    [0, 3.5, 0],
    [6, 3.5, 0],
    [8.5, 0, 1],
    [5, -3.5, 0],
    [-1, -3.5, 0],
    [-7, -3.5, 0],
    [-8.5, -8, 1],
    [-12, -10, 0],
  ] as const;
  for (const [x, z, axis] of fixtures) {
    const fx = x + (axis ? 1.38 : 0);
    const fz = z + (axis ? 0 : 1.38);
    const housing = box(
      group,
      mat.greyDoor,
      axis ? 0.13 : 1.05,
      0.13,
      axis ? 1.05 : 0.13,
      fx,
      2.38,
      fz,
    );
    housing.name = 'Fluorescent strip light';
    box(
      group,
      mat.fluorescent,
      axis ? 0.14 : 0.98,
      0.075,
      axis ? 0.98 : 0.14,
      fx,
      2.37,
      fz,
    );
  }

  buildDoors(group, kit, mat, box, label);
  buildIndustrialSpaces(group, kit, mat, box, label);
  buildPaintedWayfinding(group, kit, mat, box, label);
  return { group, solids, lights: fixtures.map(([x, z]) => ({ x, z })) };
}

type Materials = Record<string, Material>;
type Box = (
  parent: Object3D,
  material: Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => Mesh;
type Label = (
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  height: number,
  ink?: string,
  plate?: string | null,
  yaw?: number,
) => Object3D;

function buildDoors(
  group: Group,
  kit: PanelKit,
  mat: Materials,
  box: Box,
  label: Label,
) {
  const firePair = (x: number, z: number) => {
    for (const side of [-1, 1]) {
      box(group, mat.greyDoor, 0.1, 2.32, 0.08, x, 1.16, z + side * 1.42);
      const pivot = new Group();
      pivot.position.set(x, 0, z + side * 1.35);
      pivot.rotation.y = side * 1.25;
      group.add(pivot);
      const leaf = box(
        pivot,
        mat.greyDoor,
        0.055,
        2.15,
        1.28,
        0,
        1.075,
        -side * 0.64,
      );
      leaf.name = 'Open fire door';
      box(pivot, mat.dark, 0.059, 0.8, 0.25, 0, 1.1, -side * 0.64);
      box(pivot, mat.cream, 0.06, 0.62, 0.21, 0, 1.1, -side * 0.64);
      box(pivot, mat.steel, 0.09, 0.34, 0.035, 0.01, 0.95, -side * 0.2);
    }
    box(group, mat.greyDoor, 0.13, 0.16, 2.9, x, 2.24, z);
    label(
      group,
      'EXIT  →',
      x + 0.09,
      2.49,
      z,
      0.11,
      '#f4f4ed',
      '#186747',
      Math.PI / 2,
    );
  };
  firePair(-0.5, 3.5);
  firePair(1.5, -3.5);
  // Open side access to plant and lockers; the throat remains walkable.
  for (const [x, z, orientation, text] of [
    [-3, 5.5, 0, 'LOCKERS'],
    [1, 5.5, 0, 'SERVICE BAY'],
    [10.5, 0, 1, 'PLANT ROOM'],
    [-2, -5.5, 0, 'LIFTS'],
  ] as const) {
    const door = box(
      group,
      mat.greyDoor,
      orientation ? 0.08 : 0.78,
      2.12,
      orientation ? 0.78 : 0.08,
      x + (orientation ? 0.45 : 0.48),
      1.06,
      z + (orientation ? 0.48 : 0.45),
    );
    door.name = `${text} access door, propped open`;
    label(group, text, x, 2.48, z, 0.085, '#323738', '#deded8');
  }
  // Closed grey utility doors on the corridor walls, with small glazed slits.
  for (const [x, z, yaw, name] of [
    [-11.7, 9, 0, 'ELECTRICAL'],
    [4.5, 2, 0, 'STAFF ONLY'],
    [8, -1.2, Math.PI / 2, 'PLANT ACCESS'],
    [-4, -5, 0, 'STORE'],
  ] as const) {
    const door = new Group();
    door.position.set(x, 0, z);
    door.rotation.y = yaw;
    group.add(door);
    box(door, mat.steel, 1.1, 2.24, 0.05, 0, 1.12, 0);
    box(door, mat.greyDoor, 0.99, 2.12, 0.06, 0, 1.06, 0.02);
    box(door, mat.dark, 0.14, 0.44, 0.008, 0, 1.55, 0.055);
    box(door, mat.cream, 0.12, 0.42, 0.006, 0, 1.55, 0.061);
    box(door, mat.steel, 0.025, 0.26, 0.05, 0.37, 1.05, 0.09);
    label(door, name, 0, 1.94, 0.065, 0.037, '#343a3c', '#e4e3dc');
  }
  void kit;
}

function buildIndustrialSpaces(
  group: Group,
  kit: PanelKit,
  mat: Materials,
  box: Box,
  label: Label,
) {
  // Blue steel lockers like those in the penultimate photographs.
  for (let i = 0; i < 11; i++) {
    const x = -5.55 + i * 0.49;
    box(group, mat.blue, 0.46, 1.9, 0.46, x, 0.95, 9.55);
    box(group, mat.steel, 0.028, 0.12, 0.01, x + 0.16, 1.05, 9.79);
    for (const y of [1.72, 1.64, 0.28, 0.2])
      box(group, mat.dark, 0.19, 0.006, 0.005, x, y, 9.79);
  }
  label(group, 'STAFF LOCKERS', -3, 2.36, 9.85, 0.075, '#e7e9e8', '#315080');
  // Photo-like green wheelie bins in a service recess.
  for (const x of [0.6, 2.0, 3.4]) {
    box(group, mat.green, 0.96, 1.04, 0.78, x, 0.56, 8.7);
    box(group, mat.green, 1.04, 0.075, 0.89, x, 1.11, 8.7);
    for (const dx of [-0.36, 0.36]) {
      const wheel = new Mesh(
        new CylinderGeometry(0.105, 0.105, 0.045, 12),
        mat.dark,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + dx, 0.12, 8.28);
      group.add(wheel);
    }
  }
  // First aid / eyewash station and a wall-mounted extinguisher.
  box(group, mat.cream, 0.56, 1.18, 0.18, -15.55, 1.3, 10.8);
  label(
    group,
    'FIRST AID\nEYE WASH',
    -15.55,
    1.62,
    10.91,
    0.055,
    '#f4f7ed',
    '#21805c',
  );
  box(group, mat.red, 0.16, 0.48, 0.14, 6.8, 0.95, 3.5);
  label(group, 'FIRE', 6.8, 1.37, 3.6, 0.035, '#fff7ed', '#b33d32');
  // Plant room: switchgear, a pump skid and modest service piping.
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * 0.85;
    box(group, mat.greyDoor, 0.78, 2.05, 0.6, x, 1.03, -2.45);
    label(
      group,
      `PANEL P-${i + 1}`,
      x,
      1.8,
      -2.135,
      0.035,
      '#e5e6df',
      '#303638',
    );
    box(group, mat.dark, 0.09, 0.19, 0.03, x + 0.27, 1.18, -2.13);
  }
  box(group, mat.steel, 1.3, 0.26, 0.84, 13.1, 0.15, 1.55);
  box(group, mat.blue, 0.46, 0.48, 0.4, 13.1, 0.48, 1.55);
  // Lift lobby: the photographs show magenta and teal wayfinding around lifts.
  box(group, mat.magenta, 6.8, 2.76, 0.02, -1.5, 1.38, -10.88);
  for (const x of [-3.2, -0.7]) {
    box(group, mat.steel, 1.55, 2.28, 0.08, x, 1.14, -10.92);
    box(group, mat.greyDoor, 0.74, 2.13, 0.085, x - 0.38, 1.065, -10.87);
    box(group, mat.greyDoor, 0.74, 2.13, 0.085, x + 0.38, 1.065, -10.87);
  }
  label(group, 'LIFTS', -1.95, 2.55, -10.86, 0.1, '#f1ede8', '#a53b83');
  box(group, mat.yellow, 6.6, 0.008, 0.58, -1.5, 0.005, -9.5);
  void kit;
}

function buildPaintedWayfinding(
  group: Group,
  kit: PanelKit,
  mat: Materials,
  box: Box,
  label: Label,
) {
  const triangle = (
    x: number,
    z: number,
    yaw: number,
    width: number,
    height: number,
    material: Material,
  ) => {
    const shape = new Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.closePath();
    const mesh = new Mesh(new ShapeGeometry(shape), material);
    mesh.position.set(x, 0.16, z);
    mesh.rotation.y = yaw;
    group.add(mesh);
  };
  // Bold diagonal fields mark junctions, while the rest remains plain blockwork.
  for (const [x, z, yaw, colour] of [
    [-7.11, 10.5, -Math.PI / 2, mat.teal],
    [-8.5, 2.1, 0, mat.teal],
    [9.9, 3.5, -Math.PI / 2, mat.teal],
    [-9.9, -3.5, Math.PI / 2, mat.magenta],
    [-8.5, -8.1, 0, mat.teal],
    [-5.6, -6.08, 0, mat.magenta],
    [4.9, 5.93, Math.PI, mat.teal],
  ] as const)
    triangle(x, z, yaw, 2.4, 2.55, colour);
  label(
    group,
    'PLANT ROOMS  →',
    9.81,
    1.67,
    0.2,
    0.077,
    '#202b2d',
    '#54bec0',
    -Math.PI / 2,
  );
  label(group, 'LIFTS  ←', -2, 2.37, -6.02, 0.075, '#f2ece7', '#a43b82');
  label(group, 'EXIT  ←', -10, 2.43, -10.02, 0.088, '#f0f6ed', '#27704c');
  // A blue/purple painted wall with orange curved marking near the lift turn.
  box(group, mat.purple, 0.025, 2.7, 3.8, -10.12, 1.35, -8.2);
  box(group, mat.orange, 0.031, 0.035, 3.4, -10.09, 0.82, -8.2);
  label(
    group,
    'SERVICE LEVEL',
    -10.06,
    2.1,
    -8.2,
    0.07,
    '#e9ecec',
    null,
    Math.PI / 2,
  );
  void kit;
}
