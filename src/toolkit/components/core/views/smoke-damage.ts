import { Color, Mesh } from 'three';
import type { Material, Object3D } from 'three';

/** The colour of soot: a warm, very dark brown-black. */
const SOOT = new Color('#16120f');

interface Tinted {
  material: Material & { color: Color; roughness?: number };
  colour: Color;
  roughness?: number;
  /** This part's share of the damage: smoke stains unevenly. */
  share: number;
}

/**
 * Smoke damage to everything inside `root` (a cabinet's works, a room's
 * contents): each part darkened towards soot and its gloss dulled, as
 * `set(amount)` says, from 0 (clean) to 1 (blackened). The damage is
 * uneven: higher parts, where the smoke gathers, and some parts more than
 * others. Each damaged part gets a material of its own the first time, so
 * nothing outside `root` that shared it is touched; `set(0)` puts every
 * part back as it was. What glows (lamps, screens) keeps its glow.
 */
export function createSmokeDamage(root: Object3D) {
  let parts: Tinted[] | null = null;
  const take = () => {
    const found: Tinted[] = [];
    root.updateWorldMatrix(true, true);
    const meshes: Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    // Heights, so the smoke can gather higher up.
    const ys = meshes.map((m) => m.matrixWorld.elements[13]);
    const low = Math.min(...ys);
    const high = Math.max(...ys);
    meshes.forEach((mesh, i) => {
      const own = (material: Material) => {
        const m = material as Material & { color?: Color; roughness?: number };
        if (!m.color) return material;
        const copy = m.clone() as Material & {
          color: Color;
          roughness?: number;
        };
        const up = high > low ? (ys[i] - low) / (high - low) : 1;
        // A steady, uneven share for each part, from its place in the tree.
        const speckle = ((i * 2654435761) % 1000) / 1000;
        found.push({
          material: copy,
          colour: copy.color.clone(),
          roughness: copy.roughness,
          share: 0.55 + 0.3 * up + 0.15 * speckle,
        });
        return copy;
      };
      mesh.userData.smokeDamageOriginal ??= mesh.material;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(own)
        : own(mesh.material);
    });
    return found;
  };
  let amount = 0;
  return {
    get amount() {
      return amount;
    },
    set(next: number) {
      next = Math.max(0, Math.min(1, next));
      if (next === amount) return;
      amount = next;
      if (amount === 0) {
        // Clean: every part back on the material it had.
        if (!parts) return;
        root.traverse((o) => {
          if (o instanceof Mesh && o.userData.smokeDamageOriginal) {
            o.material = o.userData.smokeDamageOriginal;
            delete o.userData.smokeDamageOriginal;
          }
        });
        for (const p of parts) p.material.dispose();
        parts = null;
        return;
      }
      parts ??= take();
      for (const p of parts) {
        const k = Math.min(1, amount * p.share);
        p.material.color.copy(p.colour).lerp(SOOT, k * 0.9);
        if (p.roughness !== undefined)
          p.material.roughness = p.roughness + (1 - p.roughness) * k;
      }
    },
    dispose() {
      this.set(0);
    },
  };
}
