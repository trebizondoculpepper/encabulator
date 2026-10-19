import { Group, Mesh, SphereGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/**
 * A building's cleaning kit, left about its corridors: placeholders at true
 * size after common UK products, to be improved later. Each stands on the
 * floor at y = 0, facing +z; they only draw, and are merged with the room.
 */

/**
 * A yellow mop bucket with its wringer and a mop standing in it, after a
 * 20 litre janitorial mop bucket on castors (about 480 × 330 mm, 470 mm to
 * the wringer's top).
 */
export function createMopBucket(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const yellow = t.paint('#e3b51b', 0.5);
  const grey = t.paint('#4b4f50', 0.6);
  t.box(group, yellow, 0.48, 0.3, 0.33, 0, 0.21, 0);
  for (const x of [-0.2, 0.2])
    for (const z of [-0.13, 0.13]) t.cyl(group, grey, 0.025, 0.05, x, 0.03, z);
  // The wringer on one end, and the mop's handle leaning in it.
  t.box(group, grey, 0.16, 0.12, 0.3, 0.14, 0.42, 0);
  const handle = t.cyl(
    group,
    t.paint('#3e6fb2', 0.4),
    0.012,
    1.35,
    -0.08,
    0.95,
    0,
  );
  handle.rotation.z = 0.18;
  return group;
}

/**
 * A rotary floor machine parked against a wall, after a 17 inch (430 mm)
 * single-disc scrubber: a round deck and motor housing, a long handle up
 * to grips at waist height, its cable coiled on the handle.
 */
export function createRotaryScrubber(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#b5352b', 0.45);
  const black = t.paint('#202224', 0.6);
  t.cyl(group, black, 0.22, 0.08, 0, 0.06, 0, 'y', 28);
  t.cyl(group, red, 0.17, 0.26, 0, 0.23, 0, 'y', 24);
  const handle = new Group();
  handle.position.set(0, 0.32, -0.1);
  handle.rotation.x = -0.55;
  group.add(handle);
  t.box(handle, t.paint('#9aa0a2', 0.35, 0.7), 0.04, 1.1, 0.04, 0, 0.55, 0);
  t.box(handle, black, 0.5, 0.05, 0.05, 0, 1.1, 0);
  t.cyl(handle, t.paint('#d06a2a', 0.5), 0.08, 0.1, 0, 0.6, 0.04, 'z', 14);
  return group;
}

/**
 * A wheeled bin trolley, after a 1100 litre four-wheeled steel eurobin:
 * about 1370 × 1070 mm and 1450 mm tall, a domed lid and push handles.
 */
export function createBinTrolley(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const galv = t.paint('#a6aca9', 0.45, 0.6);
  const grey = t.paint('#3c4143', 0.6);
  t.box(group, galv, 1.25, 1.05, 0.95, 0, 0.72, 0);
  const lid = new Mesh(
    new SphereGeometry(0.7, 16, 6, 0, Math.PI * 2, 0, Math.PI / 6),
    t.paint('#2f5f3f', 0.5),
  );
  lid.scale.set(0.9, 0.5, 0.7);
  lid.position.y = 1.05;
  group.add(lid);
  for (const x of [-0.5, 0.5])
    for (const z of [-0.36, 0.36])
      t.cyl(group, grey, 0.1, 0.06, x, 0.1, z, 'x');
  for (const x of [-0.66, 0.66]) t.box(group, galv, 0.04, 0.04, 0.8, x, 1.0, 0);
  return group;
}

/**
 * A cleaning store's open shelving, stacked: a four-shelf galvanised unit
 * (900 × 450 mm, 1800 mm tall) with cases of paper towels, bottles of
 * cleaner, toilet rolls and boxes of bin liners.
 */
export function createCleaningShelves(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const steel = t.paint('#9da3a3', 0.45, 0.6);
  for (const x of [-0.44, 0.44])
    for (const z of [-0.21, 0.21])
      t.box(group, steel, 0.03, 1.8, 0.03, x, 0.9, z);
  const goods = [
    t.paint('#e8e4d6', 0.7),
    t.paint('#2f7fc1', 0.4),
    t.paint('#d8443a', 0.4),
    t.paint('#c8a66b', 0.8),
    t.paint('#4bb062', 0.4),
  ];
  [0.12, 0.55, 0.98, 1.41].forEach((y, shelf) => {
    t.box(group, steel, 0.9, 0.02, 0.45, 0, y, 0);
    for (let i = 0; i < 4; i++) {
      const material = goods[(shelf * 2 + i) % goods.length];
      const w = 0.16 + ((shelf + i) % 3) * 0.04;
      const h = 0.18 + ((shelf * 3 + i) % 4) * 0.05;
      t.box(group, material, w, h, 0.3, -0.33 + i * 0.22, y + h / 2 + 0.01, 0);
    }
  });
  t.box(group, steel, 0.9, 0.02, 0.45, 0, 1.79, 0);
  return group;
}

/** A yellow A-frame wet floor sign, 620 mm tall. */
export function createWetFloorSign(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const yellow = t.paint('#f0c419', 0.45);
  for (const side of [-1, 1]) {
    const panel = t.box(group, yellow, 0.3, 0.6, 0.012, 0, 0.3, side * 0.09);
    panel.rotation.x = side * 0.28;
  }
  t.label(group, 'CAUTION\nWET FLOOR', 0, 0.38, 0.17, 0.028, '#1c1c1c');
  return group;
}
