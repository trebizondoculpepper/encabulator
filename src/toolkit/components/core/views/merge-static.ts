import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Flatten a static set piece built from many small meshes into a few: all
 * its meshes in the same material within the same `cell` (metres, in its
 * own frame) become one mesh. A drum fan of a hundred parts draws in three
 * or four calls; an office's furniture draws desk by desk rather than
 * part by part, so a distant desk can still be culled on its own. Meshes
 * listed in `keep` (things a click works, or that move) are left alone,
 * as are instanced meshes and sprites. Works in place on `root`; returns
 * the merged meshes. `root`'s world matrix must be current.
 */
export function mergeStatic(
  root: Object3D,
  cell = 3,
  keep: ReadonlySet<Object3D> = new Set(),
) {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<
    string,
    { material: Material; parts: BufferGeometry[] }
  >();
  const originals: Mesh[] = [];
  const kept = (mesh: Object3D) => {
    for (let o: Object3D | null = mesh; o && o !== root; o = o.parent)
      if (keep.has(o)) return true;
    return false;
  };
  const centre = new Vector3();
  const ids = new Map<Material, number>();
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object instanceof InstancedMesh) return;
    if (Array.isArray(object.material) || kept(object)) return;
    const material = object.material as Material;
    const geometry = (object.geometry as BufferGeometry).clone();
    geometry.applyMatrix4(
      new Matrix4().multiplyMatrices(toRoot, object.matrixWorld),
    );
    // Keep only what every part has, so they can be merged.
    for (const name of Object.keys(geometry.attributes))
      if (!['position', 'normal', 'uv'].includes(name))
        geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) return;
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.computeBoundingSphere();
    centre.copy(flat.boundingSphere!.center);
    if (!ids.has(material)) ids.set(material, ids.size);
    const key = `${ids.get(material)}|${Math.floor(centre.x / cell)},${Math.floor(centre.y / cell)},${Math.floor(centre.z / cell)}`;
    let entry = groups.get(key);
    if (!entry) groups.set(key, (entry = { material, parts: [] }));
    entry.parts.push(flat);
    originals.push(object);
  });
  for (const mesh of originals) mesh.parent?.remove(mesh);
  const merged: Mesh[] = [];
  const holder = new Group();
  holder.name = 'Merged';
  for (const { material, parts } of groups.values()) {
    const geometry =
      parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.userData.noCollision = true;
    holder.add(mesh);
    merged.push(mesh);
    if (parts.length > 1) for (const p of parts) p.dispose();
  }
  root.add(holder);
  return merged;
}
