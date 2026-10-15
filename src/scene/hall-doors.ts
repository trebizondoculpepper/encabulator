import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';

/**
 * Big doors for a very large industrial opening, `width` by `height`
 * metres, built in the opening's plane (x across, y up, its inside face
 * toward +z) with the opening's bottom middle at the origin. Each is shown
 * shut: the hall has no outside.
 *
 * 1. Rolling steel door: a curtain of interlocking steel slats coiled on
 *    a drum in a hood above the opening, running in side guides.
 * 2. Sectional overhead door: insulated steel panels, hinged together,
 *    with a row of windows, running up on tracks to lie under the roof.
 * 3. High-speed fabric door: a reinforced PVC curtain, safety yellow, with
 *    wind bars and a vision strip, rolling up fast on a motorised drum.
 * 4. Bi-fold hangar door: one huge steel leaf that folds outward in the
 *    middle as hydraulic rams lift it, the kind on aircraft hangars.
 * 5. Sliding stacking doors: tall steel leaves on a bottom rail and top
 *    guide, sliding sideways to stack in a pocket, as on a hangar.
 * 6. Vertical lift fabric door: a fabric curtain stiffened by horizontal
 *    wind beams, gathering upward in folds as straps lift it.
 */

export const DOOR_STYLES = [
  'Rolling steel door',
  'Sectional overhead door',
  'High-speed fabric door',
  'Bi-fold hangar door',
  'Sliding stacking doors',
  'Vertical lift fabric door',
] as const;

export function createBigDoor(style: number, width: number, height: number) {
  const group = new Group();
  group.name = DOOR_STYLES[style - 1] ?? 'Door';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const box = (
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
    group.add(mesh);
    return mesh;
  };
  const paint = (
    color: string,
    roughness = 0.55,
    metalness = 0.3,
    map?: Texture,
  ) => {
    const material = new MeshStandardMaterial({
      color,
      roughness,
      metalness,
      map,
    });
    materials.push(material);
    return material;
  };
  const stripes = (
    draw: (c: CanvasRenderingContext2D, s: number) => void,
    rx: number,
    ry: number,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    draw(canvas.getContext('2d')!, 128);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(rx, ry);
    textures.push(t);
    return t;
  };
  const steel = paint('#5a6166', 0.45, 0.6);
  const yellow = paint('#e1a915', 0.5, 0.2);
  const black = paint('#1d1d1e', 0.7);
  /** Safety-striped jamb guards at the foot of each side. */
  const jambGuards = () => {
    const hazard = paint(
      '#ffffff',
      0.5,
      0.1,
      stripes(
        (c, s) => {
          c.fillStyle = '#e1a915';
          c.fillRect(0, 0, s, s);
          c.fillStyle = '#1b1b1b';
          for (let k = -s; k < s * 2; k += s / 2) {
            c.beginPath();
            c.moveTo(k, 0);
            c.lineTo(k + s / 4, 0);
            c.lineTo(k + s / 4 - s, s);
            c.lineTo(k - s, s);
            c.fill();
          }
        },
        1,
        4,
      ),
    );
    for (const sx of [-1, 1])
      box(hazard, 0.35, 1.5, 0.35, sx * (width / 2 + 0.2), 0.75, 0.25);
  };

  if (style === 1) {
    // Slats 75 mm deep, interlocked: a ribbed texture across the curtain.
    const slats = stripes(
      (c, s) => {
        const g = c.createLinearGradient(0, 0, 0, s);
        g.addColorStop(0, '#e4e6e6');
        g.addColorStop(0.45, '#c2c6c6');
        g.addColorStop(0.55, '#8d9292');
        g.addColorStop(1, '#e4e6e6');
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
      },
      1,
      height / 0.075,
    );
    box(
      paint('#9aa0a2', 0.4, 0.6, slats),
      width,
      height,
      0.08,
      0,
      height / 2,
      0,
    );
    box(steel, width + 0.3, 0.12, 0.2, 0, 0.06, 0.02);
    for (const sx of [-1, 1])
      box(
        steel,
        0.25,
        height + 1.2,
        0.3,
        sx * (width / 2 + 0.12),
        (height + 1.2) / 2,
        0,
      );
    // The hood over the coil, and the drive motor on its bracket.
    // The coil housing: a drum-shaped hood the curtain's width.
    const hood = new Mesh(
      new CylinderGeometry(0.75, 0.75, width + 0.6, 24),
      steel,
    );
    geometries.push(hood.geometry);
    hood.rotation.z = Math.PI / 2;
    hood.position.set(0, height + 0.75, 0.3);
    group.add(hood);
    box(steel, width + 0.6, 1.5, 0.05, 0, height + 0.75, -0.4);
    box(black, 0.5, 0.6, 0.5, width / 2 + 0.7, height + 0.6, 0.4);
    box(yellow, 0.2, 0.3, 0.12, width / 2 + 0.5, 1.4, 0.3);
    jambGuards();
  } else if (style === 2) {
    // Panels 0.6 m high, ribbed, with a row of windows two panels up.
    const panels = Math.round(height / 0.6);
    const ph = height / panels;
    const panel = paint(
      '#c9ccc9',
      0.45,
      0.4,
      stripes(
        (c, s) => {
          c.fillStyle = '#ffffff';
          c.fillRect(0, 0, s, s);
          c.fillStyle = 'rgba(0,0,0,0.12)';
          for (let k = 0; k < 4; k++) c.fillRect(0, (k * s) / 4, s, 3);
        },
        width / 2,
        1,
      ),
    );
    for (let i = 0; i < panels; i++) {
      box(panel, width, ph - 0.02, 0.06, 0, (i + 0.5) * ph, 0);
      box(steel, width, 0.02, 0.07, 0, i * ph, 0.005);
    }
    const glass = paint('#e8eef2', 0.1, 0.1);
    for (let x = -width / 2 + 0.8; x < width / 2 - 0.6; x += 1.6)
      box(glass, 1.1, ph * 0.55, 0.065, x + 0.4, 3.5 * ph, 0.002);
    // The tracks, running up and back under the roof.
    for (const sx of [-1, 1]) {
      box(
        steel,
        0.12,
        height + 0.5,
        0.12,
        sx * (width / 2 + 0.1),
        (height + 0.5) / 2,
        0.15,
      );
      box(
        steel,
        0.12,
        0.12,
        height,
        sx * (width / 2 + 0.1),
        height + 0.4,
        height / 2 + 0.15,
      );
    }
    box(steel, width + 0.4, 0.15, 0.15, 0, height + 0.4, height + 0.15);
    box(black, 0.6, 0.5, 0.6, 0, height + 0.6, 1.2);
    jambGuards();
  } else if (style === 3) {
    const fabric = paint(
      '#f0b417',
      0.75,
      0,
      stripes(
        (c, s) => {
          c.fillStyle = '#ffffff';
          c.fillRect(0, 0, s, s);
        },
        1,
        1,
      ),
    );
    box(fabric, width, height, 0.03, 0, height / 2, 0);
    // A clear vision strip at eye height, and wind bars across.
    box(paint('#cfd8dc', 0.1, 0.1), width - 0.2, 0.9, 0.035, 0, 1.6, 0.002);
    for (let y = 2.8; y < height - 0.5; y += 2.4)
      box(black, width, 0.08, 0.05, 0, y, 0.03);
    for (const sx of [-1, 1])
      box(
        steel,
        0.35,
        height + 1.4,
        0.35,
        sx * (width / 2 + 0.17),
        (height + 1.4) / 2,
        0.05,
      );
    box(steel, width + 0.7, 1.1, 0.9, 0, height + 0.6, 0.2);
    box(black, 0.6, 0.6, 0.6, width / 2 + 0.75, height + 0.6, 0.2);
    box(paint('#d73a2a', 0.4), width, 0.15, 0.08, 0, 0.08, 0.02);
    jambGuards();
  } else if (style === 4) {
    // One leaf folding outward at its middle hinge: drawn shut, with the
    // fold line, the lift straps and the hydraulic rams at either side.
    const leaf = paint(
      '#8e969a',
      0.5,
      0.5,
      stripes(
        (c, s) => {
          c.fillStyle = '#ffffff';
          c.fillRect(0, 0, s, s);
          c.fillStyle = 'rgba(0,0,0,0.18)';
          for (let k = 0; k < 8; k++) c.fillRect((k * s) / 8, 0, 2, s);
        },
        width / 2.4,
        1,
      ),
    );
    box(leaf, width, height / 2 - 0.05, 0.2, 0, height * 0.25, 0);
    box(leaf, width, height / 2 - 0.05, 0.2, 0, height * 0.75, 0);
    box(steel, width, 0.25, 0.3, 0, height / 2, 0.05);
    box(steel, width, 0.4, 0.35, 0, height + 0.2, 0.05);
    for (const sx of [-1, 1]) {
      box(
        steel,
        0.5,
        height + 0.6,
        0.5,
        sx * (width / 2 + 0.25),
        (height + 0.6) / 2,
        0.1,
      );
      box(
        paint('#c8261c', 0.4, 0.3),
        0.18,
        height * 0.45,
        0.18,
        sx * (width / 2 - 0.4),
        height * 0.72,
        0.25,
      );
    }
    for (let x = -width / 2 + 2; x < width / 2; x += 4)
      box(black, 0.1, height - 0.4, 0.04, x, height / 2, 0.12);
    box(
      paint('#e8eef2', 0.1, 0.1),
      0.9,
      2.1,
      0.22,
      width / 2 - 2.5,
      1.05,
      0.005,
    );
    jambGuards();
  } else if (style === 5) {
    // Leaves 4 m wide on a bottom rail, the last ones slid open to stack
    // at one side: drawn shut, a shallow step between leaves.
    const leaves = Math.round(width / 4);
    const lw = width / leaves;
    const leaf = paint(
      '#7f8b91',
      0.5,
      0.5,
      stripes(
        (c, s) => {
          const g = c.createLinearGradient(0, 0, s, 0);
          for (let k = 0; k < 6; k++) {
            g.addColorStop(k / 6, '#ffffff');
            g.addColorStop(k / 6 + 0.08, '#b0b0b0');
          }
          c.fillStyle = g;
          c.fillRect(0, 0, s, s);
        },
        lw / 1.2,
        1,
      ),
    );
    for (let i = 0; i < leaves; i++) {
      box(
        leaf,
        lw - 0.04,
        height,
        0.18,
        -width / 2 + (i + 0.5) * lw,
        height / 2,
        (i % 2) * 0.22,
      );
      box(
        black,
        0.15,
        0.2,
        0.1,
        -width / 2 + (i + 0.5) * lw,
        1.1,
        (i % 2) * 0.22 + 0.13,
      );
    }
    box(steel, width + 8, 0.12, 0.6, 4, 0.06, 0.1);
    box(steel, width + 8, 0.5, 0.7, 4, height + 0.25, 0.1);
    box(
      paint('#e8eef2', 0.1, 0.1),
      0.9,
      2.1,
      0.19,
      -width / 2 + lw * 1.5,
      1.05,
      0.22 + 0.005,
    );
    jambGuards();
  } else {
    // Wind beams every 1.5 m, fabric between them sagging into folds.
    const fabric = paint('#2f4a6a', 0.85, 0);
    for (let y = 0; y < height; y += 1.5) {
      box(fabric, width, 1.42, 0.06, 0, y + 0.75, 0.03 + Math.sin(y) * 0.02);
      box(steel, width + 0.2, 0.12, 0.22, 0, y + 1.5, 0.08);
    }
    for (let x = -width / 2 + 3; x < width / 2; x += 6)
      box(black, 0.08, height, 0.05, x, height / 2, 0.15);
    box(steel, width + 1, 1.2, 1.2, 0, height + 0.6, 0.3);
    for (const sx of [-1, 1])
      box(
        steel,
        0.5,
        height + 1.2,
        0.6,
        sx * (width / 2 + 0.25),
        (height + 1.2) / 2,
        0.15,
      );
    jambGuards();
  }
  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

/**
 * A personnel door beside a great door: a hollow-metal door, 3 ft by
 * 7 ft, in a pressed steel frame, standing open into the hall, with a
 * push bar, a kick plate, a closer arm and a lit red EXIT sign over it.
 * Through it, `outside`: the overcast day, a flat white glare. Built
 * facing +z, its opening's bottom middle at the origin.
 */
export function createPersonnelDoor(
  outside: Material,
  width = 0.92,
  height = 2.13,
  open = true,
) {
  const group = new Group();
  group.name = 'Personnel door';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
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
  const paint = (color: string, roughness = 0.5, metalness = 0.3) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    materials.push(m);
    return m;
  };
  const frame = paint('#5b6266', 0.45, 0.5);
  const leafPaint = paint('#7a8a6e', 0.5, 0.3);
  const steel = paint('#b9bec0', 0.3, 0.85);
  // The day outside, just beyond the frame.
  box(group, outside, width + 0.1, height + 0.05, 0.02, 0, height / 2, -0.4);
  // The frame: jambs and head.
  for (const sx of [-1, 1])
    box(
      group,
      frame,
      0.06,
      height + 0.06,
      0.2,
      sx * (width / 2 + 0.03),
      (height + 0.06) / 2,
      0,
    );
  box(group, frame, width + 0.12, 0.06, 0.2, 0, height + 0.03, 0);
  // The leaf, open into the hall on its left hinge.
  const hinge = new Group();
  hinge.position.set(-width / 2, 0, 0.08);
  hinge.rotation.y = open ? -1.75 : 0;
  group.add(hinge);
  box(hinge, leafPaint, width, height - 0.01, 0.045, width / 2, height / 2, 0);
  box(hinge, steel, width - 0.1, 0.25, 0.05, width / 2, 0.15, 0);
  box(hinge, steel, width - 0.25, 0.04, 0.08, width / 2 + 0.05, 1.0, 0.05);
  box(
    hinge,
    paint('#303436', 0.5, 0.5),
    0.4,
    0.04,
    0.05,
    width / 2 - 0.15,
    height - 0.12,
    0.05,
  );
  // The EXIT sign: red letters lit from within.
  const sign = new MeshStandardMaterial({
    color: '#2a0c0a',
    emissive: '#ff2a1a',
    emissiveIntensity: 2.2,
  });
  materials.push(sign);
  box(
    group,
    paint('#e9e6dc', 0.4, 0.1),
    0.34,
    0.2,
    0.06,
    0,
    height + 0.3,
    0.05,
  );
  box(group, sign, 0.26, 0.09, 0.065, 0, height + 0.3, 0.05);
  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
