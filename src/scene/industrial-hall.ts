import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import type { Footprint } from '../game/walk-collision';

/**
 * The great hall the game takes place in: a vast enclosed American
 * industrial interior in raw, board-formed concrete, brutalist in its
 * weight. Polished concrete underfoot, a high ceiling, the occasional
 * massive column, overcast daylight through skylights (a flat white glare;
 * the room adds bloom) and rows of high-bay lamps. No windows to the
 * outside and no way out: the hall is the whole world. Built in metres,
 * floor at y = 0, centred on the origin; repeated members are instanced.
 *
 * Five ceilings to choose between:
 *
 * 1. Waffle slab: a deep coffered grid, every few coffers a skylight.
 * 2. Deep beams: massive concrete beams across the hall, skylight slots
 *    between them.
 * 3. Folded plates: a concrete sawtooth of tilted planes, a strip of
 *    skylight at each fold.
 * 4. Barrel vaults: a row of long concrete vaults, each split along its
 *    crown by a skylight.
 * 5. Stepped hall: a high central nave under a waffle slab, with lower
 *    side halls beneath thick slabs and mezzanine balconies over them.
 */

export const HALL_STYLES = [
  'Waffle slab',
  'Deep beams',
  'Folded plates',
  'Barrel vaults',
  'Stepped hall',
] as const;

/** How big the hall is: length along x, width along z, metres. */
export const HALL_LENGTH = 150;
export const HALL_WIDTH = 90;

/** Collects boxes by material and builds one instanced mesh per material. */
function createBatcher() {
  const geometry = new BoxGeometry(1, 1, 1);
  const batches = new Map<Material, Matrix4[]>();
  const q = new Quaternion();
  const turn = new Quaternion();
  const axis = new Vector3();
  return {
    /** A box of size (w, h, d) at (x, y, z), turned by `ry` about y, then `rx` about x, then `rz` about z. */
    box(
      material: Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      rx = 0,
      ry = 0,
      rz = 0,
    ) {
      q.identity();
      if (ry) q.multiply(turn.setFromAxisAngle(axis.set(0, 1, 0), ry));
      if (rx) q.multiply(turn.setFromAxisAngle(axis.set(1, 0, 0), rx));
      if (rz) q.multiply(turn.setFromAxisAngle(axis.set(0, 0, 1), rz));
      const m = new Matrix4().compose(
        new Vector3(x, y, z),
        q,
        new Vector3(w, h, d),
      );
      let list = batches.get(material);
      if (!list) batches.set(material, (list = []));
      list.push(m);
    },
    build(group: Group) {
      for (const [material, list] of batches) {
        const mesh = new InstancedMesh(geometry, material, list.length);
        list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
      }
    },
    geometry,
  };
}

/** Seeded noise, so the hall looks the same every time. */
function seeded(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

/** A canvas texture, drawn once and tiled. */
function texture(
  size: number,
  draw: (c: CanvasRenderingContext2D, s: number) => void,
  repeat: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

/** Polished concrete: mottled, troweled grey with saw-cut joints every six metres. */
function polishedConcrete() {
  const random = seeded(7);
  return texture(
    512,
    (c, s) => {
      c.fillStyle = '#a3a29d';
      c.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const shade = 130 + random() * 55;
        c.fillStyle = `rgba(${shade},${shade},${shade - 5},${0.04 + random() * 0.08})`;
        c.beginPath();
        c.arc(random() * s, random() * s, 3 + random() * 38, 0, Math.PI * 2);
        c.fill();
      }
      // Fine aggregate showing through the polish.
      for (let i = 0; i < 3000; i++) {
        const shade = 90 + random() * 120;
        c.fillStyle = `rgba(${shade},${shade - 4},${shade - 10},0.35)`;
        c.fillRect(random() * s, random() * s, 1.2, 1.2);
      }
      c.strokeStyle = 'rgba(60,60,58,0.4)';
      c.lineWidth = 1.2;
      c.strokeRect(0, 0, s, s);
    },
    [HALL_LENGTH / 6, HALL_WIDTH / 6],
  );
}

/**
 * Board-formed concrete: the grain and seams of the planks it was cast
 * against, in horizontal courses, with the form-tie holes in rows.
 * One tile is 2.4 m square.
 */
function boardFormed(repeat: [number, number], seed = 3) {
  const random = seeded(seed);
  return texture(
    512,
    (c, s) => {
      c.fillStyle = '#b1aea5';
      c.fillRect(0, 0, s, s);
      const boards = 16;
      const bh = s / boards;
      for (let b = 0; b < boards; b++) {
        const shade = 160 + random() * 30;
        c.fillStyle = `rgba(${shade},${shade - 3},${shade - 10},0.35)`;
        c.fillRect(0, b * bh, s, bh);
        // The grain of each board.
        for (let g = 0; g < 14; g++) {
          c.strokeStyle = `rgba(80,78,72,${0.04 + random() * 0.06})`;
          c.lineWidth = 1;
          c.beginPath();
          const y = b * bh + random() * bh;
          c.moveTo(0, y);
          c.bezierCurveTo(
            s * 0.3,
            y + random() * 4 - 2,
            s * 0.6,
            y + random() * 4 - 2,
            s,
            y,
          );
          c.stroke();
        }
        c.fillStyle = 'rgba(60,58,54,0.35)';
        c.fillRect(0, b * bh, s, 1.5);
      }
      // Form-tie holes, in a grid.
      for (let ty = 0; ty < 4; ty++)
        for (let tx = 0; tx < 4; tx++) {
          c.fillStyle = 'rgba(40,38,35,0.6)';
          c.beginPath();
          c.arc(
            (tx + 0.5) * (s / 4),
            (ty + 0.5) * (s / 4),
            3.5,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
      // Water stains running down.
      for (let i = 0; i < 6; i++) {
        const x = random() * s;
        const g = c.createLinearGradient(0, 0, 0, s);
        g.addColorStop(0, 'rgba(70,68,60,0.18)');
        g.addColorStop(1, 'rgba(70,68,60,0)');
        c.fillStyle = g;
        c.fillRect(x, 0, 4 + random() * 10, s * (0.3 + random() * 0.7));
      }
    },
    repeat,
  );
}

export interface Hall {
  group: Group;
  /** The columns and walls, for walking into. */
  solids: Footprint[];
  /** Where the high-bay lamps hang, metres, for the room to light. */
  lamps: Vector3[];
  /** The style's number and name. */
  number: number;
  name: string;
  dispose(): void;
}

export function createIndustrialHall(number: number): Hall {
  const style = Math.max(1, Math.min(HALL_STYLES.length, Math.round(number)));
  const group = new Group();
  group.name = HALL_STYLES[style - 1];
  const batch = createBatcher();
  const textures: Texture[] = [];
  const materials: Material[] = [];
  const geometries: BufferGeometry[] = [batch.geometry];
  const solids: Footprint[] = [];
  const lamps: Vector3[] = [];
  const standard = (
    color: string,
    roughness = 0.85,
    metalness = 0,
    map?: Texture,
  ) => {
    const material = new MeshStandardMaterial({
      color,
      roughness,
      metalness,
      map,
    });
    materials.push(material);
    if (map) textures.push(map);
    return material;
  };
  const L = HALL_LENGTH;
  const W = HALL_WIDTH;
  // Overcast sky through the skylights: brighter than white, so it blooms.
  const sky = new MeshBasicMaterial({ color: new Color(1.7, 1.72, 1.76) });
  sky.toneMapped = false;
  materials.push(sky);
  const lampGlow = new MeshBasicMaterial({ color: new Color(2.2, 2.0, 1.7) });
  lampGlow.toneMapped = false;
  materials.push(lampGlow);
  const concrete = standard('#ffffff', 0.92, 0, boardFormed([1, 1]));
  const plain = standard('#b9b6ad', 0.95);
  const steel = standard('#4a4f53', 0.55, 0.5);
  const yellow = standard('#d9a514', 0.5, 0.2);

  // ---- The floor ---------------------------------------------------------
  const floor = new Mesh(
    new PlaneGeometry(L, W),
    standard('#ffffff', 0.18, 0, polishedConcrete()),
  );
  floor.rotation.x = -Math.PI / 2;
  geometries.push(floor.geometry);
  group.add(floor);
  for (const z of [-3, 3]) batch.box(yellow, L - 16, 0.004, 0.12, 0, 0.002, z);

  // ---- Walls: board-formed concrete with pilasters, and nothing beyond ---
  const wall = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    height: number,
  ) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const material = standard(
      '#ffffff',
      0.92,
      0,
      boardFormed([length / 2.4, height / 2.4], Math.round(length)),
    );
    const mesh = new Mesh(new BoxGeometry(length, height, 0.6), material);
    mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
    mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    geometries.push(mesh.geometry);
    group.add(mesh);
    solids.push({
      minX: Math.min(x1, x2) - 0.4,
      maxX: Math.max(x1, x2) + 0.4,
      minZ: Math.min(z1, z2) - 0.4,
      maxZ: Math.max(z1, z2) + 0.4,
    });
    // Pilasters every fifteen metres, standing proud of the wall.
    const ux = (x2 - x1) / length;
    const uz = (z2 - z1) / length;
    const nx = -uz;
    const nz = ux;
    for (let t = 15; t < length - 1; t += 15)
      batch.box(
        concrete,
        1.4,
        height,
        0.9,
        x1 + ux * t + nx * 0.6,
        height / 2,
        z1 + uz * t + nz * 0.6,
        0,
        -Math.atan2(z2 - z1, x2 - x1),
      );
    // A plinth of plain concrete, a metre high, along the foot.
    batch.box(
      plain,
      length,
      1,
      0.75,
      (x1 + x2) / 2 + nx * 0.1,
      0.5,
      (z1 + z2) / 2 + nz * 0.1,
      0,
      -Math.atan2(z2 - z1, x2 - x1),
    );
  };
  /** The four walls, `height` tall, their inner faces on the hall's edges. */
  const enclose = (height: number) => {
    wall(-L / 2, -W / 2 - 0.3, L / 2, -W / 2 - 0.3, height);
    wall(L / 2, W / 2 + 0.3, -L / 2, W / 2 + 0.3, height);
    wall(-L / 2 - 0.3, W / 2, -L / 2 - 0.3, -W / 2, height);
    wall(L / 2 + 0.3, -W / 2, L / 2 + 0.3, W / 2, height);
  };
  /** A massive square concrete column, its top at `h`. */
  const column = (x: number, z: number, h: number, size = 1.3) => {
    batch.box(concrete, size, h, size, x, h / 2, z);
    // A chamfered foot, as cast.
    batch.box(plain, size + 0.3, 0.3, size + 0.3, x, 0.15, z);
    solids.push({
      minX: x - size / 2 - 0.2,
      maxX: x + size / 2 + 0.2,
      minZ: z - size / 2 - 0.2,
      maxZ: z + size / 2 + 0.2,
    });
  };
  /** A high-bay lamp hung at `y`: a drop rod, a ballast box, a reflector and its glowing lens. */
  const lamp = (x: number, z: number, y: number, top: number) => {
    batch.box(steel, 0.03, top - y, 0.03, x, (y + top) / 2, z);
    batch.box(steel, 0.35, 0.3, 0.35, x, y + 0.3, z);
    const reflector = new Mesh(
      new CylinderGeometry(0.22, 0.45, 0.5, 12, 1, true),
      steel,
    );
    reflector.position.set(x, y, z);
    group.add(reflector);
    geometries.push(reflector.geometry);
    batch.box(lampGlow, 0.62, 0.02, 0.62, x, y - 0.25, z);
    lamps.push(new Vector3(x, y - 0.3, z));
  };
  /** A grid of lamps at `y` under a ceiling at `top`, inside a rectangle. */
  const lampGrid = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    y: number,
    top: number,
    pitch = 12,
  ) => {
    for (let x = x0 + pitch / 2; x < x1; x += pitch)
      for (let z = z0 + pitch / 2; z < z1; z += pitch) lamp(x, z, y, top);
  };
  /** A waffle slab over a rectangle at `y`: ribs every `pitch`, a skylight every `every` coffers. */
  const waffle = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    y: number,
    pitch = 3,
    rib = 1.1,
    every = 4,
  ) => {
    const w = x1 - x0;
    const d = z1 - z0;
    batch.box(plain, w, 0.4, d, (x0 + x1) / 2, y + rib + 0.2, (z0 + z1) / 2);
    for (let x = x0; x <= x1 + 0.01; x += pitch)
      batch.box(concrete, 0.35, rib, d, x, y + rib / 2, (z0 + z1) / 2);
    for (let z = z0; z <= z1 + 0.01; z += pitch)
      batch.box(concrete, w, rib, 0.35, (x0 + x1) / 2, y + rib / 2, z);
    let i = 0;
    for (let x = x0 + pitch / 2; x < x1; x += pitch, i++) {
      let k = 0;
      for (let z = z0 + pitch / 2; z < z1; z += pitch, k++)
        if (i % every === 1 && k % every === 1)
          batch.box(sky, pitch - 0.5, 0.05, pitch - 0.5, x, y + rib + 0.0, z);
    }
  };

  if (style === 1) {
    const h = 18;
    enclose(h + 1.6);
    waffle(-L / 2, -W / 2, L / 2, W / 2, h);
    for (let x = -L / 2 + 30; x < L / 2 - 1; x += 30)
      for (const z of [-W / 6, W / 6]) column(x, z, h);
    lampGrid(-L / 2, -W / 2, L / 2, W / 2, 11, h);
  } else if (style === 2) {
    const h = 20;
    const depth = 2.8;
    enclose(h + depth + 0.5);
    batch.box(plain, L, 0.5, W, 0, h + depth + 0.25, 0);
    for (let x = -L / 2 + 10; x < L / 2; x += 10) {
      batch.box(concrete, 1.2, depth, W, x, h + depth / 2, 0);
      // Between each pair of beams, a skylight slot down the middle.
      if (x + 10 < L / 2)
        batch.box(sky, 6, 0.05, W - 20, x + 5, h + depth + 0.0, 0);
    }
    for (let x = -L / 2 + 30; x < L / 2 - 1; x += 30)
      for (const z of [-W / 4, W / 4]) column(x, z, h);
    lampGrid(-L / 2, -W / 2, L / 2, W / 2, 12, h, 10);
  } else if (style === 3) {
    const eave = 16;
    const fold = 9;
    const rise = 5;
    enclose(eave + rise + 0.5);
    for (let z = -W / 2; z < W / 2 - 0.1; z += fold) {
      const slope = Math.hypot(fold, rise);
      // A tilted concrete plate, rising south to north...
      batch.box(
        concrete,
        L,
        0.45,
        slope - 1.2,
        0,
        eave + rise / 2,
        z + fold / 2 + 0.6,
        -Math.atan2(rise, fold - 1.2),
      );
      // ...and a strip of skylight in the fold, tilted to the north sky.
      batch.box(
        sky,
        L,
        0.05,
        1.6,
        0,
        eave + rise - 0.2,
        z + fold - 0.2,
        Math.PI / 3,
      );
      // The fold's deep valley beam.
      batch.box(concrete, L, 1.6, 0.9, 0, eave - 0.3, z);
    }
    for (let x = -L / 2 + 25; x < L / 2 - 1; x += 25)
      for (let z = -W / 2 + fold * 3; z < W / 2 - 1; z += fold * 3)
        column(x, z, eave - 1.1);
    lampGrid(-L / 2, -W / 2, L / 2, W / 2, 11, eave - 1.1);
  } else if (style === 4) {
    const spring = 15;
    const vault = 15;
    const radius = vault / 2;
    enclose(spring + radius + 0.8);
    for (let x = -L / 2; x < L / 2 - 0.1; x += vault) {
      // Each vault runs the hall's width, as a half cylinder of segments,
      // split at its crown by a skylight.
      const cx = x + vault / 2;
      const segments = 14;
      for (let s = 0; s < segments; s++) {
        const a0 = (s / segments) * Math.PI;
        const a = a0 + Math.PI / segments / 2;
        if (Math.abs(a - Math.PI / 2) < 0.12) continue;
        const px = cx - Math.cos(a) * radius;
        const py = spring + Math.sin(a) * radius;
        const chord = 2 * radius * Math.sin(Math.PI / segments / 2) + 0.05;
        batch.box(concrete, chord, 0.4, W, px, py, 0, 0, 0, Math.PI / 2 - a);
      }
      batch.box(sky, 1.3, 0.05, W - 2, cx, spring + radius + 0.15, 0);
      // The edge beam between vaults.
      batch.box(concrete, 1.4, 1.4, W, x, spring - 0.7, 0);
    }
    for (let x = -L / 2 + vault * 2; x < L / 2 - 1; x += vault * 2)
      for (const z of [-W / 4, W / 4]) column(x, z, spring - 1.4, 1.5);
    for (let x = -L / 2 + vault / 2; x < L / 2; x += vault)
      for (let z = -W / 2 + 7.5; z < W / 2; z += 15)
        lamp(x, z, 12, spring + radius - 0.3);
  } else if (style === 5) {
    const high = 24;
    const low = 10;
    const nave = 44;
    enclose(high + 1.6);
    waffle(-L / 2, -nave / 2, L / 2, nave / 2, high, 3.2, 1.2, 3);
    for (const sz of [-1, 1]) {
      const z0 = sz > 0 ? nave / 2 : -W / 2;
      const z1 = sz > 0 ? W / 2 : -nave / 2;
      // The thick slab over each side hall, and its balcony over the nave.
      batch.box(plain, L, 0.9, z1 - z0, 0, low + 0.45, (z0 + z1) / 2);
      batch.box(concrete, L, 1.2, 0.35, 0, low + 1.5, (sz * nave) / 2);
      // The wall above the slab, up to the nave's ceiling, on columns.
      batch.box(
        concrete,
        L,
        high - low - 2.1,
        0.8,
        0,
        (high + low + 2.1) / 2,
        (sz * nave) / 2 + sz * 0.4,
      );
      for (let x = -L / 2 + 15; x < L / 2 - 1; x += 15)
        column(x, (sz * nave) / 2, low, 1.2);
      lampGrid(-L / 2, z0, L / 2, z1, low - 1.2, low, 12);
    }
    lampGrid(-L / 2, -nave / 2, L / 2, nave / 2, 15, high);
  }
  batch.build(group);

  return {
    group,
    solids,
    lamps,
    number: style,
    name: HALL_STYLES[style - 1],
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
