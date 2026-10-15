import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';

/**
 * The ephemera of an American plant floor in the 1990s, to standard
 * sizes: GMA pallets (48 × 40 in), 55-gallon drums, 275-gallon IBC totes,
 * ISO shipping containers (20 and 40 ft), a counterbalance forklift, and
 * janitorial gear. Built in metres, standing on y = 0, facing +z. One
 * `createProps` makes them all and shares their materials.
 */

/** Standard sizes, metres. */
export const PALLET = { length: 1.219, width: 1.016, height: 0.144 };
export const DRUM = { diameter: 0.572, height: 0.851 };
export const IBC = { length: 1.2, width: 1.0, height: 1.16 };
export const CONTAINER = {
  width: 2.438,
  height: 2.591,
  short: 6.058,
  long: 12.192,
};

export function createProps() {
  const geometries: BufferGeometry[] = [];
  const materials = new Map<string, Material>();
  const textures: Texture[] = [];
  const paint = (
    color: string,
    roughness = 0.6,
    metalness = 0,
    extra: Partial<MeshStandardMaterial> = {},
  ) => {
    const key = `${color}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
    let material = materials.get(key);
    if (!material) {
      material = new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        ...extra,
      });
      materials.set(key, material);
    }
    return material;
  };
  const box = (
    parent: Group,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new BoxGeometry(w, h, d);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (
    parent: Group,
    material: Material,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    axis: 'x' | 'y' | 'z' = 'y',
    segments = 20,
    top = r,
    open = false,
  ) => {
    const geometry = new CylinderGeometry(top, r, h, segments, 1, open);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };
  const tiled = (
    draw: (c: CanvasRenderingContext2D, s: number) => void,
    rx: number,
    ry: number,
    size = 64,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(rx, ry);
    textures.push(t);
    return t;
  };
  const wood = paint('#b08a5a', 0.85);
  const cardboard = paint('#b9946a', 0.9);
  const black = paint('#1a1a1a', 0.8);
  const steel = paint('#7d8387', 0.4, 0.7);
  const galvanised = paint('#a8adb0', 0.45, 0.8);
  const yellow = paint('#e1a915', 0.45);

  /** A GMA pallet: three stringers and deck boards top and bottom. */
  const pallet = () => {
    const g = new Group();
    const { length, width, height } = PALLET;
    for (const z of [-width / 2 + 0.02, 0, width / 2 - 0.02])
      box(g, wood, length, 0.089, 0.038, 0, 0.0445 + 0.016, z);
    for (let i = 0; i < 7; i++)
      box(
        g,
        wood,
        0.14,
        0.016,
        width,
        -length / 2 + 0.07 + (i * (length - 0.14)) / 6,
        height - 0.008,
        0,
      );
    for (let i = 0; i < 3; i++)
      box(
        g,
        wood,
        0.14,
        0.016,
        width,
        -length / 2 + 0.07 + (i * (length - 0.14)) / 2,
        0.008,
        0,
      );
    return g;
  };

  return {
    pallet,
    /** A pallet of cartons, shrink-wrapped, `layers` high. */
    cartons(layers = 4, seed = 1) {
      const g = pallet();
      let a = seed * 7919;
      const random = () => (a = (a * 16807) % 2147483647) / 2147483647;
      const cw = PALLET.length / 3;
      const cd = PALLET.width / 2;
      const ch = 0.3;
      for (let l = 0; l < layers; l++)
        for (let i = 0; i < 3; i++)
          for (let k = 0; k < 2; k++) {
            if (l === layers - 1 && random() < 0.25) continue;
            const carton = box(
              g,
              cardboard,
              cw - 0.01,
              ch - 0.005,
              cd - 0.01,
              -PALLET.length / 2 + cw * (i + 0.5),
              PALLET.height + ch * (l + 0.5),
              -PALLET.width / 2 + cd * (k + 0.5),
            );
            carton.rotation.y = (random() - 0.5) * 0.03;
          }
      const wrap = paint('#dfe6ea', 0.15, 0, {
        transparent: true,
        opacity: 0.25,
        side: DoubleSide,
      } as Partial<MeshStandardMaterial>);
      box(
        g,
        wrap,
        PALLET.length + 0.01,
        ch * (layers - 0.5),
        PALLET.width + 0.01,
        0,
        PALLET.height + (ch * (layers - 0.5)) / 2,
        0,
      );
      return g;
    },
    /** A 55-gallon steel drum, in `colour`, with its rolling hoops and bungs. */
    drum(colour = '#1f4f8f') {
      const g = new Group();
      const r = DRUM.diameter / 2;
      const body = paint(colour, 0.5, 0.3);
      cylinder(g, body, r, DRUM.height, 0, DRUM.height / 2, 0);
      for (const y of [DRUM.height / 3, (DRUM.height * 2) / 3])
        cylinder(g, body, r + 0.008, 0.02, 0, y, 0);
      for (const y of [0.01, DRUM.height - 0.01])
        cylinder(g, body, r + 0.006, 0.02, 0, y, 0);
      cylinder(
        g,
        steel,
        0.025,
        0.012,
        r * 0.55,
        DRUM.height + 0.006,
        0,
        'y',
        8,
      );
      cylinder(
        g,
        steel,
        0.015,
        0.012,
        -r * 0.55,
        DRUM.height + 0.006,
        0,
        'y',
        8,
      );
      return g;
    },
    /** Four drums on a pallet. */
    drumPallet(colour = '#1f4f8f') {
      const g = pallet();
      for (const x of [-0.3, 0.3])
        for (const z of [-0.25, 0.25]) {
          const d = this.drum(colour);
          d.position.set(x, PALLET.height, z);
          g.add(d);
        }
      return g;
    },
    /** A 275-gallon IBC tote: a white tank in a galvanised cage on a pallet base. */
    ibc(fill = 0.7) {
      const g = new Group();
      const { length, width, height } = IBC;
      box(g, steel, length, 0.14, width, 0, 0.07, 0);
      const tank = paint('#eef0e8', 0.35, 0, {
        transparent: true,
        opacity: 0.85,
      } as Partial<MeshStandardMaterial>);
      box(
        g,
        tank,
        length - 0.06,
        height - 0.2,
        width - 0.06,
        0,
        0.14 + (height - 0.2) / 2,
        0,
      );
      // The liquid inside, seen through the tank.
      box(
        g,
        paint('#3a5a2a', 0.3),
        length - 0.1,
        (height - 0.24) * fill,
        width - 0.1,
        0,
        0.16 + ((height - 0.24) * fill) / 2,
        0,
      );
      // The cage: tubes round and across.
      for (let i = 0; i <= 6; i++) {
        const x = -length / 2 + (i * length) / 6;
        for (const z of [-width / 2, width / 2])
          box(
            g,
            galvanised,
            0.022,
            height - 0.14,
            0.022,
            x,
            0.14 + (height - 0.14) / 2,
            z,
          );
      }
      for (let i = 0; i <= 5; i++) {
        const z = -width / 2 + (i * width) / 5;
        for (const x of [-length / 2, length / 2])
          box(
            g,
            galvanised,
            0.022,
            height - 0.14,
            0.022,
            x,
            0.14 + (height - 0.14) / 2,
            z,
          );
      }
      for (const y of [0.45, 0.8, height]) {
        box(g, galvanised, length, 0.022, 0.022, 0, y, -width / 2);
        box(g, galvanised, length, 0.022, 0.022, 0, y, width / 2);
        box(g, galvanised, 0.022, 0.022, width, -length / 2, y, 0);
        box(g, galvanised, 0.022, 0.022, width, length / 2, y, 0);
      }
      cylinder(g, black, 0.075, 0.05, 0, height + 0.02, 0, 'y', 16);
      cylinder(g, black, 0.04, 0.12, 0, 0.22, width / 2 + 0.05, 'z', 10);
      return g;
    },
    /**
     * An ISO shipping container, 20 or 40 ft: corrugated steel sides, corner
     * posts and castings, and at the front its double doors with four
     * locking bars and the owner's name.
     */
    container(length: number = CONTAINER.short, colour = '#8b3a2b') {
      const g = new Group();
      const { width, height } = CONTAINER;
      const corrugation = tiled(
        (c, s) => {
          const grad = c.createLinearGradient(0, 0, s, 0);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.25, '#ffffff');
          grad.addColorStop(0.35, '#a0a0a0');
          grad.addColorStop(0.65, '#a0a0a0');
          grad.addColorStop(0.75, '#ffffff');
          grad.addColorStop(1, '#ffffff');
          c.fillStyle = grad;
          c.fillRect(0, 0, s, s);
        },
        length / 0.28,
        1,
      );
      const side = new MeshStandardMaterial({
        color: colour,
        roughness: 0.6,
        metalness: 0.4,
        map: corrugation,
      });
      materials.set(`container ${colour} ${length}`, side);
      const frame = paint(
        new Color(colour).multiplyScalar(0.8).getStyle(),
        0.6,
        0.4,
      );
      box(
        g,
        frame,
        width - 0.1,
        height - 0.2,
        length - 0.1,
        0,
        height / 2,
        -length / 2,
      );
      // The corrugated long sides, their ribs vertical.
      for (const sx of [-1, 1])
        box(
          g,
          side,
          0.03,
          height - 0.24,
          length - 0.3,
          sx * (width / 2 - 0.03),
          height / 2,
          -length / 2,
        );
      box(g, frame, width, 0.06, length, 0, height - 0.03, -length / 2);
      // Corner posts and castings.
      for (const sx of [-1, 1])
        for (const z of [-0.06, -length + 0.06]) {
          box(
            g,
            frame,
            0.12,
            height,
            0.12,
            sx * (width / 2 - 0.06),
            height / 2,
            z,
          );
          for (const y of [0.06, height - 0.06])
            box(g, steel, 0.18, 0.12, 0.18, sx * (width / 2 - 0.09), y, z);
        }
      // The doors at the front, and their locking bars.
      const door = paint(colour, 0.55, 0.4);
      for (const sx of [-1, 1])
        box(
          g,
          door,
          width / 2 - 0.08,
          height - 0.3,
          0.04,
          (sx * (width / 2 - 0.04)) / 2,
          height / 2,
          -0.02,
        );
      for (const x of [-0.85, -0.4, 0.4, 0.85]) {
        cylinder(
          g,
          galvanised,
          0.018,
          height - 0.4,
          x,
          height / 2,
          0.03,
          'y',
          8,
        );
        box(g, galvanised, 0.08, 0.2, 0.05, x + 0.05, 1.2, 0.05);
      }
      box(g, frame, width, 0.2, 0.08, 0, height - 0.1, -0.02);
      box(g, frame, width, 0.2, 0.08, 0, 0.1, -0.02);
      return g;
    },
    /**
     * A counterbalance forklift, about a 5,000 lb truck: a yellow body with a
     * black counterweight at the back, an overhead guard, a seat and wheel,
     * and a mast with its carriage and forks at the front.
     */
    forklift(raised = 0.1) {
      const g = new Group();
      const body = yellow;
      // Body: from the front axle back to the counterweight.
      box(g, body, 1.08, 0.75, 1.75, 0, 0.62, -0.2);
      box(g, black, 1.1, 0.7, 0.45, 0, 0.75, -1.2);
      box(g, body, 1.0, 0.12, 1.1, 0, 1.03, -0.25);
      // Wheels: drive at the front, steer at the back.
      for (const sx of [-1, 1]) {
        cylinder(g, black, 0.265, 0.24, sx * 0.48, 0.265, 0.45, 'x', 18);
        cylinder(g, black, 0.23, 0.2, sx * 0.44, 0.23, -1.05, 'x', 18);
      }
      // Seat and steering.
      box(g, black, 0.45, 0.12, 0.45, 0, 1.15, -0.45);
      box(g, black, 0.45, 0.5, 0.1, 0, 1.4, -0.68);
      const wheel = cylinder(g, black, 0.17, 0.03, 0, 1.45, 0.05, 'y', 16);
      wheel.rotation.x = -0.9;
      // Overhead guard: four posts and a grid roof.
      for (const sx of [-1, 1]) {
        box(g, black, 0.06, 1.2, 0.06, sx * 0.48, 1.65, 0.25);
        box(g, black, 0.06, 1.2, 0.06, sx * 0.48, 1.65, -0.85);
      }
      for (let i = 0; i < 5; i++)
        box(g, black, 1.02, 0.04, 0.05, 0, 2.25, 0.25 - i * 0.275);
      for (const sx of [-1, 1])
        box(g, black, 0.05, 0.05, 1.15, sx * 0.48, 2.25, -0.3);
      // The mast: two channels, the carriage and the forks.
      for (const sx of [-1, 1])
        box(g, steel, 0.1, 2.1, 0.12, sx * 0.36, 1.05, 0.72);
      box(g, steel, 0.82, 0.08, 0.12, 0, 2.06, 0.72);
      const carriage = new Group();
      carriage.position.y = raised;
      g.add(carriage);
      box(carriage, steel, 0.95, 0.45, 0.06, 0, 0.35, 0.82);
      for (const sx of [-1, 1]) {
        box(carriage, steel, 0.1, 0.5, 0.045, sx * 0.3, 0.3, 0.86);
        box(carriage, steel, 0.1, 0.045, 1.07, sx * 0.3, 0.05, 0.86 + 0.535);
      }
      return g;
    },
    /** A janitor's corner: mop bucket and wringer, mop, broom, wet floor sign and trash can. */
    janitorial() {
      const g = new Group();
      // Mop bucket on castors, with its wringer and mop.
      const bucket = new Group();
      g.add(bucket);
      box(bucket, yellow, 0.6, 0.36, 0.4, 0, 0.26, 0);
      box(bucket, paint('#4b6d84', 0.2), 0.54, 0.02, 0.34, 0, 0.4, 0);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          cylinder(
            bucket,
            black,
            0.035,
            0.03,
            sx * 0.25,
            0.04,
            sz * 0.15,
            'x',
            10,
          );
      box(bucket, paint('#2b2b2b', 0.6), 0.25, 0.3, 0.3, 0.12, 0.6, 0);
      cylinder(bucket, steel, 0.012, 1.0, 0.18, 0.95, 0.05, 'y', 6).rotation.z =
        0.15;
      const mop = new Group();
      mop.position.set(0.0, 0.0, 0.1);
      bucket.add(mop);
      cylinder(mop, wood, 0.014, 1.45, 0.05, 0.95, 0, 'y', 6).rotation.z = -0.1;
      cylinder(
        mop,
        paint('#d8d3c2', 1),
        0.09,
        0.2,
        0.0,
        0.32,
        0,
        'y',
        10,
        0.05,
      );
      // A push broom leaning on the wall behind.
      const broom = new Group();
      broom.position.set(0.9, 0, -0.2);
      broom.rotation.x = -0.25;
      g.add(broom);
      box(broom, wood, 0.6, 0.06, 0.07, 0, 0.06, 0);
      box(broom, black, 0.58, 0.07, 0.06, 0, 0.0, 0);
      cylinder(broom, wood, 0.014, 1.5, 0, 0.8, 0, 'y', 6);
      // A wet floor sign, folded open.
      const sign = new Group();
      sign.position.set(-0.8, 0, 0.6);
      g.add(sign);
      for (const sz of [-1, 1]) {
        const leaf = box(sign, yellow, 0.3, 0.62, 0.015, 0, 0.31, sz * 0.12);
        leaf.rotation.x = sz * 0.2;
      }
      // A 32-gallon round trash can.
      const can = new Group();
      can.position.set(-0.2, 0, -0.55);
      g.add(can);
      cylinder(can, paint('#53595c', 0.7), 0.28, 0.7, 0, 0.35, 0, 'y', 20, 0.3);
      cylinder(can, paint('#53595c', 0.7), 0.31, 0.04, 0, 0.7, 0, 'y', 20);
      return g;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials.values()) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
