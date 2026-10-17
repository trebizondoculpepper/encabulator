import {
  DataTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { Object3D } from 'three';
import { createSmokeEmitter } from './smoke-emitter';

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One tongue of soot licking up from the seam: metres, across the face. */
interface Tongue {
  x: number;
  width: number;
  length: number;
  dark: number;
  streak: number;
}

/** A door or cover the smoke rises past, in its section's frame. */
export interface SootedFace {
  /** What the soot is laid on: it moves, and swings open, with it. */
  hinge: Object3D;
  /** Where its face starts in the hinge's frame, and how wide it is. */
  x: number;
  width: number;
  /** Its bottom and top, metres up its section. */
  bottom: number;
  top: number;
  /** Its front, in the hinge's frame. */
  z: number;
}

const PX_PER_METRE = 220;

/**
 * Smoke pouring from the top seam of a burning unit in the motor control
 * line-up, and the soot it leaves on the faces above it: dark tongues
 * licking up from the seam, spreading and fading as they rise. The
 * stains are painted once, from `seed`, and come up as `soot` (0 to 1)
 * builds; the smoke follows `strength` (0 to 1). Section frame: metres,
 * `seam` the height of the burning unit's top edge, its face centred on
 * `x` and `width` wide, its front at `z`.
 */
export function createUnitSmoke(
  section: Object3D,
  {
    x,
    width,
    seam,
    z,
    seed,
    faces,
  }: {
    x: number;
    width: number;
    seam: number;
    z: number;
    seed: number;
    faces: readonly SootedFace[];
  },
) {
  const r = rng(seed);
  // The plume: a few columns of dark smoke along the seam, out of step.
  const plume = new Group();
  plume.name = 'Burning unit smoke';
  plume.userData.noCollision = true;
  plume.position.set(x, seam, z + 0.03);
  plume.raycast = () => false;
  section.add(plume);
  const columns = [-0.3, 0, 0.28].map((across, i) => {
    const emitter = createSmokeEmitter(14, '52, 50, 47');
    emitter.group.position.x = across * width;
    emitter.group.scale.setScalar(1.05 + i * 0.1);
    plume.add(emitter.group);
    return { emitter, offset: r() * 40 };
  });
  plume.visible = false;

  // The soot, the same tongues running on across every face they reach.
  const tongues: Tongue[] = Array.from({ length: 11 }, () => ({
    x: x + (r() - 0.5) * width * 0.9,
    width: 0.03 + r() * 0.07,
    length: 0.45 + r() * 0.9,
    dark: 0.55 + r() * 0.45,
    streak: r() * 100,
  }));
  /** How dark the soot is at a point of the section, 0 to 1. */
  const sootAt = (px: number, py: number) => {
    const up = py - seam;
    // A dark rim along the seam itself, a little down the burning face.
    let a = up < 0 ? Math.max(0, 1 + up / 0.06) * 0.55 : 0;
    // A thin haze over the whole width, near the seam.
    if (up >= 0) a += 0.22 * Math.exp(-up / 0.25);
    for (const t of tongues) {
      if (up < -0.02 || up > t.length) continue;
      const rise = Math.max(0, up) / t.length;
      // Spreading as it rises, and thinning.
      const spread = t.width * (1 + rise * 1.6);
      const across = (px - t.x) / spread;
      const streaks = 0.75 + 0.25 * Math.sin(px * 260 + t.streak);
      a += t.dark * (1 - rise) ** 1.6 * Math.exp(-across * across) * streaks;
    }
    return Math.min(1, a);
  };
  const materials = faces.map((face) => {
    const w = Math.max(8, Math.round(face.width * PX_PER_METRE));
    const h = Math.max(8, Math.round((face.top - face.bottom) * PX_PER_METRE));
    // Row 0 is the bottom of the face.
    const data = new Uint8Array(w * h * 4);
    for (let row = 0; row < h; row++)
      for (let col = 0; col < w; col++) {
        // From the face's own frame, from its hinge edge, to the section's.
        const px =
          face.hinge.position.x + face.x + ((col + 0.5) / w) * face.width;
        const py = face.bottom + ((row + 0.5) / h) * (face.top - face.bottom);
        const i = (row * w + col) * 4;
        data[i] = 16;
        data[i + 1] = 13;
        data[i + 2] = 11;
        data[i + 3] = Math.round(255 * sootAt(px, py));
      }
    const texture = new DataTexture(data, w, h);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const decal = new Mesh(
      new PlaneGeometry(face.width, face.top - face.bottom),
      material,
    );
    decal.name = 'Soot';
    decal.userData.noCollision = true;
    // The soot never takes a click: what is under it still works.
    decal.raycast = () => {};
    decal.position.set(
      face.x + face.width / 2,
      (face.top + face.bottom) / 2 - face.hinge.position.y,
      face.z,
    );
    decal.visible = false;
    face.hinge.add(decal);
    return { material, decal, texture };
  });

  return {
    /** `strength` of the smoke and `soot` laid down so far, both 0 to 1. */
    update(clock: number, strength: number, soot: number) {
      plume.visible = strength > 0.001;
      if (plume.visible)
        for (const { emitter, offset } of columns)
          emitter.update(clock + offset, strength * 0.85, false);
      for (const { material, decal } of materials) {
        decal.visible = soot > 0.002;
        material.opacity = soot;
      }
    },
    dispose() {
      for (const { emitter } of columns) emitter.dispose();
      for (const { material, decal, texture } of materials) {
        material.dispose();
        texture.dispose();
        decal.geometry.dispose();
      }
    },
  };
}
