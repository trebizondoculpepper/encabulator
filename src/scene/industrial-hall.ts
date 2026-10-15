import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import type { Footprint } from '../game/walk-collision';
import type { HallSurface, Surface } from './hall-surfaces';
import { createPendantLamps } from './pendant-lamps';
import type { PendantPlace } from './pendant-lamps';

/**
 * The great hall the game takes place in: a vast enclosed American
 * industrial interior, brutalist in its weight, stepped in section. A
 * 24 m high central nave under a coffered waffle slab with skylights,
 * lit from tall vertical clerestory windows down both sides and at both
 * ends, runs between two 10 m side halls under thick slabs, whose edges
 * are balconies over the nave on a line of massive columns. Polished
 * concrete underfoot, industrial pendant lamps on chains throughout, overcast daylight as a
 * flat white glare (the room adds bloom). No way out: the hall is the
 * whole world.
 *
 * Built in metres, floor at y = 0, centred on the origin. Each building
 * surface wears a `Surface` (see `hall-surfaces.ts`) so its material can
 * be changed; repeated members are instanced.
 */

/** The hall's size, metres: length along x, width along z. */
export const HALL_LENGTH = 150;
export const HALL_WIDTH = 90;
/** The nave's width and height, and the side halls' height. */
export const NAVE_WIDTH = 44;
export const NAVE_HEIGHT = 24;
export const SIDE_HEIGHT = 10;

/** Collects boxes by material and builds one instanced mesh per material. */
function createBatcher() {
  const geometry = new BoxGeometry(1, 1, 1);
  const batches = new Map<Material, Matrix4[]>();
  const q = new Quaternion();
  return {
    /** A box of size (w, h, d) at (x, y, z). */
    box(
      material: Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) {
      let list = batches.get(material);
      if (!list) batches.set(material, (list = []));
      list.push(
        new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(w, h, d)),
      );
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

/** An opening in the hall's east end wall, for a door; its inside face's middle at (x, z). */
export interface Doorway {
  x: number;
  z: number;
  width: number;
  height: number;
  kind: 'main' | 'dock';
}

export interface Hall {
  group: Group;
  /** The columns and walls, metres, for walking into. */
  solids: Footprint[];
  /** Where the high-bay lamps hang, metres. */
  lamps: Vector3[];
  /** The sky through the glass, and the lamps' lenses, to colour and brighten. */
  sky: MeshBasicMaterial;
  lampGlow: MeshBasicMaterial;
  /** The copper lining of the lamps' domes, lit by their bulbs. */
  lampLining: MeshBasicMaterial;
  /** The openings in the east end wall: the great door and the dock doors. */
  doorways: Doorway[];
  dispose(): void;
}

export function createIndustrialHall(
  surfaces: Record<HallSurface, Surface>,
): Hall {
  const group = new Group();
  group.name = 'The Hall';
  const batch = createBatcher();
  const geometries: BufferGeometry[] = [batch.geometry];
  const materials: Material[] = [];
  const solids: Footprint[] = [];
  const lamps: Vector3[] = [];
  const doorways: Doorway[] = [];
  const L = HALL_LENGTH;
  const W = HALL_WIDTH;
  const nave = NAVE_WIDTH;
  const high = NAVE_HEIGHT;
  const low = SIDE_HEIGHT;
  const walls = surfaces.walls.material;
  const columns = surfaces.columns.material;
  const struts = surfaces.struts.material;
  const ceiling = surfaces.ceiling.material;
  const sky = new MeshBasicMaterial({ color: new Color(1.7, 1.72, 1.76) });
  sky.toneMapped = false;
  const lampGlow = new MeshBasicMaterial({ color: new Color(2.2, 2.0, 1.7) });
  lampGlow.toneMapped = false;
  const steel = new MeshStandardMaterial({
    color: '#41464a',
    roughness: 0.5,
    metalness: 0.6,
  });
  const mullion = new MeshStandardMaterial({
    color: '#2b2f32',
    roughness: 0.5,
    metalness: 0.5,
  });
  const yellow = new MeshStandardMaterial({ color: '#d9a514', roughness: 0.4 });
  materials.push(sky, lampGlow, steel, mullion, yellow);

  /** A high-bay lamp hung at `y` from `top`. */
  /** A pendant lamp, its dome's rim at `y`, its chain hung from `top`. */
  const places: PendantPlace[] = [];
  const lamp = (x: number, z: number, y: number, top: number, size: number) => {
    places.push({ x, z, y, top, size });
    lamps.push(new Vector3(x, y, z));
  };

  // ---- The floor ---------------------------------------------------------
  const floor = new Mesh(new PlaneGeometry(L, W), surfaces.floor.material);
  floor.rotation.x = -Math.PI / 2;
  geometries.push(floor.geometry);
  group.add(floor);

  /** A band of glass between two heights along x at `z`, or along z at `x`. */
  const windowBand = (
    alongX: boolean,
    at: number,
    from: number,
    to: number,
    start: number,
    end: number,
    pane = 1.25,
  ) => {
    const length = end - start;
    const mid = (start + end) / 2;
    const h = to - from;
    const place = (
      along: number,
      y: number,
      w: number,
      hh: number,
      d: number,
      material: Material,
    ) =>
      alongX
        ? batch.box(material, w, hh, d, along, y, at)
        : batch.box(material, d, hh, w, at, y, along);
    place(mid, from + h / 2, length, h, 0.05, sky);
    const panes = Math.max(1, Math.round(length / pane));
    for (let i = 0; i <= panes; i++)
      place(start + (i * length) / panes, from + h / 2, 0.08, h, 0.14, mullion);
    const rows = Math.max(1, Math.round(h / 1.5));
    for (let r = 0; r <= rows; r++)
      place(mid, from + (r * h) / rows, length, 0.08, 0.14, mullion);
  };
  /**
   * A wall of tall vertical windows: piers every `bay` metres with glass
   * between them from `from` to `to`, solid wall below and above.
   */
  const clerestory = (
    alongX: boolean,
    at: number,
    start: number,
    end: number,
    bottom: number,
    from: number,
    to: number,
    top: number,
    bay = 7.5,
    pier = 1.8,
  ) => {
    const length = end - start;
    const mid = (start + end) / 2;
    const solid = (along: number, y: number, w: number, h: number) =>
      alongX
        ? batch.box(struts, w, h, 0.8, along, y, at)
        : batch.box(struts, 0.8, h, w, at, y, along);
    solid(mid, (bottom + from) / 2, length, from - bottom);
    solid(mid, (to + top) / 2, length, top - to);
    const bays = Math.max(1, Math.round(length / bay));
    const step = length / bays;
    for (let i = 0; i <= bays; i++)
      solid(start + i * step, (from + to) / 2, pier, to - from);
    for (let i = 0; i < bays; i++)
      windowBand(
        alongX,
        at,
        from,
        to,
        start + i * step + pier / 2,
        start + (i + 1) * step - pier / 2,
      );
  };

  // ---- Outer walls: board-formed, with pilasters and a plinth ------------
  const outer = (
    alongX: boolean,
    at: number,
    length: number,
    height: number,
    outward: number,
    windowed: (bay: number) => boolean = () => false,
  ) => {
    const face = at - outward * 0.3;
    // The wall in 7.5 m bays between pilasters; a windowed bay has tall
    // glass from sill to head, with solid wall below and above.
    const bays = Math.round(length / 7.5);
    const step = length / bays;
    const sill = 2.6;
    const head = Math.min(height - 1.6, 8.6);
    const piece = (along: number, w: number, y0: number, y1: number) => {
      if (alongX) batch.box(walls, w, y1 - y0, 0.6, along, (y0 + y1) / 2, at);
      else batch.box(walls, 0.6, y1 - y0, w, at, (y0 + y1) / 2, along);
    };
    for (let i = 0; i < bays; i++) {
      const start = -length / 2 + i * step;
      const mid = start + step / 2;
      if (!windowed(i)) {
        piece(mid, step, 0, height);
        continue;
      }
      piece(mid, step, 0, sill);
      piece(mid, step, head, height);
      // Solid jambs either side of the glass, behind the pilasters.
      for (const end of [start + 0.6, start + step - 0.6])
        piece(end, 1.2, sill, head);
      windowBand(
        alongX,
        at - outward * 0.05,
        sill,
        head,
        start + 1.2,
        start + step - 1.2,
      );
    }
    for (let t = -length / 2 + 7.5; t < length / 2 - 1; t += 7.5) {
      if (alongX)
        batch.box(
          walls,
          1.4,
          height,
          0.5,
          t,
          height / 2,
          face - outward * 0.25,
        );
      else
        batch.box(
          walls,
          0.5,
          height,
          1.4,
          face - outward * 0.25,
          height / 2,
          t,
        );
    }
    if (alongX) batch.box(walls, length, 1, 0.3, 0, 0.5, face - outward * 0.15);
    else batch.box(walls, 0.3, 1, length, face - outward * 0.15, 0.5, 0);
    solids.push(
      alongX
        ? {
            minX: -length / 2,
            maxX: length / 2,
            minZ: at - 0.9,
            maxZ: at + 0.9,
          }
        : {
            minX: at - 0.9,
            maxX: at + 0.9,
            minZ: -length / 2,
            maxZ: length / 2,
          },
    );
  };
  // Windows in every other bay of the side halls' long walls, and in the
  // low end walls, for daylight at eye level and for the floor to reflect.
  outer(true, -W / 2 - 0.3, L, low + 1.4, -1, (i) => i % 2 === 1);
  outer(true, W / 2 + 0.3, L, low + 1.4, 1, (i) => i % 2 === 1);
  // The west end wall: windows low across the side halls, and the nave's
  // end rising high with tall windows.
  {
    const x = -(L / 2 + 0.3);
    outer(false, x, W, low + 1.4, -1, (i) => i % 2 === 0);
    clerestory(
      false,
      x,
      -nave / 2,
      nave / 2,
      low + 1.4,
      low + 3,
      high - 1,
      high + 1.6,
      7.33,
      1.6,
    );
  }
  // The east end wall: solid, with the great door in the nave's end and a
  // truck dock door in each side hall.
  {
    const x = L / 2 + 0.3;
    const top = high + 1.6;
    const main = { width: 24, height: 14 };
    const dock = {
      width: 3.66,
      height: 4.27,
      z: nave / 2 + (W / 2 - nave / 2) / 2,
    };
    const piece = (z0: number, z1: number, y0: number, y1: number) => {
      if (z1 <= z0 || y1 <= y0) return;
      batch.box(walls, 0.6, y1 - y0, z1 - z0, x, (y0 + y1) / 2, (z0 + z1) / 2);
    };
    // The nave's end, round the great door.
    piece(-nave / 2, -main.width / 2, 0, top);
    piece(main.width / 2, nave / 2, 0, top);
    piece(-main.width / 2, main.width / 2, main.height, top);
    // The side halls' ends, round their dock doors.
    for (const sz of [-1, 1]) {
      const [a, b] =
        sz > 0 ? [nave / 2, W / 2 + 0.6] : [-W / 2 - 0.6, -nave / 2];
      const d0 = sz * dock.z - dock.width / 2;
      const d1 = sz * dock.z + dock.width / 2;
      piece(a, d0, 0, low + 1.4);
      piece(d1, b, 0, low + 1.4);
      piece(d0, d1, dock.height, low + 1.4);
      doorways.push({
        x: x - 0.3,
        z: sz * dock.z,
        width: dock.width,
        height: dock.height,
        kind: 'dock',
      });
    }
    // Pilasters on the inside face, clear of the openings.
    for (let z = -W / 2 + 7.5; z < W / 2 - 1; z += 7.5) {
      const clear = (z0: number, z1: number) => z < z0 - 1 || z > z1 + 1;
      if (!clear(-main.width / 2, main.width / 2)) continue;
      if (
        !clear(dock.z - dock.width / 2, dock.z + dock.width / 2) ||
        !clear(-dock.z - dock.width / 2, -dock.z + dock.width / 2)
      )
        continue;
      const h = Math.abs(z) < nave / 2 ? top : low + 1.4;
      batch.box(walls, 0.5, h, 1.4, x - 0.55, h / 2, z);
    }
    doorways.push({
      x: x - 0.3,
      z: 0,
      width: main.width,
      height: main.height,
      kind: 'main',
    });
    solids.push({ minX: x - 0.9, maxX: x + 0.9, minZ: -W / 2, maxZ: W / 2 });
  }

  // ---- The side halls: thick slabs, balcony edges, columns, lamps --------
  for (const sz of [-1, 1]) {
    const z0 = sz > 0 ? nave / 2 : -W / 2;
    const z1 = sz > 0 ? W / 2 : -nave / 2;
    batch.box(ceiling, L, 0.9, z1 - z0, 0, low + 0.45, (z0 + z1) / 2);
    // Downstand beams under the slab, every 7.5 m.
    for (let x = -L / 2 + 7.5; x < L / 2; x += 7.5)
      batch.box(struts, 0.6, 1.1, z1 - z0, x, low - 0.55, (z0 + z1) / 2);
    // The balcony's upstand and its railing over the nave.
    batch.box(struts, L, 1.2, 0.35, 0, low + 1.5, (sz * nave) / 2);
    batch.box(steel, L, 0.05, 0.05, 0, low + 2.15, (sz * nave) / 2);
    // The nave's side walls above the balconies: tall vertical windows.
    clerestory(
      true,
      (sz * nave) / 2 + sz * 2.5,
      -L / 2,
      L / 2,
      low + 0.9,
      low + 2.6,
      high - 1,
      high + 1.6,
    );
    // The columns under the balcony edge.
    for (let x = -L / 2 + 15; x < L / 2 - 1; x += 15) {
      const z = (sz * nave) / 2;
      batch.box(columns, 1.2, low, 1.2, x, low / 2, z);
      batch.box(columns, 1.5, 0.3, 1.5, x, 0.15, z);
      solids.push({
        minX: x - 0.8,
        maxX: x + 0.8,
        minZ: z - 0.8,
        maxZ: z + 0.8,
      });
    }
    for (let x = -L / 2 + 6; x < L / 2; x += 12)
      for (let z = z0 + 6; z < z1 - 3; z += 12) lamp(x, z, low - 2.4, low, 0.6);
  }

  // ---- The nave's waffle slab, with skylights in some coffers -----------
  {
    const pitch = 3.2;
    const rib = 1.2;
    const y = high;
    const span = nave + 5;
    batch.box(ceiling, L, 0.4, span, 0, y + rib + 0.2, 0);
    for (let x = -L / 2; x <= L / 2 + 0.01; x += pitch)
      batch.box(struts, 0.35, rib, span, x, y + rib / 2, 0);
    for (let z = -span / 2; z <= span / 2 + 0.01; z += pitch)
      batch.box(struts, L, rib, 0.35, 0, y + rib / 2, z);
    let i = 0;
    for (let x = -L / 2 + pitch / 2; x < L / 2; x += pitch, i++) {
      let k = 0;
      for (let z = -span / 2 + pitch / 2; z < span / 2; z += pitch, k++)
        if (i % 3 === 1 && k % 3 === 1)
          batch.box(sky, pitch - 0.5, 0.05, pitch - 0.5, x, y + rib, z);
    }
    for (let x = -L / 2 + 6; x < L / 2; x += 12)
      for (let z = -nave / 2 + 6; z < nave / 2; z += 12)
        lamp(x, z, 15, high, 0.8);
  }

  batch.build(group);
  const pendants = createPendantLamps(places, lampGlow);
  group.add(pendants.group);
  return {
    group,
    solids,
    lamps,
    sky,
    lampGlow,
    lampLining: pendants.lining,
    doorways,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      pendants.dispose();
    },
  };
}
