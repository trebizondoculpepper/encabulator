import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import type { Footprint } from '../game/walk-collision';

/**
 * The facility administrators' office: an in-plant office of the 1990s
 * built inside the hall. Steel-stud partitions faced with painted drywall,
 * a rubber cove base, and a drywall lid over a suspended acoustic-tile
 * ceiling with fluorescent troffers. Bands of interior windows in dark
 * bronze aluminium frames run along the front and one side, some with
 * mini-blinds half down. The door, standing open, has a vision panel and
 * a sign over it. Inside: steel desks with beige CRT monitors, desktop
 * PCs and keyboards, task chairs, four-drawer filing cabinets, a water
 * cooler, a whiteboard, a clock, a laser printer and a plant.
 *
 * Built in metres, its floor at y = 0, centred on the origin, its front
 * (the window wall with the door) facing +z and its windowed side +x.
 */
export const OFFICE = { width: 19, depth: 10, height: 3.05 };

export function createPlantOffice() {
  const group = new Group();
  group.name = 'Administration office';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const { width: W, depth: D, height: H } = OFFICE;
  const t = 0.12;
  const paint = (
    color: string,
    roughness = 0.7,
    metalness = 0,
    extra: Partial<MeshStandardMaterial> = {},
  ) => {
    const m = new MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra,
    });
    materials.push(m);
    return m;
  };
  const glow = (color: Color) => {
    const m = new MeshBasicMaterial({ color });
    m.toneMapped = false;
    materials.push(m);
    return m;
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
  const cyl = (
    parent: Group,
    material: Material,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    top = r,
  ) => {
    const geometry = new CylinderGeometry(top, r, h, 14);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    w: number,
    h: number,
    ink: string,
    plate: string,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * h) / w);
    const c = canvas.getContext('2d')!;
    c.fillStyle = plate;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = ink;
    c.font = `bold ${Math.round(canvas.height * 0.5)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(
      text,
      canvas.width / 2,
      canvas.height / 2 + 2,
      canvas.width - 20,
    );
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    textures.push(map);
    const m = new MeshStandardMaterial({ map, roughness: 0.6 });
    materials.push(m);
    const geometry = new PlaneGeometry(w, h);
    geometries.push(geometry);
    return new Mesh(geometry, m);
  };

  const drywall = paint('#e3dfd4', 0.85);
  const cove = paint('#3b3a38', 0.6);
  const bronze = paint('#3a3127', 0.45, 0.5);
  const glass = paint('#a9bcc2', 0.05, 0.3, {
    transparent: true,
    opacity: 0.16,
  });
  const blind = paint('#d9d4c6', 0.5, 0.2);
  const carpet = paint('#5a5f66', 0.95);
  const tile = paint('#ece9e0', 0.9);
  const grid = paint('#f4f3ef', 0.5, 0.2);
  const solids: Footprint[] = [];
  const wallSolid = (x0: number, z0: number, x1: number, z1: number) =>
    solids.push({
      minX: Math.min(x0, x1) - t,
      maxX: Math.max(x0, x1) + t,
      minZ: Math.min(z0, z1) - t,
      maxZ: Math.max(z0, z1) + t,
    });

  // ---- Floor, lid and ceiling ---------------------------------------------
  box(group, carpet, W - 2 * t, 0.01, D - 2 * t, 0, 0.005, 0);
  box(group, drywall, W + 0.02, 0.06, D + 0.02, 0, H + 0.03, 0);
  // The lid's edge: a fascia band, and the steel track of the studs.
  box(
    group,
    paint('#9ea2a3', 0.4, 0.7),
    W + 0.03,
    0.05,
    D + 0.03,
    0,
    H - 0.02,
    0,
  );
  // The suspended ceiling, 2.7 m up: tiles in a 2 × 4 ft grid, troffers.
  const ceilingY = 2.7;
  box(group, tile, W - 2 * t, 0.02, D - 2 * t, 0, ceilingY, 0);
  for (let x = -W / 2 + 0.6; x < W / 2; x += 0.61)
    box(group, grid, 0.02, 0.025, D - 2 * t, x, ceilingY - 0.012, 0);
  for (let z = -D / 2 + 1.2; z < D / 2; z += 1.22)
    box(group, grid, W - 2 * t, 0.025, 0.02, 0, ceilingY - 0.012, z);
  const troffer = glow(new Color(1.9, 1.95, 1.9));
  for (let x = -W / 2 + 2; x < W / 2 - 1; x += 3.05)
    for (let z = -D / 2 + 1.8; z < D / 2 - 1; z += 2.44) {
      box(group, troffer, 0.58, 0.01, 1.2, x, ceilingY - 0.015, z);
      for (let k = -1; k <= 1; k += 2)
        box(group, grid, 0.6, 0.012, 0.03, x, ceilingY - 0.02, z + k * 0.3);
    }

  // ---- Walls ----------------------------------------------------------------
  /** A solid run of partition along x (at z) or along z (at x). */
  const solid = (alongX: boolean, at: number, from: number, to: number) => {
    const len = to - from;
    const mid = (from + to) / 2;
    if (alongX) {
      box(group, drywall, len, H, t, mid, H / 2, at);
      box(group, cove, len, 0.1, t + 0.012, mid, 0.05, at);
      wallSolid(from, at, to, at);
    } else {
      box(group, drywall, t, H, len, at, H / 2, mid);
      box(group, cove, t + 0.012, 0.1, len, at, 0.05, mid);
      wallSolid(at, from, at, to);
    }
  };
  /** A windowed run: drywall below 0.9 m and above 2.2 m, glass between. */
  const windowed = (
    alongX: boolean,
    at: number,
    from: number,
    to: number,
    blinds: (i: number) => number,
  ) => {
    const len = to - from;
    const mid = (from + to) / 2;
    const place = (
      along: number,
      y: number,
      w: number,
      h: number,
      d: number,
      m: Material,
    ) =>
      alongX
        ? box(group, m, w, h, d, along, y, at)
        : box(group, m, d, h, w, at, y, along);
    place(mid, 0.45, len, 0.9, t, drywall);
    place(mid, (2.2 + H) / 2, len, H - 2.2, t, drywall);
    place(mid, 0.05, len, 0.1, t + 0.012, cove);
    place(mid, 1.55, len, 1.3, 0.01, glass);
    const panes = Math.max(1, Math.round(len / 1.5));
    const pw = len / panes;
    for (let i = 0; i <= panes; i++)
      place(from + i * pw, 1.55, 0.05, 1.32, 0.1, bronze);
    for (const y of [0.9, 2.2]) place(mid, y, len, 0.05, 0.14, bronze);
    // Mini-blinds, drawn down to a different height in each pane.
    for (let i = 0; i < panes; i++) {
      const down = blinds(i);
      if (down <= 0) continue;
      const centre = from + (i + 0.5) * pw;
      place(centre, 2.17, pw - 0.08, 0.05, 0.05, blind);
      for (let y = 2.13; y > 2.15 - 1.25 * down; y -= 0.035) {
        const slat = place(centre, y, pw - 0.1, 0.004, 0.025, blind);
        slat.rotation[alongX ? 'x' : 'z'] = 0.6;
      }
    }
    if (alongX) wallSolid(from, at, to, at);
    else wallSolid(at, from, at, to);
  };
  const doorX = W / 2 - 3.2;
  const doorW = 0.92;
  // The back and the west side are solid; the front and east are windowed.
  solid(true, -D / 2, -W / 2, W / 2);
  solid(false, -W / 2, -D / 2, D / 2);
  windowed(
    false,
    W / 2,
    -D / 2,
    D / 2,
    (i) => [0.4, 0, 0.7, 0.2, 0, 0.5, 1][i % 7],
  );
  windowed(
    true,
    D / 2,
    -W / 2,
    doorX - doorW / 2 - 0.3,
    (i) => [0, 0.3, 0.9, 0, 0.5, 0, 0.2, 0.6, 0, 0.4][i % 10],
  );
  solid(true, D / 2, doorX - doorW / 2 - 0.3, doorX - doorW / 2);
  solid(true, D / 2, doorX + doorW / 2, W / 2);
  // Over the door: the header, and the door itself, open, in its frame.
  box(group, drywall, doorW, H - 2.13, t, doorX, (2.13 + H) / 2, D / 2);
  const frame = paint('#4d4a45', 0.5, 0.4);
  for (const sx of [-1, 1])
    box(
      group,
      frame,
      0.05,
      2.15,
      t + 0.04,
      doorX + sx * (doorW / 2 + 0.025),
      1.075,
      D / 2,
    );
  box(group, frame, doorW + 0.1, 0.05, t + 0.04, doorX, 2.155, D / 2);
  const hinge = new Group();
  hinge.position.set(doorX - doorW / 2, 0, D / 2 + 0.05);
  hinge.rotation.y = -1.6;
  group.add(hinge);
  box(
    hinge,
    paint('#8a8f87', 0.5, 0.3),
    doorW,
    2.12,
    0.045,
    doorW / 2,
    1.06,
    0,
  );
  box(hinge, glass, 0.12, 0.7, 0.05, doorW - 0.25, 1.5, 0);
  cyl(hinge, paint('#b9bec0', 0.3, 0.85), 0.025, 0.12, doorW - 0.1, 1.0, 0.05);
  const sign = label(
    'FACILITY ADMINISTRATION',
    2.2,
    0.28,
    '#f2efe4',
    '#22324f',
  );
  sign.position.set(doorX, 2.55, D / 2 + t / 2 + 0.01);
  group.add(sign);
  const notice = label(
    'AUTHORIZED PERSONNEL ONLY',
    0.9,
    0.18,
    '#1b1b1b',
    '#e8c215',
  );
  notice.position.set(doorX + 1.1, 1.55, D / 2 + t / 2 + 0.01);
  group.add(notice);

  // ---- Furniture ------------------------------------------------------------
  const steelDesk = paint('#9a9a8e', 0.5, 0.4);
  const deskTop = paint('#c7c0ad', 0.6);
  const beige = paint('#d8d0bc', 0.55);
  const screen = glow(new Color(0.05, 0.22, 0.12));
  const chairFabric = paint('#384656', 0.9);
  const black = paint('#1e1e1e', 0.6);
  const desk = (x: number, z: number, yaw: number) => {
    const d = new Group();
    d.position.set(x, 0, z);
    d.rotation.y = yaw;
    group.add(d);
    // A 60 × 30 in steel desk: top, modesty panel, a pedestal of drawers.
    box(d, deskTop, 1.52, 0.03, 0.76, 0, 0.74, 0);
    box(d, steelDesk, 0.03, 0.72, 0.72, -0.74, 0.37, 0);
    box(d, steelDesk, 0.4, 0.72, 0.72, 0.54, 0.37, 0);
    for (let k = 0; k < 3; k++)
      box(
        d,
        paint('#86867c', 0.5, 0.4),
        0.36,
        0.2,
        0.01,
        0.54,
        0.15 + k * 0.23,
        0.365,
      );
    box(d, steelDesk, 1.1, 0.4, 0.02, -0.18, 0.5, -0.35);
    // A desktop PC under a 14-inch CRT monitor, and the keyboard.
    box(d, beige, 0.42, 0.15, 0.4, -0.15, 0.83, -0.12);
    box(d, beige, 0.38, 0.34, 0.36, -0.15, 1.08, -0.14);
    box(d, beige, 0.28, 0.24, 0.12, -0.15, 1.05, -0.36);
    box(d, screen, 0.29, 0.22, 0.01, -0.15, 1.09, 0.045);
    box(d, beige, 0.46, 0.03, 0.17, -0.15, 0.77, 0.2);
    // Paperwork, a phone and a mug.
    box(d, paint('#f2efe6', 0.9), 0.22, 0.03, 0.3, 0.45, 0.77, 0.1);
    box(d, black, 0.18, 0.06, 0.2, 0.5, 0.78, -0.2);
    cyl(d, paint('#8a2a22', 0.4), 0.04, 0.1, 0.25, 0.8, 0.2);
    // The task chair: five-star base, column, seat and back.
    const chair = new Group();
    chair.position.set(-0.15, 0, 0.65);
    chair.rotation.y = 0.3;
    d.add(chair);
    for (let k = 0; k < 5; k++) {
      const leg = box(chair, black, 0.32, 0.03, 0.05, 0, 0.06, 0);
      leg.geometry.translate(0.16, 0, 0);
      leg.rotation.y = (k / 5) * Math.PI * 2;
    }
    cyl(chair, black, 0.03, 0.4, 0, 0.27, 0);
    box(chair, chairFabric, 0.48, 0.08, 0.46, 0, 0.48, 0);
    box(chair, chairFabric, 0.44, 0.5, 0.07, 0, 0.8, 0.22);
  };
  for (let i = 0; i < 4; i++)
    desk(-W / 2 + 2.6 + i * 2.6, D / 2 - 1.6, Math.PI);
  for (let i = 0; i < 4; i++) desk(-W / 2 + 2.6 + i * 2.6, 0, 0);
  desk(W / 2 - 2.2, -1.5, -Math.PI / 2);
  // Four-drawer filing cabinets along the back wall.
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 0.6 + i * 0.4;
    box(
      group,
      i % 3 === 2 ? paint('#7f8a86', 0.5, 0.4) : beige,
      0.38,
      1.33,
      0.71,
      x,
      0.665,
      -D / 2 + 0.45,
    );
    for (let k = 0; k < 4; k++)
      box(group, black, 0.12, 0.02, 0.02, x, 0.25 + k * 0.32, -D / 2 + 0.81);
  }
  // A plan chest and a laser printer on it.
  box(group, steelDesk, 1.3, 0.75, 0.9, -1.0, 0.375, -D / 2 + 0.6);
  box(group, beige, 0.45, 0.28, 0.42, -1.2, 0.89, -D / 2 + 0.6);
  // The water cooler, with its blue bottle.
  box(group, beige, 0.32, 1.0, 0.32, 2.0, 0.5, -D / 2 + 0.3);
  cyl(
    group,
    paint('#7fb3d9', 0.1, 0, { transparent: true, opacity: 0.6 }),
    0.13,
    0.48,
    2.0,
    1.25,
    -D / 2 + 0.3,
  );
  // A whiteboard and a clock on the west wall; a notice board on the back.
  box(
    group,
    paint('#f7f7f4', 0.15),
    0.02,
    1.1,
    2.2,
    -W / 2 + t / 2 + 0.02,
    1.5,
    0,
  );
  box(
    group,
    paint('#b9bec0', 0.3, 0.8),
    0.03,
    1.14,
    2.24,
    -W / 2 + t / 2 + 0.01,
    1.5,
    0,
  );
  const clock = cyl(
    group,
    paint('#f2f0ea', 0.4),
    0.16,
    0.04,
    -W / 2 + t / 2 + 0.03,
    2.35,
    2.2,
  );
  clock.rotation.z = Math.PI / 2;
  box(
    group,
    paint('#b08a5a', 0.9),
    1.6,
    0.9,
    0.02,
    4.5,
    1.6,
    -D / 2 + t / 2 + 0.01,
  );
  for (let k = 0; k < 7; k++)
    box(
      group,
      paint(['#f2efe6', '#f5e9a8', '#cfe3f2'][k % 3], 0.9),
      0.2,
      0.26,
      0.005,
      3.9 + (k % 4) * 0.36,
      1.45 + Math.floor(k / 4) * 0.34,
      -D / 2 + t / 2 + 0.025,
    );
  // A ficus in a pot in the corner.
  cyl(
    group,
    paint('#7a4a2a', 0.8),
    0.18,
    0.4,
    W / 2 - 0.5,
    0.2,
    -D / 2 + 0.5,
    0.22,
  );
  for (let k = 0; k < 6; k++) {
    const leaf = new Mesh(
      new CylinderGeometry(0.0, 0.32, 0.5, 7),
      paint('#3d6a35', 0.8),
    );
    geometries.push(leaf.geometry);
    leaf.position.set(W / 2 - 0.5, 0.9 + k * 0.17, -D / 2 + 0.5);
    leaf.rotation.y = k;
    group.add(leaf);
  }
  // Wastebaskets.
  for (const [x, z] of [
    [-W / 2 + 3.4, D / 2 - 2.2],
    [-W / 2 + 6, -0.6],
    [W / 2 - 1.4, -2.4],
  ])
    cyl(group, black, 0.14, 0.32, x, 0.16, z, 0.16);

  return {
    group,
    /** Its walls, in its own frame: the door's opening is left clear. */
    solids,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t2 of textures) t2.dispose();
    },
  };
}
