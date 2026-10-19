import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { kitPaint, type PanelKit } from '../../core/views/eighties-controls';
import { mergeStatic } from '../../core/views/merge-static';

/** VX3's hardwood/steel workbench and blue vice, adapted as freestanding furniture. */
export const SPARES_BENCH = { length: 3.6, depth: 0.75, height: 0.9 } as const;

/** Metres; long edge along x, drawers and vice handle facing +z. */
export function createSparesWorkbench(kit: PanelKit) {
  const group = new Group();
  group.name = 'Spares workbench';
  const { length, depth, height } = SPARES_BENCH;
  const timber = kitPaint(kit, '#5a3f26');
  const edge = kitPaint(kit, '#3f2c1b');
  const steel = kitPaint(kit, '#3c453e', 0.3);
  const drawers = kitPaint(kit, '#55665f', 0.3);
  const blue = kitPaint(kit, '#2f5f8a', 0.35);
  const chrome = kitPaint(kit, '#c8ccc8', 0.8);
  const add = (
    shape: BufferGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(shape, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    material: Material,
    x: number,
    y: number,
    z: number,
  ) => add(new BoxGeometry(w, h, d), material, x, y, z);
  const deck = box(length, 0.05, depth, timber, 0, height - 0.025, 0);
  deck.name = 'Spares workbench hardwood top';
  deck.userData.boardSupport = true;
  box(length, 0.07, 0.03, edge, 0, height - 0.036, depth / 2 + 0.016);
  for (const x of [-length / 2 + 0.07, 0, length / 2 - 0.07])
    for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
      box(0.05, 0.85, 0.05, steel, x, 0.425, z);
      box(0.075, 0.012, 0.075, steel, x, 0.006, z);
    }
  box(length - 0.1, 0.03, depth - 0.1, steel, 0, 0.18, 0);
  for (const z of [-depth / 2 + 0.04, depth / 2 - 0.04])
    box(length - 0.1, 0.07, 0.04, steel, 0, 0.81, z);
  box(0.6, 0.63, depth - 0.08, drawers, -length / 2 + 0.38, 0.52, 0);
  for (let i = 0; i < 3; i++) {
    const y = 0.73 - i * 0.2;
    box(0.56, 0.18, 0.02, drawers, -length / 2 + 0.38, y, depth / 2 - 0.025);
    box(0.16, 0.025, 0.03, chrome, -length / 2 + 0.38, y + 0.03, depth / 2);
  }
  // The same blue bench vice at the end, with steel jaws, screw and sliding tommy bar.
  const vice = new Group();
  vice.name = 'Blue bench vice';
  const vx = -length / 2 + 0.25;
  const base = add(
    new CylinderGeometry(0.095, 0.11, 0.025, 16),
    blue,
    vx,
    height + 0.0125,
    0.23,
  );
  vice.attach(base);
  for (const z of [0.22, 0.34]) {
    const body = box(0.18, 0.1, 0.05, blue, vx, height + 0.08, z);
    vice.attach(body);
    const jaw = box(
      0.18,
      0.025,
      0.012,
      chrome,
      vx,
      height + 0.13,
      z + (z < 0.3 ? 0.025 : -0.025),
    );
    vice.attach(jaw);
  }
  const screw = add(
    new CylinderGeometry(0.012, 0.012, 0.22, 10),
    chrome,
    vx,
    height + 0.055,
    0.38,
  );
  screw.rotation.x = Math.PI / 2;
  vice.attach(screw);
  const bar = add(
    new CylinderGeometry(0.008, 0.008, 0.2, 8),
    chrome,
    vx,
    height + 0.055,
    0.49,
  );
  bar.rotation.z = Math.PI / 2;
  vice.attach(bar);
  for (const x of [-0.105, 0.105])
    vice.attach(
      add(
        new SphereGeometry(0.012, 8, 6),
        chrome,
        vx + x,
        height + 0.055,
        0.49,
      ),
    );
  group.add(vice);
  mergeStatic(group, 3, new Set([deck]));
  return { group, deck };
}
