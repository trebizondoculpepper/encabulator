import {
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Low-detail caps share one untextured mesh and one draw call. */
export function combineUnletteredKeys(root: Object3D, keys: Mesh[]) {
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const geometries = keys.map((key) => {
    key.geometry.computeBoundingBox();
    const bounds = key.geometry.boundingBox!;
    const size = bounds.getSize(new Vector3());
    const geometry = new BoxGeometry(size.x, size.y, size.z);
    geometry.translate(...bounds.getCenter(new Vector3()).toArray());
    geometry.applyMatrix4(
      new Matrix4().multiplyMatrices(inverse, key.matrixWorld),
    );
    const material = Array.isArray(key.material)
      ? key.material[0]
      : key.material;
    const name = material.name.toLowerCase();
    const color = name.includes('red')
      ? new Color('#b33425')
      : name.includes('grey')
        ? new Color('#63543d')
        : name.includes('black') || name == 'space_bar'
          ? new Color('#292b27')
          : 'color' in material
            ? (material.color as Color)
            : new Color('#292b27');
    const colors: number[] = [];
    for (let i = 0; i < geometry.attributes.position.count; i++)
      colors.push(color.r, color.g, color.b);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geometry;
  });
  const geometry = mergeGeometries(geometries);
  for (const part of geometries) part.dispose();
  if (!geometry) return;
  for (const key of keys) key.removeFromParent();
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
  );
  mesh.name = 'BBC keyboard — unlettered';
  root.add(mesh);
  return mesh;
}
