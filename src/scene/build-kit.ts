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

/**
 * A small kit for building set pieces from boxes, cylinders and printed
 * signs, keeping track of what it made so `dispose` frees it all. Sizes
 * in metres.
 */
export function createBuildKit() {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const kit = {
    paint(
      color: string,
      roughness = 0.7,
      metalness = 0,
      extra: Partial<MeshStandardMaterial> = {},
    ) {
      const m = new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        ...extra,
      });
      materials.push(m);
      return m;
    },
    /** A material that gives off its own light, brighter than white to bloom. */
    glow(color: Color) {
      const m = new MeshBasicMaterial({ color });
      m.toneMapped = false;
      materials.push(m);
      return m;
    },
    box(
      parent: Group,
      material: Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) {
      const geometry = new BoxGeometry(w, h, d);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cyl(
      parent: Group,
      material: Material,
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      top = r,
      segments = 14,
    ) {
      const geometry = new CylinderGeometry(top, r, h, segments);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    /**
     * A printed sign, `w` by `h` metres: text on a plate, with an optional
     * symbol drawn at its left (`cross` for first aid, `man`, `woman`).
     */
    sign(
      text: string,
      w: number,
      h: number,
      ink: string,
      plate: string,
      symbol?: 'cross' | 'man' | 'woman',
    ) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = Math.max(32, Math.round((512 * h) / w));
      const c = canvas.getContext('2d')!;
      c.fillStyle = plate;
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = ink;
      const ch = canvas.height;
      let left = 0;
      if (symbol) {
        const s = ch * 0.7;
        const x0 = ch * 0.15;
        const y0 = ch * 0.15;
        if (symbol === 'cross') {
          c.fillRect(x0 + s / 3, y0, s / 3, s);
          c.fillRect(x0, y0 + s / 3, s, s / 3);
        } else {
          c.beginPath();
          c.arc(x0 + s / 2, y0 + s * 0.12, s * 0.12, 0, Math.PI * 2);
          c.fill();
          if (symbol === 'man')
            c.fillRect(x0 + s * 0.3, y0 + s * 0.28, s * 0.4, s * 0.72);
          else {
            c.beginPath();
            c.moveTo(x0 + s / 2, y0 + s * 0.26);
            c.lineTo(x0 + s * 0.85, y0 + s * 0.8);
            c.lineTo(x0 + s * 0.15, y0 + s * 0.8);
            c.fill();
            c.fillRect(x0 + s * 0.35, y0 + s * 0.8, s * 0.3, s * 0.2);
          }
        }
        left = ch;
      }
      c.font = `bold ${Math.round(ch * 0.42)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((line, i) =>
        c.fillText(
          line,
          left + (canvas.width - left) / 2,
          ch / 2 + (i - (lines.length - 1) / 2) * ch * 0.45 + 2,
          canvas.width - left - 16,
        ),
      );
      const map = new CanvasTexture(canvas);
      map.colorSpace = SRGBColorSpace;
      textures.push(map);
      const material = new MeshStandardMaterial({ map, roughness: 0.6 });
      materials.push(material);
      const geometry = new PlaneGeometry(w, h);
      geometries.push(geometry);
      return new Mesh(geometry, material);
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
  return kit;
}

export type BuildKit = ReturnType<typeof createBuildKit>;
