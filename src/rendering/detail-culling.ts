import { InstancedMesh, Quaternion, Sphere, Vector3 } from 'three';
import type { Camera, Mesh, Object3D } from 'three';

/**
 * Hides detail too small or too far to see. Each registered object (a
 * static mesh) is drawn only while it would look big enough, its
 * bounding sphere's radius over its distance above `minSize` (about 0.7°
 * by default), and only within its `maxDistance`, if it has one (for
 * fine detail, like chain links or wire guards, that would only shimmer).
 * A merged mesh of small pieces (`userData.pieceRadius`, in its own
 * units) is judged by the size of its biggest piece at the nearest point
 * of its sphere, however far its pieces spread. Its threshold is for the
 * view the camera had when the culler was made: zoomed in (a narrower
 * view), smaller things are drawn.
 * Objects may move (a mesh on a door that swings): each sphere is placed
 * by its object's world matrix as it is checked, which must be current
 * (it is, after a frame is drawn), though objects must not change size.
 * Nothing else may show or hide a registered object. `update` is cheap
 * and spread over frames: a slice of the objects is checked each call.
 * Distances are in world units.
 */
export function createDetailCuller(camera: Camera) {
  const entries: {
    object: Object3D;
    /** Its sphere in its own frame, and the radius it has in the world. */
    local: Sphere;
    sphere: Sphere;
    /** How big it looks: its own radius, or its biggest piece's. */
    size: number;
    minSize: number;
    maxDistance: number;
  }[] = [];
  const eye = new Vector3();
  const scale = new Vector3();
  // How much a narrower view than this one magnifies (zoom).
  const lens = camera as Camera & { fov?: number };
  const view = lens.fov;
  const magnification = () =>
    view && lens.fov
      ? Math.tan((view * Math.PI) / 360) / Math.tan((lens.fov * Math.PI) / 360)
      : 1;
  const place = (e: (typeof entries)[number]) =>
    e.sphere.center.copy(e.local.center).applyMatrix4(e.object.matrixWorld);
  let next = 0;
  return {
    add(object: Mesh, { minSize = 0.012, maxDistance = Infinity } = {}) {
      // Its ancestors' matrices too: a freshly added holder may be stale.
      object.updateWorldMatrix(true, false);
      // An instanced mesh has a sphere round all its copies; a mesh, its geometry's.
      let local: Sphere;
      if (object instanceof InstancedMesh) {
        if (!object.boundingSphere) object.computeBoundingSphere();
        local = object.boundingSphere!;
      } else {
        if (!object.geometry.boundingSphere)
          object.geometry.computeBoundingSphere();
        local = object.geometry.boundingSphere!;
      }
      const sphere = local.clone().applyMatrix4(object.matrixWorld);
      object.matrixWorld.decompose(new Vector3(), new Quaternion(), scale);
      const pieces = object.userData.pieceRadius as number | undefined;
      const size =
        pieces === undefined
          ? sphere.radius
          : pieces * Math.max(scale.x, scale.y, scale.z);
      entries.push({ object, local, sphere, size, minSize, maxDistance });
    },
    /** Check a share of the objects against where the camera is now. */
    update(share = 0.25) {
      if (!entries.length) return;
      camera.getWorldPosition(eye);
      const zoom = magnification();
      const count = Math.max(1, Math.ceil(entries.length * share));
      for (let i = 0; i < count; i++) {
        const e = entries[next];
        next = (next + 1) % entries.length;
        place(e);
        const distance = Math.max(
          0.001,
          e.sphere.center.distanceTo(eye) - e.sphere.radius,
        );
        e.object.visible =
          distance < e.maxDistance &&
          (distance <= 0.002 || (e.size * zoom) / distance > e.minSize);
      }
    },
    /** Show everything (for a reflection capture, say). */
    showAll() {
      for (const e of entries) e.object.visible = true;
    },
    count: () => entries.length,
    /** Each object's sphere and whether it is shown, for debugging. */
    inspect: () =>
      entries.map((e) => ({
        name: e.object.parent?.parent?.name ?? '',
        x: e.sphere.center.x,
        y: e.sphere.center.y,
        z: e.sphere.center.z,
        r: e.sphere.radius,
        visible: e.object.visible,
      })),
    hidden: () => entries.filter((e) => !e.object.visible).length,
  };
}
