import {
  BoxGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { brandById } from '../../core/logic/brands';
import type { BrandId } from '../../core/logic/brands';
import { drawBrandLogo } from '../../core/views/brand-logo';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * The furniture and equipment of an office reception fitted out in the
 * late 1990s and still in use: placeholders at true size, after real
 * products where one is named, otherwise to the usual sizes. Built in
 * metres, standing on y = 0.
 */

/** Pale beech laminate, a grey countertop, a dark plinth. */
export const RECEPTION_FINISHES = {
  beech: '#d2b088',
  counter: '#8d9192',
  plinth: '#3b3d3f',
  frame: '#2b2d30',
};

/**
 * A slab shaped as part of a ring, between radii `r0` and `r1`, from angle
 * `from` to `to` (radians, 0 along +z, turning towards +x), `thickness`
 * high, standing on y = 0, round the origin.
 */
function arcSlab(
  r0: number,
  r1: number,
  from: number,
  to: number,
  thickness: number,
  steps = 32,
) {
  const shape = new Shape();
  const at = (r: number, a: number): [number, number] => [
    r * Math.sin(a),
    r * Math.cos(a),
  ];
  shape.moveTo(...at(r1, from));
  for (let i = 1; i <= steps; i++)
    shape.lineTo(...at(r1, from + ((to - from) * i) / steps));
  for (let i = steps; i >= 0; i--)
    shape.lineTo(...at(r0, from + ((to - from) * i) / steps));
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  // The shape is drawn in x and y; lay it in x and z, extruded up.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, thickness, 0);
  return geometry;
}

/** A point on a ring of radius `r` at angle `a` (0 along +z, towards +x). */
export const onArc = (r: number, a: number) => ({
  x: r * Math.sin(a),
  z: r * Math.cos(a),
});

/**
 * A curved reception desk, bespoke joinery of the late 1990s: a front of
 * pale beech laminate 1,080 mm high on a recessed dark plinth, a grey
 * transaction counter 350 mm deep over it and a beech work surface at 720
 * mm behind, with a gable at each end and a drawer pedestal. It is part of
 * a ring of radius `radius` round the origin, from angle `from` to `to`
 * (radians, 0 along +z, turning towards +x), its visitors outside the
 * ring and its receptionist inside.
 */
export function createReceptionDesk(
  kit: PanelKit,
  { radius, from, to }: { radius: number; from: number; to: number },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'reception desk';
  const beech = t.paint(RECEPTION_FINISHES.beech, 0.55);
  const counter = t.paint(RECEPTION_FINISHES.counter, 0.4);
  const plinth = t.paint(RECEPTION_FINISHES.plinth, 0.7);
  const slab = (
    material: Material,
    r0: number,
    r1: number,
    h: number,
    y: number,
    a0 = from,
    a1 = to,
  ) => {
    const mesh = new Mesh(arcSlab(r0, r1, a0, a1, h), material);
    mesh.position.y = y;
    group.add(mesh);
    return mesh;
  };
  const r = radius;
  const depth = 0.85;
  slab(plinth, r - 0.1, r - 0.06, 0.1, 0);
  slab(beech, r - 0.025, r, 0.98, 0.1);
  slab(counter, r - 0.35, r + 0.03, 0.03, 1.08);
  // A darker edge band on the counter's front.
  slab(t.paint('#5f6365', 0.4), r + 0.03, r + 0.035, 0.03, 1.08);
  slab(beech, r - depth, r - 0.025, 0.025, 0.72);
  // Gables at each end, along the radius.
  for (const a of [from, to]) {
    const mid = onArc(r - depth / 2, a);
    const gable = t.box(group, beech, 0.025, 1.08, depth, mid.x, 0.54, mid.z);
    gable.rotation.y = a;
  }
  // A drawer pedestal under the work surface, near the open end.
  const pedestalAt = to - 0.18;
  const p = onArc(r - depth / 2 - 0.05, pedestalAt);
  const pedestal = new Group();
  pedestal.position.set(p.x, 0, p.z);
  pedestal.rotation.y = pedestalAt + Math.PI;
  group.add(pedestal);
  t.box(pedestal, beech, 0.42, 0.68, 0.6, 0, 0.36, 0);
  for (let i = 0; i < 3; i++) {
    t.box(
      pedestal,
      t.paint('#5f6365', 0.4),
      0.41,
      0.004,
      0.002,
      0,
      0.24 + i * 0.2,
      0.301,
    );
    t.box(
      pedestal,
      t.paint('#9fa3a4', 0.3, 0.7),
      0.12,
      0.012,
      0.02,
      0,
      0.18 + i * 0.2,
      0.31,
    );
  }
  // Modest wear: a scuffed band along the plinth where feet rest, at the
  // middle of the front.
  slab(
    t.paint('#2f3133', 0.85),
    r - 0.058,
    r - 0.055,
    0.06,
    0.005,
    (from + to) / 2 - 0.12,
    (from + to) / 2 + 0.12,
  );
  return { group, radius, from, to, depth };
}

/**
 * An upholstered reception armchair on a dark powder-coated steel tube
 * frame, of the kind contract furniture makers sold to every 1990s office
 * (seat 450 mm high, 560 mm wide). Facing +z.
 */
export function createReceptionChair(kit: PanelKit, fabric: string) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'reception chair';
  const steel = t.paint(RECEPTION_FINISHES.frame, 0.45, 0.6);
  const cloth = t.paint(fabric, 0.95);
  t.box(group, cloth, 0.5, 0.09, 0.48, 0, 0.44, 0.01);
  const back = t.box(group, cloth, 0.5, 0.44, 0.08, 0, 0.73, -0.23);
  back.rotation.x = -0.1;
  for (const x of [-0.27, 0.27]) {
    for (const z of [-0.24, 0.24])
      t.cyl(group, steel, 0.011, 0.4, x, 0.2, z, 'y', 10);
    // The arm: a tube from front leg to back, at 640 mm.
    t.cyl(group, steel, 0.011, 0.56, x, 0.64, 0, 'z', 10);
    t.cyl(group, steel, 0.011, 0.24, x, 0.52, 0.24, 'y', 10);
    t.cyl(group, steel, 0.011, 0.5, x, 0.65, -0.26, 'y', 10);
    // A rail under the seat.
    t.cyl(group, steel, 0.009, 0.48, x, 0.39, 0, 'z', 8);
    // Its floor glides.
    t.cyl(
      group,
      t.paint('#111111', 0.8),
      0.014,
      0.012,
      x,
      0.006,
      -0.24,
      'y',
      10,
    );
    t.cyl(
      group,
      t.paint('#111111', 0.8),
      0.014,
      0.012,
      x,
      0.006,
      0.24,
      'y',
      10,
    );
  }
  t.cyl(group, steel, 0.009, 0.54, 0, 0.39, -0.2, 'x', 8);
  return group;
}

/** A low beech table, 1,000 × 550 × 400 mm, on square legs. */
export function createLowTable(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'low table';
  const beech = t.paint(RECEPTION_FINISHES.beech, 0.5);
  t.box(group, beech, 1.0, 0.025, 0.55, 0, 0.3875, 0);
  t.box(group, t.paint('#c29f76', 0.55), 0.92, 0.05, 0.47, 0, 0.35, 0);
  for (const x of [-0.46, 0.46])
    for (const z of [-0.235, 0.235])
      t.box(group, beech, 0.04, 0.375, 0.04, x, 0.1875, z);
  return group;
}

/** A course brochure's cover, A4, in a brand's colours. */
function brochureCover(
  kit: PanelKit,
  brand: BrandId,
  title: string,
  tint: string,
) {
  const t = tools(kit);
  const b = brandById(brand);
  return t.printed(
    0.21,
    0.297,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = tint;
      c.fillRect(0, h * 0.3, w, h * 0.5);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.font = `bold ${w * 0.075}px ${SANS}`;
      title.split('\n').forEach((line, i) => {
        c.fillText(line, w * 0.08, h * 0.42 + i * w * 0.095);
      });
      c.save();
      c.translate(w * 0.06, h * 0.06);
      drawBrandLogo(c, b, w * 0.7, w * 0.175);
      c.restore();
      c.fillStyle = b.colours[0];
      c.font = `${w * 0.045}px ${SANS}`;
      c.fillText('Course guide 2026', w * 0.08, h * 0.9);
    },
    192,
  ).mesh;
}

/** The brochures in the rack, a brand's courses. */
export const BROCHURES: readonly [string, string][] = [
  ['Encabulation\nfundamentals', '#5b3f8c'],
  ['Safe isolation\nfor operators', '#2f6f7a'],
  ['Fault finding\non the MCC', '#7a4f2f'],
  ['Manual handling\nrefresher', '#3f5f8c'],
];

/**
 * A wall-mounted literature rack, after Deflecto's clear acrylic A4 wall
 * holders (four pockets, two by two, about 480 × 640 mm), holding a
 * brand's course brochures. Its back is at z = 0, its foot at y = 0.
 */
export function createBrochureRack(kit: PanelKit, brand: BrandId) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'brochure rack';
  const acrylic = t.paint('#dfe8ea', 0.05);
  acrylic.transparent = true;
  acrylic.opacity = 0.35;
  acrylic.depthWrite = false;
  t.box(group, acrylic, 0.5, 0.66, 0.004, 0, 0.33, 0.002);
  BROCHURES.forEach(([title, tint], i) => {
    const x = (i % 2 ? 1 : -1) * 0.12;
    const y = i < 2 ? 0.48 : 0.15;
    const cover = brochureCover(kit, brand, title, tint);
    cover.position.set(x, y, 0.02);
    cover.rotation.x = -0.12;
    group.add(cover);
    // The pocket's front, over the lower two thirds.
    t.box(group, acrylic, 0.23, 0.2, 0.003, x, y - 0.07, 0.04);
    t.box(group, acrylic, 0.23, 0.003, 0.04, x, y - 0.17, 0.02);
  });
  return group;
}

/** A visitor book, open: A4 hardback, ruled for each visitor. */
export function createVisitorBook(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'visitor book';
  t.box(group, t.paint('#24365a', 0.6), 0.44, 0.012, 0.31, 0, 0.006, 0);
  const pages = t.printed(
    0.42,
    0.297,
    (c, w, h) => {
      c.fillStyle = '#f6f3ea';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9d3c4';
      c.fillRect(w / 2 - 1, 0, 2, h);
      c.strokeStyle = '#9fb4c8';
      c.lineWidth = 1;
      for (let y = h * 0.14; y < h; y += h * 0.055) {
        c.beginPath();
        c.moveTo(4, y);
        c.lineTo(w - 4, y);
        c.stroke();
      }
      c.fillStyle = '#7a2a2a';
      c.font = `bold ${h * 0.03}px ${SANS}`;
      const heads = ['DATE', 'NAME', 'COMPANY', 'VISITING', 'IN', 'OUT'];
      heads.forEach((head, i) =>
        c.fillText(head, 6 + ((w - 12) * i) / heads.length, h * 0.1),
      );
      // A few entries in ink, this morning's.
      c.fillStyle = '#1d2a55';
      c.font = `italic ${h * 0.032}px ${SANS}`;
      const entries = [
        ['20/10', 'D. Parfitt', 'Voltara Ltd', 'Training', '08:42'],
        ['20/10', 'S. Okafor', 'Halden Foods', 'Training', '08:47'],
        ['20/10', 'J. Whitlock', 'Brennan Logistics', 'Training', '08:55'],
      ];
      entries.forEach((row, n) =>
        row.forEach((cell, i) =>
          c.fillText(
            cell,
            6 + ((w - 12) * i) / heads.length,
            h * (0.18 + n * 0.055),
          ),
        ),
      );
    },
    512,
  );
  pages.mesh.rotation.x = -Math.PI / 2;
  pages.mesh.position.y = 0.0125;
  group.add(pages.mesh);
  // A pen beside it.
  t.cyl(group, t.paint('#1a1a1a', 0.4), 0.004, 0.14, 0.24, 0.016, 0.02, 'x', 8);
  return group;
}

/** The day's course register on a clipboard. */
export function createCourseRegister(kit: PanelKit, brand: BrandId) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'course register';
  const b = brandById(brand);
  t.box(group, t.paint('#4a3426', 0.7), 0.23, 0.006, 0.32, 0, 0.003, 0);
  t.box(
    group,
    t.paint('#b8bbbc', 0.3, 0.8),
    0.12,
    0.012,
    0.03,
    0,
    0.012,
    -0.145,
  );
  const sheet = t.printed(
    0.21,
    0.297,
    (c, w, h) => {
      c.fillStyle = '#fbfbf7';
      c.fillRect(0, 0, w, h);
      c.save();
      c.translate(w * 0.06, h * 0.06);
      drawBrandLogo(c, b, w * 0.5, w * 0.12);
      c.restore();
      c.fillStyle = '#1b1b1b';
      c.font = `bold ${w * 0.05}px ${SANS}`;
      c.fillText('COURSE REGISTER', w * 0.06, h * 0.2);
      c.font = `${w * 0.035}px ${SANS}`;
      c.fillText(
        'Tuesday · Encabulation fundamentals · Room 1',
        w * 0.06,
        h * 0.25,
      );
      c.strokeStyle = '#9a9a9a';
      for (let i = 0; i < 12; i++) {
        const y = h * (0.3 + i * 0.05);
        c.strokeRect(w * 0.06, y, w * 0.88, h * 0.05);
        c.fillStyle = '#444444';
        c.fillText(String(i + 1), w * 0.08, y + h * 0.035);
      }
    },
    256,
  );
  sheet.mesh.rotation.x = -Math.PI / 2;
  sheet.mesh.position.set(0, 0.0065, 0.01);
  group.add(sheet.mesh);
  return group;
}

/**
 * A shallow black tray of visitor badges, 300 × 200 × 30 mm: clip-on
 * card holders printed VISITOR, laid in two rows.
 */
export function createBadgeTray(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'badge tray';
  const tray = t.paint('#1e1f21', 0.6);
  t.box(group, tray, 0.3, 0.004, 0.2, 0, 0.002, 0);
  for (const z of [-0.098, 0.098])
    t.box(group, tray, 0.3, 0.03, 0.004, 0, 0.015, z);
  for (const x of [-0.148, 0.148])
    t.box(group, tray, 0.004, 0.03, 0.2, x, 0.015, 0);
  const badge = t.printed(
    0.09,
    0.06,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c4231c';
      c.fillRect(0, 0, w, h * 0.35);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.24}px ${SANS}`;
      c.fillText('VISITOR', w / 2, h * 0.26);
      c.fillStyle = '#555555';
      c.font = `${h * 0.12}px ${SANS}`;
      c.fillText('Please wear at all times', w / 2, h * 0.7);
    },
    128,
  );
  for (let i = 0; i < 6; i++) {
    const card = badge.mesh.clone();
    card.rotation.x = -Math.PI / 2 + 0.05;
    card.position.set(
      -0.095 + (i % 3) * 0.095,
      0.008 + i * 0.0005,
      i < 3 ? -0.045 : 0.05,
    );
    group.add(card);
  }
  return group;
}

/**
 * A corded desk phone after Avaya's 9608 (about 190 × 200 mm, a sloping
 * body with a monochrome display and the handset on its left), its coiled
 * cord looping to the handset. Facing +z, its user in front.
 */
export function createDeskPhone(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'desk phone';
  const body = t.paint('#202224', 0.5);
  const base = t.box(group, body, 0.19, 0.05, 0.2, 0, 0.035, 0);
  base.rotation.x = 0.2;
  const handset = t.box(
    group,
    t.paint('#26282b', 0.45),
    0.055,
    0.035,
    0.21,
    -0.065,
    0.075,
    0.005,
  );
  handset.rotation.x = 0.2;
  const display = t.printed(
    0.08,
    0.04,
    (c, w, h) => {
      c.fillStyle = '#9fae9a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#26301f';
      c.font = `${h * 0.22}px ${SANS}`;
      c.fillText('09:02  RECEPTION', 4, h * 0.35);
      c.fillText('Ext 200', 4, h * 0.75);
    },
    96,
  );
  display.mesh.rotation.x = -Math.PI / 2 + 0.2;
  display.mesh.position.set(0.035, 0.07, -0.04);
  group.add(display.mesh);
  const keys = t.printed(
    0.09,
    0.08,
    (c, w, h) => {
      c.fillStyle = '#202224';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5a5d61';
      for (let i = 0; i < 12; i++)
        c.fillRect(
          w * (0.12 + (i % 3) * 0.28),
          h * (0.06 + Math.floor(i / 3) * 0.24),
          w * 0.2,
          h * 0.16,
        );
    },
    64,
  );
  keys.mesh.rotation.x = -Math.PI / 2 + 0.2;
  keys.mesh.position.set(0.035, 0.055, 0.045);
  group.add(keys.mesh);
  // The coiled cord, from the base's side to the handset's foot.
  const curve = new CatmullRomCurve3([
    new Vector3(-0.095, 0.03, 0.06),
    new Vector3(-0.14, 0.008, 0.1),
    new Vector3(-0.16, 0.006, 0.02),
    new Vector3(-0.12, 0.01, -0.06),
    new Vector3(-0.09, 0.05, -0.09),
  ]);
  group.add(
    new Mesh(new TubeGeometry(curve, 24, 0.004, 6), t.paint('#1b1c1d', 0.6)),
  );
  return group;
}

/**
 * A 17-inch 4:3 LCD monitor after Dell's 1707FP (2006), under Kessler-Moody's
 * name: a thick black bezel round a 337 × 270 mm picture, on a silver
 * stand; the old fit-out kept going with the newest thing on the desk. Facing +z, its foot at y
 * = 0. `screen` is the picture, to light.
 */
export function createDeskMonitor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'desk monitor';
  const black = t.paint('#1c1d1f', 0.45);
  const silver = t.paint('#a6a9ac', 0.35, 0.5);
  t.box(group, silver, 0.24, 0.015, 0.2, 0, 0.0075, 0);
  t.box(group, silver, 0.07, 0.24, 0.03, 0, 0.13, -0.06);
  const head = new Group();
  head.position.set(0, 0.29, -0.03);
  head.rotation.x = -0.08;
  group.add(head);
  t.box(head, black, 0.375, 0.315, 0.06, 0, 0, 0);
  const screen = t.printed(
    0.337,
    0.27,
    (c, w, h) => {
      c.fillStyle = '#2f5d8a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d4d0c8';
      c.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.7);
      c.fillStyle = '#0a246a';
      c.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.06);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.04}px ${SANS}`;
      c.fillText('Room bookings - Tuesday', w * 0.14, h * 0.16);
      c.fillStyle = '#1b1b1b';
      c.font = `${h * 0.035}px ${SANS}`;
      const rows = [
        'Training Room 1   09:30  Encabulation fundamentals',
        'Training Room 2   10:00  Safe isolation',
        'Warehouse         13:00  Practical session',
      ];
      rows.forEach((row, i) =>
        c.fillText(row, w * 0.15, h * (0.27 + i * 0.07)),
      );
      c.fillStyle = '#c0c0c0';
      c.fillRect(0, h * 0.94, w, h * 0.06);
    },
    384,
    true,
  );
  screen.mesh.position.z = 0.0305;
  head.add(screen.mesh);
  // Its maker's name, small, on the bezel.
  const maker = createBrandBadge(kit, 'kessler-moody', {
    form: 'wordmark',
    height: 0.008,
    ink: '#9b9ea2',
  });
  maker.position.set(0, -0.145, 0.0305);
  head.add(maker);
  t.led(head, '#5aa0ff', 0.003, 0.17, -0.145, 0.031).set(true);
  return { group, screen: screen.mesh as Object3D };
}

/** A keyboard and mouse, in the grey of the time. */
export function createKeyboard(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'keyboard';
  const grey = t.paint('#c9c5ba', 0.6);
  const board = t.box(group, grey, 0.45, 0.025, 0.16, 0, 0.0125, 0);
  board.rotation.x = 0.06;
  const keys = t.printed(
    0.43,
    0.13,
    (c, w, h) => {
      c.fillStyle = '#bcb8ad';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e4e0d6';
      for (let row = 0; row < 5; row++)
        for (let k = 0; k < 18; k++)
          c.fillRect(
            (k * w) / 18 + 1,
            (row * h) / 5 + 1,
            w / 18 - 2,
            h / 5 - 2,
          );
    },
    256,
  );
  keys.mesh.rotation.x = -Math.PI / 2 + 0.06;
  keys.mesh.position.y = 0.0265;
  group.add(keys.mesh);
  t.box(group, grey, 0.06, 0.03, 0.1, 0.3, 0.015, 0.02);
  return group;
}

/** A plain 300 mm office wall clock; `hands` turn, `face` stays. */
export function createWallClock(kit: PanelKit) {
  const { context: c, texture } = createCanvasTexture(256, 256);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(128, 128, 126, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#111111';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'bold 26px Arial, Helvetica, sans-serif';
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.fillText(String(i), 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
  }
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const faceMaterial = createPs1Material({ map: texture, transparent: true });
  const black = createPs1Material({ color: '#1b1c1d', roughness: 0.6 });
  const red = createPs1Material({ color: '#b4231d', roughness: 0.45 });
  kit.materials.push(faceMaterial, black, red);
  const face = new Group();
  const rim = new Mesh(new BoxGeometry(0.32, 0.32, 0.035), black);
  rim.position.z = 0.0175;
  face.add(rim);
  const dial = new Mesh(new PlaneGeometry(0.3, 0.3), faceMaterial);
  dial.position.z = 0.036;
  face.add(dial);
  const hands = new Group();
  hands.name = 'clock hands';
  const hand = (
    length: number,
    width: number,
    material: Material,
    z: number,
  ) => {
    const pivot = new Group();
    pivot.position.z = z;
    const arm = new Mesh(new BoxGeometry(width, length, 0.002), material);
    arm.position.y = length / 2 - 0.015;
    pivot.add(arm);
    hands.add(pivot);
    return pivot;
  };
  const hour = hand(0.08, 0.012, black, 0.04);
  const minute = hand(0.12, 0.008, black, 0.042);
  const second = hand(0.13, 0.003, red, 0.044);
  return {
    face,
    hands,
    set(now: Date) {
      const s = now.getSeconds();
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      second.rotation.z = -(s / 60) * Math.PI * 2;
      minute.rotation.z = -(m / 60) * Math.PI * 2;
      hour.rotation.z = -(h / 12) * Math.PI * 2;
    },
  };
}

/** Lay `object` on `parent` at (x, y, z), turned `yaw`. */
export function place(
  parent: Object3D,
  object: Object3D,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  object.position.set(x, y, z);
  object.rotation.y = yaw;
  parent.add(object);
  return object;
}
