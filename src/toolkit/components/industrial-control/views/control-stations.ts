import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/**
 * Small control stations: a single-hole control station on a post, the
 * steel mode panel, and the mobile floor stand the wandering button rides.
 */

/**
 * A rounded box: a rectangle with rounded corners, its edges softened,
 * `d` deep along z and centred on the origin.
 */
function roundedBox(w: number, h: number, d: number, r: number) {
  const shape = new Shape();
  const x = w / 2 - r;
  const y = h / 2 - r;
  shape.absarc(x, y, r, 0, Math.PI / 2, false);
  shape.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
  shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
  shape.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2, false);
  const edge = Math.min(r * 0.6, d / 4);
  const geometry = new ExtrudeGeometry(shape, {
    depth: d - edge * 2,
    bevelEnabled: true,
    bevelThickness: edge,
    bevelSize: edge,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -(d - edge * 2) / 2);
  return geometry;
}

/**
 * An empty control station after Schneider's XALD range: a light grey
 * polycarbonate body and a dark grey lid with four screws, 68 mm wide and
 * 53 mm deep, 68 mm high for one hole (XALD01) or 106 mm for two
 * (XALD02). Its back is at z = 0; `mounts` are where devices go on the
 * lid, top to bottom, facing +z. `chrome` plates it all.
 */
export function createControlStation(
  kit: PanelKit,
  holes: 1 | 2,
  { chrome = false } = {},
) {
  const t = tools(kit);
  const group = new Group();
  const w = 0.068;
  const h = holes === 1 ? 0.068 : 0.106;
  const body = new Mesh(
    roundedBox(w - 0.006, h - 0.006, 0.041, 0.006),
    chrome ? t.paint('#e3e6e8', 0.16, 1) : t.paint('#c8ccc9', 0.6),
  );
  body.position.z = 0.0205;
  group.add(body);
  const lid = new Mesh(
    roundedBox(w - 0.005, h - 0.005, 0.012, 0.005),
    chrome ? t.paint('#c9ced2', 0.12, 1) : t.paint('#4a4f52', 0.6),
  );
  lid.position.z = 0.047;
  group.add(lid);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      t.cyl(
        group,
        chrome ? t.paint('#f2f4f5', 0.1, 1) : t.paint('#2c2f31'),
        0.0028,
        0.0015,
        sx * 0.026,
        sy * (h / 2 - 0.008),
        0.0535,
        'z',
        12,
      );
  const mounts = Array.from({ length: holes }, (_, i) => {
    const mount = new Group();
    mount.position.set(0, holes === 1 ? 0.004 : 0.022 - i * 0.042, 0.053);
    group.add(mount);
    return mount;
  });
  return { group, mounts, height: h, width: w, body, lid };
}

/**
 * Wall control enclosure after PanelSeT CRN NSYCRN33200, 300 × 300 × 200 mm.
 * Devices mount at true size on the inset light-grey steel door.
 * https://www.se.com/sg/en/product/NSYCRN33200/
 */
export function createModePanel(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const steel = t.paint('#bfc2bd', 0.45, 0.25);
  t.box(group, steel, 0.3, 0.3, 0.192, 0, 0, 0.096);
  t.box(group, t.paint('#343936'), 0.288, 0.288, 0.003, 0, 0, 0.1935);
  t.box(
    group,
    t.paint('#d3d5cf', 0.45, 0.2),
    0.282,
    0.282,
    0.005,
    0,
    0,
    0.1975,
  );
  for (const y of [-0.095, 0.095])
    t.box(group, steel, 0.01, 0.035, 0.009, -0.144, y, 0.1955);
  t.cyl(
    group,
    t.paint('#5a5e5c', 0.35, 0.7),
    0.006,
    0.002,
    0.127,
    0,
    0.201,
    'z',
    16,
  );
  const face = new Group();
  face.position.z = 0.2;
  group.add(face);
  return { group, face };
}

/** Where a mobile stand's post bends, if it bends: metres above the floor. */
export const STAND_BEND_Y = 0.55;

/**
 * A mobile button stand: a weighted steel base on four swivel castors, a
 * galvanised post and a mounting plate carrying a one-hole control
 * station, its button about 1.05 m up. Its front faces +z. `roll` turns
 * the castors to the way it is moving and spins their wheels. Everything
 * from `STAND_BEND_Y` up is in `head`, pivoted there, so the post can be
 * bent (`src/toolkit/gallery/views/stand-condition.ts`); `chrome` plates it all, new.
 */
export function createMobileStand(kit: PanelKit, { chrome = false } = {}) {
  const t = tools(kit);
  const group = new Group();
  const galvanised = chrome
    ? t.paint('#eef1f3', 0.16, 1)
    : t.paint('#a4abae', 0.55, 0.5);
  const base = chrome
    ? t.paint('#d9dde0', 0.2, 1)
    : t.paint('#3a3f42', 0.6, 0.3);
  // The base: a heavy steel plate with turned-down edges, on its castors.
  const plate = t.box(group, base, 0.44, 0.03, 0.44, 0, 0.1, 0);
  const skirts = (
    [
      [0.44, 0.012, 0, 0.214],
      [0.44, 0.012, 0, -0.214],
      [0.012, 0.44, 0.214, 0],
      [0.012, 0.44, -0.214, 0],
    ] as const
  ).map(([w, d, x, z]) => t.box(group, base, w, 0.05, d, x, 0.09, z));
  const bright = chrome
    ? t.paint('#f0f2f3', 0.12, 1)
    : t.paint('#9ea4a6', 0.3, 0.8);
  const fork = chrome
    ? t.paint('#d6dadc', 0.18, 1)
    : t.paint('#6d7376', 0.4, 0.6);
  const castors = [
    [-0.17, -0.17],
    [0.17, -0.17],
    [-0.17, 0.17],
    [0.17, 0.17],
  ].map(([x, z]) => {
    const swivel = new Group();
    swivel.position.set(x, 0.085, z);
    group.add(swivel);
    t.cyl(swivel, bright, 0.02, 0.008, 0, -0.004, 0, 'y', 16);
    for (const side of [-1, 1])
      t.box(swivel, fork, 0.004, 0.05, 0.035, side * 0.014, -0.03, 0.01);
    const wheel = new Group();
    wheel.position.set(0, -0.06, 0.012);
    swivel.add(wheel);
    t.cyl(wheel, t.paint('#1c1d1e', 0.8), 0.025, 0.022, 0, 0, 0, 'x', 18);
    t.cyl(
      wheel,
      chrome ? t.paint('#f0f2f3', 0.1, 1) : t.paint('#b9bcbd', 0.4, 0.6),
      0.01,
      0.024,
      0,
      0,
      0,
      'x',
      10,
    );
    return { swivel, wheel };
  });
  // The post, in two lengths either side of where it would bend, its
  // collar, and the mounting plate on top, carried by the head.
  const b = STAND_BEND_Y;
  const lowerPost = t.cyl(
    group,
    galvanised,
    0.03,
    b - 0.115,
    0,
    (0.115 + b) / 2,
    0,
    'y',
    24,
  );
  t.cyl(group, base, 0.045, 0.02, 0, 0.125, 0, 'y', 24);
  const head = new Group();
  head.position.y = b;
  group.add(head);
  const upperPost = t.cyl(
    head,
    galvanised,
    0.03,
    1.035 - b,
    0,
    (1.035 - b) / 2,
    0,
    'y',
    24,
  );
  const mountingPlate = t.box(
    head,
    galvanised,
    0.1,
    0.1,
    0.006,
    0,
    1.035 - b,
    0.033,
  );
  const station = createControlStation(kit, 1, { chrome });
  station.group.position.set(0, 1.035 - b, 0.036);
  head.add(station.group);
  // Intentional low-voltage wiring: a black flexible lead leaves the box
  // through a small compression gland, loops gently and enters the hollow
  // post through a rubber grommet. Nominal 6 mm cable (LAPP H05VV5-F 3G0.75).
  const rubber = t.paint('#202223', 0.85);
  const gland = t.paint('#303335', 0.6);
  t.cyl(head, gland, 0.008, 0.006, 0, 0.999 - b, 0.062, 'y', 6);
  t.cyl(head, gland, 0.007, 0.01, 0, 0.991 - b, 0.062, 'y', 12);
  t.cyl(head, rubber, 0.0045, 0.005, 0, 0.984 - b, 0.062, 'y', 16);
  const lead = new CatmullRomCurve3([
    new Vector3(0, 0.983 - b, 0.062),
    new Vector3(0.026, 0.951 - b, 0.07),
    new Vector3(0.043, 0.905 - b, 0.065),
    new Vector3(0.025, 0.869 - b, 0.052),
    new Vector3(0, 0.86 - b, 0.026),
  ]);
  const cable = new Mesh(new TubeGeometry(lead, 32, 0.003, 8, false), rubber);
  cable.name = 'button box wiring lead';
  head.add(cable);
  const grommet = new Mesh(new TorusGeometry(0.005, 0.0018, 8, 20), rubber);
  grommet.name = 'pole cable entry grommet';
  grommet.position.set(0, 0.86 - b, 0.0305);
  head.add(grommet);
  const zinc = chrome
    ? t.paint('#f2f4f5', 0.1, 1)
    : t.paint('#b5b7b3', 0.35, 0.75);
  for (const x of [-0.041, 0.041])
    for (const y of [0.995, 1.075]) {
      t.cyl(head, zinc, 0.005, 0.001, x, y - b, 0.0365, 'z', 16);
      t.cyl(head, zinc, 0.0035, 0.003, x, y - b, 0.038, 'z', 6);
    }
  for (const x of [-0.035, 0.035])
    for (const z of [-0.035, 0.035]) {
      t.cyl(group, zinc, 0.006, 0.0015, x, 0.116, z, 'y', 16);
      t.cyl(group, zinc, 0.004, 0.004, x, 0.119, z, 'y', 6);
    }
  // Brushed chrome: a soft but strong reflection of the room's studio.
  if (chrome)
    group.traverse((o) => {
      const m = (o as Mesh).material as MeshStandardMaterial | undefined;
      if (m?.metalness === 1) {
        m.roughness = Math.max(m.roughness, 0.26);
        m.metalness = 0.85;
        m.envMapIntensity = 3;
      }
    });
  return {
    group,
    mount: station.mounts[0],
    /** Everything from the bend up, pivoted at the bend. */
    head,
    station,
    mountingPlate,
    lowerPost,
    upperPost,
    plate,
    skirts,
    cable,
    castors,
    /** Turn the castors to `direction` (radians, in the stand's frame) and roll them `distance` metres. */
    roll(direction: number, distance: number) {
      for (const { swivel, wheel } of castors) {
        if (distance > 1e-4) swivel.rotation.y = direction;
        wheel.rotation.x -= distance / 0.025;
      }
    },
  };
}
