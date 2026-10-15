import { Color, Group } from 'three';
import type { Mesh } from 'three';
import type { Material } from 'three';
import type { Footprint } from '../game/walk-collision';
import { createBuildKit } from './build-kit';
import type { BuildKit } from './build-kit';

/**
 * The plant's amenities, built like the office (steel studs, painted
 * drywall, a dark cove base, a drywall lid) and to American practice of
 * the 1990s:
 *
 * - an amenity block beside the office: MEN and WOMEN restrooms behind
 *   closed doors, a janitor's closet (door open on its mop sink), and a
 *   first aid room (door open on its cot and cabinets), with a two-level
 *   drinking fountain and a time clock and card racks on the front wall,
 *   and the plumbing vent stack rising through the lid;
 * - a single drivers' toilet by the truck docks;
 * - a glazed security booth with its counter, CCTV monitors and log book;
 * - an emergency shower and eyewash station by the chemical store.
 *
 * Each is built in metres, floor at y = 0, centred on the origin, its
 * front facing +z, and returns its walls as footprints in its own frame.
 */

const H = 3.05;

/**
 * A door a click opens and shuts: its hinge (turned about y), its leaf
 * (what takes the click), how far it swings open (radians, outward), and
 * whether it is open now. The room animates it and blocks its opening
 * while it is shut.
 */
export interface OpenableDoor {
  hinge: Group;
  leaf: Mesh;
  openAngle: number;
  open: boolean;
  width: number;
}
const T = 0.12;

/** The partitions every room here is built with. */
function partitions(
  kit: BuildKit,
  group: Group,
  solids: Footprint[],
  doors: OpenableDoor[] = [],
) {
  const drywall = kit.paint('#e3dfd4', 0.85);
  const cove = kit.paint('#3b3a38', 0.6);
  return {
    drywall,
    /** A wall along x at z (or along z at x), with openings cut to `head`. */
    wall(
      alongX: boolean,
      at: number,
      from: number,
      to: number,
      openings: { at: number; width: number; head?: number }[] = [],
    ) {
      const piece = (a: number, b: number, y0: number, y1: number) => {
        if (b <= a || y1 <= y0) return;
        if (alongX)
          kit.box(
            group,
            drywall,
            b - a,
            y1 - y0,
            T,
            (a + b) / 2,
            (y0 + y1) / 2,
            at,
          );
        else
          kit.box(
            group,
            drywall,
            T,
            y1 - y0,
            b - a,
            at,
            (y0 + y1) / 2,
            (a + b) / 2,
          );
        if (y0 === 0) {
          if (alongX)
            kit.box(group, cove, b - a, 0.1, T + 0.012, (a + b) / 2, 0.05, at);
          else
            kit.box(group, cove, T + 0.012, 0.1, b - a, at, 0.05, (a + b) / 2);
        }
      };
      let a = from;
      for (const o of [...openings].sort((p, q) => p.at - q.at)) {
        piece(a, o.at - o.width / 2, 0, H);
        piece(o.at - o.width / 2, o.at + o.width / 2, o.head ?? 2.13, H);
        if (alongX)
          solids.push({
            minX: a - T,
            maxX: o.at - o.width / 2,
            minZ: at - T,
            maxZ: at + T,
          });
        else
          solids.push({
            minX: at - T,
            maxX: at + T,
            minZ: a - T,
            maxZ: o.at - o.width / 2,
          });
        a = o.at + o.width / 2;
      }
      piece(a, to, 0, H);
      if (alongX)
        solids.push({ minX: a, maxX: to + T, minZ: at - T, maxZ: at + T });
      else solids.push({ minX: at - T, maxX: at + T, minZ: a, maxZ: to + T });
    },
    /** A lid over the room, w by d, and a fascia. */
    lid(w: number, d: number) {
      kit.box(group, drywall, w + 0.02, 0.06, d + 0.02, 0, H + 0.03, 0);
      kit.box(
        group,
        kit.paint('#9ea2a3', 0.4, 0.7),
        w + 0.03,
        0.05,
        d + 0.03,
        0,
        H - 0.02,
        0,
      );
    },
    /** A door in a frame at (x, z) in a wall along x, open by `swing` radians. */
    door(x: number, z: number, leaf: Material, swing = 0, width = 0.92) {
      const frame = kit.paint('#4d4a45', 0.5, 0.4);
      for (const sx of [-1, 1])
        kit.box(
          group,
          frame,
          0.05,
          2.15,
          T + 0.04,
          x + sx * (width / 2 + 0.025),
          1.075,
          z,
        );
      kit.box(group, frame, width + 0.1, 0.05, T + 0.04, x, 2.155, z);
      const hinge = new Group();
      hinge.position.set(x - width / 2, 0, z + 0.05);
      hinge.rotation.y = -swing;
      group.add(hinge);
      const leafMesh = kit.box(
        hinge,
        leaf,
        width,
        2.12,
        0.045,
        width / 2,
        1.06,
        0,
      );
      kit.box(
        hinge,
        kit.paint('#b9bec0', 0.3, 0.85),
        0.03,
        0.14,
        0.06,
        width - 0.1,
        1.0,
        0.03,
      );
      kit.box(
        hinge,
        kit.paint('#b9bec0', 0.3, 0.85),
        width - 0.1,
        0.25,
        0.05,
        width / 2,
        0.15,
        0,
      );
      // A door a click opens and shuts: it swings out to `swing`, or 1.6 rad.
      const door: OpenableDoor = {
        hinge,
        leaf: leafMesh,
        openAngle: swing || 1.6,
        open: swing > 0,
        width,
      };
      doors.push(door);
      return hinge;
    },
    /** A suspended ceiling at 2.7 m over w × d, with a troffer per `pitch`. */
    ceiling(w: number, d: number, pitch = 2.4, cx = 0) {
      kit.box(
        group,
        kit.paint('#ece9e0', 0.9),
        w - 2 * T,
        0.02,
        d - 2 * T,
        cx,
        2.7,
        0,
      );
      const troffer = kit.glow(new Color(1.9, 1.95, 1.9));
      for (let x = -w / 2 + pitch / 2; x < w / 2; x += pitch)
        for (let z = -d / 2 + pitch / 2; z < d / 2; z += pitch)
          kit.box(group, troffer, 0.58, 0.01, 1.2, cx + x, 2.685, z);
    },
  };
}

/** The amenity block beside the office: restrooms, janitor's closet, first aid. */
export function createAmenityBlock() {
  const kit = createBuildKit();
  const group = new Group();
  group.name = 'Amenity block';
  const solids: Footprint[] = [];
  const openable: OpenableDoor[] = [];
  const p = partitions(kit, group, solids, openable);
  const w = 12;
  const d = 8;
  // Rooms from west to east: men 3.5 m, women 3.5 m, janitor 1.5 m, first aid 3.5 m.
  const edges = [-w / 2, -w / 2 + 3.5, -w / 2 + 7, -w / 2 + 8.5, w / 2];
  const mid = (i: number) => (edges[i] + edges[i + 1]) / 2;
  const doors = [mid(0), mid(1), mid(2), mid(3)];
  p.wall(true, -d / 2, -w / 2, w / 2);
  p.wall(false, -w / 2, -d / 2, d / 2);
  p.wall(false, w / 2, -d / 2, d / 2);
  p.wall(
    true,
    d / 2,
    -w / 2,
    w / 2,
    doors.map((at) => ({ at, width: 0.92 })),
  );
  for (const x of edges.slice(1, -1)) p.wall(false, x, -d / 2, d / 2);
  p.lid(w, d);
  // The doors: restrooms shut, the janitor's closet and first aid open;
  // a click opens or shuts any of them.
  const leaf = kit.paint('#7d8c96', 0.5, 0.3);
  p.door(doors[0], d / 2, leaf);
  p.door(doors[1], d / 2, leaf);
  restroom(kit, group, edges[0], edges[1], d, 'men');
  restroom(kit, group, edges[1], edges[2], d, 'women');
  p.door(doors[2], d / 2, kit.paint('#8a8f87', 0.5, 0.3), 1.5);
  p.door(doors[3], d / 2, kit.paint('#e8e6df', 0.5, 0.2), 1.6);
  const signs: [
    string,
    string,
    string,
    'man' | 'woman' | 'cross' | undefined,
  ][] = [
    ['MEN', '#ffffff', '#1d4f9e', 'man'],
    ['WOMEN', '#ffffff', '#1d4f9e', 'woman'],
    ['JANITOR', '#1b1b1b', '#d8d4c6', undefined],
    ['FIRST AID', '#ffffff', '#1f7a3a', 'cross'],
  ];
  signs.forEach(([text, ink, plate, symbol], i) => {
    const s = kit.sign(text, 0.6, 0.2, ink, plate, symbol);
    s.position.set(doors[i] + 0.8, 1.6, d / 2 + T / 2 + 0.01);
    group.add(s);
  });
  // A two-level drinking fountain between the restroom doors.
  const steel = kit.paint('#b9bec0', 0.3, 0.85);
  const fx = edges[1];
  kit.box(group, steel, 0.45, 0.25, 0.4, fx - 0.3, 0.95, d / 2 + 0.26);
  kit.box(group, steel, 0.45, 0.25, 0.4, fx + 0.3, 0.75, d / 2 + 0.26);
  // The time clock and its card racks, on the block's east end wall,
  // facing the walkway from the nave.
  const ex = w / 2 + T / 2;
  kit.box(
    group,
    kit.paint('#c9c1a9', 0.5, 0.2),
    0.2,
    0.45,
    0.35,
    ex + 0.1,
    1.4,
    0,
  );
  kit.box(
    group,
    kit.glow(new Color(0.9, 0.2, 0.1)),
    0.01,
    0.06,
    0.18,
    ex + 0.205,
    1.52,
    0,
  );
  for (const sz of [-1, 1]) {
    kit.box(
      group,
      kit.paint('#8f9493', 0.5, 0.5),
      0.06,
      1.1,
      0.5,
      ex + 0.03,
      1.35,
      sz * 0.6,
    );
    for (let k = 0; k < 10; k++)
      kit.box(
        group,
        kit.paint('#f0ead6', 0.9),
        0.02,
        0.18,
        0.08,
        ex + 0.07,
        1.1 + Math.floor(k / 5) * 0.45,
        sz * 0.6 - 0.2 + (k % 5) * 0.1,
      );
  }
  const clockIn = kit.sign(
    'CLOCK IN · CLOCK OUT',
    1.4,
    0.16,
    '#1b1b1b',
    '#e8e2cc',
  );
  clockIn.position.set(ex + 0.01, 2.05, 0);
  clockIn.rotation.y = Math.PI / 2;
  group.add(clockIn);
  // The janitor's closet: a floor mop sink, a shelf of supplies, a hose.
  const jx = mid(2);
  kit.box(
    group,
    kit.paint('#d9d6cc', 0.4),
    0.6,
    0.3,
    0.6,
    jx,
    0.15,
    -d / 2 + 0.5,
  );
  kit.box(
    group,
    kit.paint('#6b6e70', 0.5, 0.4),
    1.2,
    0.03,
    0.35,
    jx,
    1.4,
    -d / 2 + 0.25,
  );
  for (let k = 0; k < 4; k++)
    kit.cyl(
      group,
      kit.paint(['#2b6fb3', '#e1a915', '#c8261c', '#f2f0ea'][k], 0.5),
      0.07,
      0.28,
      jx - 0.4 + k * 0.26,
      1.56,
      -d / 2 + 0.25,
    );
  // The first aid room: white walls inside, a cot, the cabinet with its
  // cross, a sink, a stretcher on the wall and a kit on the counter.
  const ax = mid(3);
  p.ceiling(3.5, d, 2.4, ax);
  kit.box(
    group,
    kit.paint('#d9dcd6', 0.4),
    3.5 - 2 * T,
    0.01,
    d - 2 * T,
    ax,
    0.005,
    0,
  );
  const white = kit.paint('#f4f3ef', 0.5);
  kit.box(group, white, 3.3, 2.6, 0.02, ax, 1.4, -d / 2 + 0.08);
  kit.box(
    group,
    kit.paint('#b9bec0', 0.4, 0.8),
    0.7,
    0.05,
    1.9,
    ax + 1.0,
    0.65,
    -0.8,
  );
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      kit.box(
        group,
        kit.paint('#b9bec0', 0.4, 0.8),
        0.03,
        0.62,
        0.03,
        ax + 1.0 + sx * 0.3,
        0.31,
        -0.8 + sz * 0.9,
      );
  kit.box(
    group,
    kit.paint('#7fa9c9', 0.8),
    0.68,
    0.08,
    1.85,
    ax + 1.0,
    0.71,
    -0.8,
  );
  kit.box(group, white, 1.0, 1.2, 0.35, ax - 0.7, 1.6, -d / 2 + 0.3);
  const cross = kit.sign('', 0.3, 0.3, '#ffffff', '#1f7a3a', 'cross');
  cross.position.set(ax - 0.7, 1.75, -d / 2 + 0.48);
  group.add(cross);
  kit.box(group, white, 1.2, 0.9, 0.6, ax - 0.9, 0.45, -d / 2 + 0.4);
  kit.box(group, steel, 0.4, 0.05, 0.35, ax - 1.1, 0.92, -d / 2 + 0.4);
  kit.box(
    group,
    kit.paint('#c8261c', 0.5),
    0.35,
    0.22,
    0.15,
    ax - 0.5,
    1.01,
    -d / 2 + 0.4,
  );
  kit.box(
    group,
    kit.paint('#e1a915', 0.6),
    0.5,
    1.9,
    0.08,
    ax + 1.6,
    1.2,
    -d / 2 + 0.6,
  );
  // The plumbing vent stack, up through the lid toward the slab above.
  kit.cyl(
    group,
    kit.paint('#2b2b2b', 0.5, 0.4),
    0.06,
    6.5,
    mid(0) + 1,
    H + 3.25,
    -d / 2 + 0.5,
  );
  return {
    group,
    solids,
    size: { w, d },
    doors: openable,
    dispose: kit.dispose,
  };
}

/** A single drivers' toilet, 2.4 m square, door shut, by the truck docks. */
export function createDriversToilet() {
  const kit = createBuildKit();
  const group = new Group();
  group.name = "Drivers' toilet";
  const solids: Footprint[] = [];
  const openable: OpenableDoor[] = [];
  const p = partitions(kit, group, solids, openable);
  const s = 2.4;
  p.wall(true, -s / 2, -s / 2, s / 2);
  p.wall(false, -s / 2, -s / 2, s / 2);
  p.wall(false, s / 2, -s / 2, s / 2);
  p.wall(true, s / 2, -s / 2, s / 2, [{ at: 0, width: 0.92 }]);
  p.lid(s, s);
  p.door(0, s / 2, kit.paint('#7d8c96', 0.5, 0.3));
  restroom(kit, group, -s / 2, s / 2, s, 'single');
  const sign = kit.sign('DRIVERS\nRESTROOM', 0.6, 0.3, '#ffffff', '#1d4f9e');
  sign.position.set(0.85, 1.6, s / 2 + T / 2 + 0.01);
  group.add(sign);
  kit.cyl(
    group,
    kit.paint('#2b2b2b', 0.5, 0.4),
    0.05,
    6.5,
    0.6,
    H + 3.25,
    -0.6,
  );
  return { group, solids, doors: openable, dispose: kit.dispose };
}

/**
 * A restroom's fittings between x0 and x1, in a room `d` deep whose door
 * is in the front wall (+z): a tiled floor and wainscot, a suspended
 * ceiling with a troffer, and for `men` two stalls (one accessible) and
 * two urinals with a privacy screen, for `women` two stalls (one
 * accessible), for `single` one toilet with grab bars; and in each, wall
 * sinks under a mirror, a paper towel dispenser and a waste bin.
 */
function restroom(
  kit: BuildKit,
  group: Group,
  x0: number,
  x1: number,
  d: number,
  kind: 'men' | 'women' | 'single',
) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const back = -d / 2 + T / 2;
  const tile = kit.paint('#d9dee0', 0.25);
  const floorTile = kit.paint('#8f9a9e', 0.3);
  const china = kit.paint('#f4f4f0', 0.15);
  const steel = kit.paint('#b9bec0', 0.3, 0.85);
  const partition = kit.paint('#7d8c96', 0.4, 0.3);
  const mirror = kit.paint('#dfe6e8', 0.12, 0.55);
  // Floor tile and a wainscot of wall tile, 1.2 m high, round the room.
  kit.box(group, floorTile, w - 2 * T, 0.01, d - 2 * T, cx, 0.006, 0);
  for (const x of [x0 + T / 2 + 0.006, x1 - T / 2 - 0.006])
    kit.box(group, tile, 0.01, 1.2, d - 2 * T, x, 0.6, 0);
  kit.box(group, tile, w - 2 * T, 1.2, 0.01, cx, 0.6, back + 0.006);
  // The ceiling and a troffer.
  kit.box(
    group,
    kit.paint('#ece9e0', 0.9),
    w - 2 * T,
    0.02,
    d - 2 * T,
    cx,
    2.6,
    0,
  );
  kit.box(
    group,
    kit.glow(new Color(1.9, 1.95, 1.9)),
    0.58,
    0.01,
    1.2,
    cx,
    2.585,
    -d / 4,
  );
  kit.box(
    group,
    kit.glow(new Color(1.9, 1.95, 1.9)),
    0.58,
    0.01,
    1.2,
    cx,
    2.585,
    d / 4 - 0.4,
  );
  /** A toilet against the back wall at x. */
  const toilet = (x: number, z = back) => {
    kit.box(group, china, 0.38, 0.4, 0.2, x, 0.6, z + 0.1);
    kit.cyl(group, china, 0.19, 0.38, x, 0.2, z + 0.42, 0.21);
    kit.box(
      group,
      kit.paint('#2b2b2b', 0.5),
      0.38,
      0.03,
      0.45,
      x,
      0.405,
      z + 0.42,
    );
    kit.box(group, steel, 0.03, 0.03, 0.15, x + 0.12, 0.85, z + 0.12);
  };
  /** A stall, `width` wide, its partitions and door, from x along the back. */
  const stall = (x: number, width: number) => {
    const depth = 1.5;
    for (const px of [x, x + width])
      kit.box(group, partition, 0.025, 1.6, depth, px, 0.98, back + depth / 2);
    kit.box(
      group,
      partition,
      width - 0.06,
      1.6,
      0.025,
      x + width / 2 + 0.2,
      0.98,
      back + depth,
    );
    toilet(x + width / 2);
    kit.box(
      group,
      kit.paint('#c9c6bb', 0.5),
      0.15,
      0.15,
      0.12,
      x + width - 0.12,
      0.75,
      back + 0.6,
    );
  };
  /** Wall sinks along a side wall at `x`, facing into the room, under a mirror. */
  const sinks = (x: number, facing: 1 | -1, count: number, z0: number) => {
    for (let i = 0; i < count; i++) {
      const z = z0 + i * 0.7;
      kit.box(group, china, 0.45, 0.18, 0.5, x + facing * 0.25, 0.8, z);
      kit.box(group, steel, 0.04, 0.12, 0.04, x + facing * 0.06, 0.95, z);
    }
    kit.box(
      group,
      mirror,
      0.01,
      0.9,
      count * 0.7,
      x + facing * 0.012,
      1.55,
      z0 + ((count - 1) * 0.7) / 2,
    );
    kit.box(
      group,
      steel,
      0.12,
      0.35,
      0.28,
      x + facing * 0.07,
      1.3,
      z0 + count * 0.7,
    );
    kit.cyl(
      group,
      kit.paint('#5a5f63', 0.6),
      0.16,
      0.6,
      x + facing * 0.25,
      0.3,
      z0 + count * 0.7 + 0.4,
      0.17,
    );
  };
  if (kind === 'single') {
    toilet(cx - 0.3);
    kit.box(group, steel, 0.8, 0.04, 0.04, cx - 0.3, 0.85, back + 0.05);
    kit.box(group, steel, 0.04, 0.04, 0.9, x0 + T / 2 + 0.05, 0.85, back + 0.6);
    sinks(x1 - T / 2, -1, 1, -0.7);
    return;
  }
  if (kind === 'men') {
    stall(x0 + T / 2, 1.5);
    for (let i = 0; i < 2; i++) {
      const ux = x0 + 1.95 + i * 0.6;
      kit.box(group, china, 0.36, 0.6, 0.3, ux, 1.0, back + 0.15);
      kit.box(group, steel, 0.03, 0.2, 0.03, ux, 1.45, back + 0.06);
    }
    kit.box(group, partition, 0.025, 1.2, 0.5, x0 + 2.25, 1.1, back + 0.3);
    sinks(x1 - T / 2, -1, 2, -0.5);
    return;
  }
  stall(x0 + T / 2, 1.5);
  stall(x0 + T / 2 + 1.5, 0.9);
  sinks(x1 - T / 2, -1, 2, -0.5);
}

/**
 * The security booth: a glazed guard house, 3.2 by 2.6 m, solid to the
 * sill and glass all round above it, a sliding service window at the
 * front with a counter, and inside a desk with a bank of CCTV monitors, a
 * phone, a log book, a key cabinet and a chair. Door at the back, open.
 */
export function createSecurityBooth() {
  const kit = createBuildKit();
  const group = new Group();
  group.name = 'Security booth';
  const solids: Footprint[] = [];
  const w = 3.2;
  const d = 2.6;
  const h = 2.8;
  const panel = kit.paint('#c9c6bb', 0.6, 0.3);
  const frame = kit.paint('#3a3127', 0.45, 0.5);
  const glass = kit.paint('#a9bcc2', 0.05, 0.3, {
    transparent: true,
    opacity: 0.18,
  });
  // Solid to 1.05 m all round, glass above to 2.5 m, a deep roof.
  const sides: [boolean, number, number][] = [
    [true, d / 2, w],
    [true, -d / 2, w],
    [false, w / 2, d],
    [false, -w / 2, d],
  ];
  for (const [alongX, at, len] of sides) {
    const place = (y: number, hh: number, m: Material, thick = 0.1) =>
      alongX
        ? kit.box(group, m, len, hh, thick, 0, y, at)
        : kit.box(group, m, thick, hh, len, at, y, 0);
    // The back wall leaves a doorway.
    if (!alongX || at > 0) place(0.525, 1.05, panel);
    place(1.78, 1.45, glass, 0.02);
    place(1.05, 0.06, frame, 0.14);
    place(2.5, 0.06, frame, 0.14);
    for (let t = -len / 2; t <= len / 2 + 0.01; t += len / 3) {
      if (alongX) kit.box(group, frame, 0.05, 1.45, 0.12, t, 1.78, at);
      else kit.box(group, frame, 0.12, 1.45, 0.05, at, 1.78, t);
    }
    solids.push(
      alongX
        ? { minX: -len / 2, maxX: len / 2, minZ: at - 0.1, maxZ: at + 0.1 }
        : { minX: at - 0.1, maxX: at + 0.1, minZ: -len / 2, maxZ: len / 2 },
    );
  }
  // The back wall's solid panel either side of its doorway.
  kit.box(group, panel, w / 2 - 0.5, 1.05, 0.1, -w / 4 - 0.25, 0.525, -d / 2);
  kit.box(group, panel, w / 2 - 0.5, 1.05, 0.1, w / 4 + 0.25, 0.525, -d / 2);
  kit.box(group, panel, w + 0.4, 0.3, d + 0.4, 0, h - 0.15, 0);
  kit.box(group, frame, w + 0.42, 0.06, d + 0.42, 0, h - 0.3, 0);
  // The counter under the service window, and the window slid open.
  kit.box(
    group,
    kit.paint('#7a6a54', 0.6),
    1.4,
    0.04,
    0.45,
    0,
    1.08,
    d / 2 + 0.1,
  );
  // Inside: the desk, the monitors, the phone, the log book, a chair.
  kit.box(
    group,
    kit.paint('#9a9a8e', 0.5, 0.4),
    w - 0.4,
    0.04,
    0.7,
    0,
    0.76,
    d / 2 - 0.45,
  );
  const screen = kit.glow(new Color(0.25, 0.32, 0.3));
  for (let i = 0; i < 4; i++) {
    const x = -0.9 + i * 0.6;
    kit.box(
      group,
      kit.paint('#2b2b2b', 0.6),
      0.42,
      0.36,
      0.38,
      x,
      0.97,
      d / 2 - 0.6,
    );
    kit.box(group, screen, 0.32, 0.25, 0.01, x, 0.98, d / 2 - 0.405);
  }
  kit.box(
    group,
    kit.paint('#1e1e1e', 0.6),
    0.2,
    0.06,
    0.2,
    1.2,
    0.81,
    d / 2 - 0.3,
  );
  kit.box(
    group,
    kit.paint('#24324f', 0.8),
    0.3,
    0.03,
    0.22,
    0.6,
    0.79,
    d / 2 - 0.25,
  );
  kit.box(group, kit.paint('#384656', 0.9), 0.48, 0.08, 0.46, 0, 0.48, 0.1);
  kit.box(group, kit.paint('#384656', 0.9), 0.44, 0.5, 0.07, 0, 0.8, -0.12);
  kit.box(
    group,
    kit.paint('#8f9493', 0.5, 0.5),
    0.5,
    0.6,
    0.12,
    -w / 2 + 0.4,
    1.5,
    -d / 2 + 0.12,
  );
  const sign = kit.sign(
    'SECURITY · ALL VISITORS\nMUST SIGN IN',
    1.8,
    0.32,
    '#ffffff',
    '#22324f',
  );
  sign.position.set(0, h - 0.15, d / 2 + 0.205);
  group.add(sign);
  return { group, solids, size: { w, d }, dispose: kit.dispose };
}

/**
 * An emergency shower and eyewash station: a green-painted pipe column on
 * a floor flange, a shower head on its arm at 2.2 m with a pull rod and
 * triangle handle, an eyewash bowl at waist height with its push flag,
 * and the green sign over it.
 */
export function createSafetyShower() {
  const kit = createBuildKit();
  const group = new Group();
  group.name = 'Emergency shower';
  const green = kit.paint('#2f8a4a', 0.5, 0.4);
  const yellow = kit.paint('#e1a915', 0.5, 0.3);
  kit.cyl(group, green, 0.15, 0.03, 0, 0.015, 0);
  kit.cyl(group, green, 0.03, 2.3, 0, 1.15, 0);
  kit.box(group, green, 0.6, 0.05, 0.05, 0.3, 2.28, 0);
  kit.cyl(group, yellow, 0.06, 0.08, 0.6, 2.2, 0, 0.13);
  kit.cyl(group, kit.paint('#b9bec0', 0.3, 0.8), 0.006, 0.8, 0.45, 1.85, 0);
  kit.box(
    group,
    kit.paint('#b9bec0', 0.3, 0.8),
    0.18,
    0.012,
    0.012,
    0.45,
    1.45,
    0,
  );
  kit.box(group, green, 0.3, 0.04, 0.04, 0.15, 1.0, 0);
  kit.cyl(group, yellow, 0.07, 0.12, 0.33, 1.02, 0, 0.14);
  kit.box(group, yellow, 0.12, 0.05, 0.01, 0.33, 0.94, 0.12);
  const sign = kit.sign(
    'EMERGENCY SHOWER\n& EYEWASH',
    0.7,
    0.4,
    '#ffffff',
    '#1f7a3a',
    'cross',
  );
  sign.position.set(0, 2.75, 0.04);
  group.add(sign);
  return {
    group,
    solids: [{ minX: -0.2, maxX: 0.75, minZ: -0.2, maxZ: 0.2 }] as Footprint[],
    dispose: kit.dispose,
  };
}
