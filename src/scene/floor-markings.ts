import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material, Texture } from 'three';
import { createInstancer } from './instancer';

/**
 * Painted floor markings, to the colour practice of American plants:
 * yellow for aisles, traffic lanes and work cells; white for equipment
 * and storage locations; yellow and black stripes for physical hazards;
 * red and white for keep-clear areas in front of electrical gear and
 * fire equipment; zebra crossings where people cross a traffic lane; and
 * stencilled words and arrows. Built in metres in the hall's frame, laid
 * a few millimetres over the floor so the shine still reads through.
 */
export function createFloorMarkings() {
  const group = new Group();
  group.name = 'Floor markings';
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const paint = (color: string, map?: Texture, transparent = false) => {
    const m = new MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0,
      map,
      transparent,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    materials.push(m);
    return m;
  };
  const tex = (
    size: number,
    draw: (c: CanvasRenderingContext2D, s: number) => void,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    textures.push(t);
    return t;
  };
  const diagonal = (a: string, b: string) =>
    tex(64, (c, s) => {
      c.fillStyle = a;
      c.fillRect(0, 0, s, s);
      c.fillStyle = b;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(s / 2, 0);
      c.lineTo(0, s / 2);
      c.fill();
      c.beginPath();
      c.moveTo(s, 0);
      c.lineTo(s, s / 2);
      c.lineTo(s / 2, s);
      c.lineTo(0, s);
      c.fill();
    });
  const hazardTexture = diagonal('#e1a915', '#1b1b1b');
  const keepClearTexture = diagonal('#f2f0ea', '#b72a1f');
  const yellow = paint('#e1a915');
  const white = paint('#ecebe6');
  const it = createInstancer();
  const stripeY = it.part(new BoxGeometry(1, 1, 1), yellow);
  const stripeW = it.part(new BoxGeometry(1, 1, 1), white);
  const Y = 0.003;
  const T = 0.003;

  /** A painted line from (x1, z1) to (x2, z2), `width` wide. */
  const line = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width = 0.1,
    colour: 'yellow' | 'white' = 'yellow',
  ) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    it.put(
      colour === 'yellow' ? stripeY : stripeW,
      (x1 + x2) / 2,
      Y,
      (z1 + z2) / 2,
      length,
      T,
      width,
      0,
      -Math.atan2(z2 - z1, x2 - x1),
      0,
    );
  };
  /** A rectangle outline centred on (x, z). */
  const outline = (
    x: number,
    z: number,
    w: number,
    d: number,
    colour: 'yellow' | 'white' = 'yellow',
    width = 0.1,
  ) => {
    line(x - w / 2, z - d / 2, x + w / 2, z - d / 2, width, colour);
    line(x - w / 2, z + d / 2, x + w / 2, z + d / 2, width, colour);
    line(x - w / 2, z - d / 2, x - w / 2, z + d / 2, width, colour);
    line(x + w / 2, z - d / 2, x + w / 2, z + d / 2, width, colour);
  };
  /** A striped area centred on (x, z): hazard yellow/black or keep-clear red/white. */
  const striped = (
    x: number,
    z: number,
    w: number,
    d: number,
    kind: 'hazard' | 'keep-clear',
  ) => {
    const map = (kind === 'hazard' ? hazardTexture : keepClearTexture).clone();
    map.repeat.set(w / 0.6, d / 0.6);
    map.needsUpdate = true;
    textures.push(map);
    const mesh = new Mesh(new PlaneGeometry(w, d), paint('#ffffff', map));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, Y + 0.001, z);
    group.add(mesh);
  };
  /** Words stencilled on the floor, reading from `yaw` (0 reads facing -z). */
  const stencil = (
    text: string,
    x: number,
    z: number,
    height = 0.6,
    yaw = 0,
    colour = '#e1a915',
  ) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 96px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.width = w;
    canvas.height = 120;
    ctx.font = 'bold 96px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = colour;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, 62);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    textures.push(map);
    const material = new MeshStandardMaterial({
      map,
      transparent: true,
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    materials.push(material);
    const mesh = new Mesh(
      new PlaneGeometry((height * w) / 120, height),
      material,
    );
    mesh.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ');
    mesh.position.set(x, Y + 0.002, z);
    group.add(mesh);
  };
  /** A painted arrow pointing along `yaw` (0 points toward -z). */
  const arrow = (x: number, z: number, yaw = 0, size = 1.2) => {
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw);
    line(
      x - dx * size * 0.5,
      z - dz * size * 0.5,
      x + dx * size * 0.35,
      z + dz * size * 0.35,
      0.18,
    );
    for (const side of [-1, 1]) {
      const a = yaw + side * 0.6;
      const hx = x + dx * size * 0.5;
      const hz = z + dz * size * 0.5;
      line(
        hx,
        hz,
        hx + Math.sin(a) * size * 0.35,
        hz + Math.cos(a) * size * 0.35,
        0.18,
      );
    }
  };
  /** A zebra crossing across a lane: bars `length` long, from (x, z0) to (x, z1). */
  const crossing = (x: number, z0: number, z1: number, length = 3) => {
    for (let z = Math.min(z0, z1); z < Math.max(z0, z1); z += 0.9)
      it.put(stripeW, x, Y, z + 0.25, length, T, 0.5);
  };

  const built = { line, outline, striped, stencil, arrow, crossing };
  return {
    group,
    ...built,
    /** Build the instanced stripes once everything has been laid. */
    finish() {
      it.build(group);
    },
    dispose() {
      it.dispose();
      group.traverse((o) => {
        if (o instanceof Mesh && !(o.geometry instanceof BoxGeometry))
          o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

export type FloorMarkings = ReturnType<typeof createFloorMarkings>;
