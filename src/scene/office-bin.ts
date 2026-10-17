import { BoxGeometry, Group, Mesh } from 'three';
import type { BinShape } from '../game/bin-toss';
import type { PanelKit } from './eighties-controls';
import { createMicroLabel, kitPaint } from './eighties-controls';

/**
 * A large office waste-paper bin, the open-topped kind an office that
 * deals with a lot of paper keeps by the copier: copied from Rubbermaid's
 * Slim Jim 23-gallon (87 litre) container, 559 × 284 mm at the rim and
 * 762 mm tall, tapering to its base, in recycling blue with vertical
 * venting channels, under a maker's name of our own. Its origin is the
 * middle of its base; it is in metres.
 */
const TOP = { x: 0.559, z: 0.284 };
const BASE = { x: 0.5, z: 0.24 };
const HEIGHT = 0.762;
const WALL = 0.006;

/** The inside of the bin, for `binRest`. */
export const OFFICE_BIN_SHAPE: BinShape = {
  halfX: BASE.x / 2 - WALL - 0.02,
  halfZ: BASE.z / 2 - WALL - 0.02,
  floor: 0.03,
  rim: HEIGHT,
  layer: 0.034,
  heap: 0.12,
};

export function createOfficeBin(kit: PanelKit) {
  const group = new Group();
  group.name = 'Office waste-paper bin';
  const blue = kitPaint(kit, '#2d5f9c');
  const dark = kitPaint(kit, '#1d406b');
  const add = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = blue,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // The base.
  add(BASE.x, 0.012, BASE.z, 0, 0.006, 0);
  // The four walls, each leaning out to the rim.
  const lean = (bottom: number, top: number) =>
    Math.atan((top - bottom) / 2 / HEIGHT);
  const long = lean(BASE.z, TOP.z);
  const end = lean(BASE.x, TOP.x);
  for (const side of [-1, 1]) {
    const wall = add(
      (BASE.x + TOP.x) / 2,
      HEIGHT,
      WALL,
      0,
      HEIGHT / 2,
      (side * (BASE.z + TOP.z)) / 4,
    );
    wall.rotation.x = side * long;
    const cap = add(
      WALL,
      HEIGHT,
      (BASE.z + TOP.z) / 2,
      (side * (BASE.x + TOP.x)) / 4,
      HEIGHT / 2,
      0,
    );
    cap.rotation.z = -side * end;
    // Venting channels moulded into the long sides.
    for (const x of [-0.17, 0, 0.17]) {
      const channel = add(
        0.03,
        HEIGHT - 0.12,
        0.004,
        x,
        HEIGHT / 2 - 0.02,
        side * ((BASE.z + TOP.z) / 4 + WALL),
        dark,
      );
      channel.rotation.x = side * long;
    }
    // The rolled rim, and a hand-hold under it at each end.
    add(TOP.x + 0.016, 0.022, 0.018, 0, HEIGHT - 0.011, (side * TOP.z) / 2);
    add(0.018, 0.022, TOP.z + 0.016, (side * TOP.x) / 2, HEIGHT - 0.011, 0);
    add(0.006, 0.03, 0.11, side * (TOP.x / 2 + 0.002), HEIGHT - 0.06, 0, dark);
  }
  // What goes in it.
  for (const side of [-1, 1]) {
    const label = createMicroLabel(kit, 'PAPER ONLY', {
      height: 0.03,
      ink: '#ffffff',
    });
    // On the wall's face, which leans out as it rises.
    const at = (y: number) =>
      side * (BASE.z / 2 + ((TOP.z - BASE.z) / 2) * (y / HEIGHT) + WALL);
    label.position.set(0, HEIGHT * 0.62, at(HEIGHT * 0.62));
    label.rotation.x = side * long;
    if (side < 0) label.rotation.y = Math.PI;
    group.add(label);
    const maker = createMicroLabel(kit, 'STOWMASTER 87 L', {
      height: 0.008,
      ink: '#d8e4f2',
    });
    maker.position.set(0, 0.09, at(0.09));
    if (side < 0) maker.rotation.y = Math.PI;
    group.add(maker);
  }
  return { group, shape: OFFICE_BIN_SHAPE, footprint: TOP };
}
