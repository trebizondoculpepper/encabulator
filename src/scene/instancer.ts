import {
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';

/**
 * Collects copies of a few parts (a geometry with a material each) by
 * transform, and builds one instanced mesh per part: hundreds of duct
 * sections or floor stripes in a handful of draw calls.
 */
export function createInstancer() {
  const parts: {
    geometry: BufferGeometry;
    material: Material;
    matrices: Matrix4[];
  }[] = [];
  const euler = new Euler();
  const q = new Quaternion();
  return {
    /** Declare a part; `put` places copies of it. */
    part(geometry: BufferGeometry, material: Material) {
      const entry = { geometry, material, matrices: [] as Matrix4[] };
      parts.push(entry);
      return entry;
    },
    /** A copy of `entry` at (x, y, z), turned (rx, ry, rz) and scaled (sx, sy, sz). */
    put(
      entry: { matrices: Matrix4[] },
      x: number,
      y: number,
      z: number,
      sx = 1,
      sy = 1,
      sz = 1,
      rx = 0,
      ry = 0,
      rz = 0,
    ) {
      q.setFromEuler(euler.set(rx, ry, rz, 'YXZ'));
      entry.matrices.push(
        new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz)),
      );
    },
    build(group: Group) {
      for (const entry of parts) {
        if (!entry.matrices.length) continue;
        const mesh = new InstancedMesh(
          entry.geometry,
          entry.material,
          entry.matrices.length,
        );
        entry.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
      }
    },
    dispose() {
      for (const entry of parts) entry.geometry.dispose();
    },
  };
}
