import {
  Box3,
  Matrix4,
  Mesh,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { assertDropProfile } from '../game/drop-profile';
import type { Object3D, PerspectiveCamera } from 'three';
import type { createPortableBoard } from '../game/portable-board';
import { createBoardFall } from '../game/portable-board';

export interface PortableObject {
  component: ReturnType<typeof createPortableBoard>;
  /** Disconnect the electrical component and stop its installed animation. */
  detach(): void;
  flat: 'face' | 'side' | 'upright';
}
export interface SupportSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

/** Shared first-person use behaviour, with no input bindings of its own. */
export function createObjectHandling(
  root: Object3D,
  camera: PerspectiveCamera,
  metre: number,
  floorY: number,
  supports: () => readonly SupportSurface[] = () => [],
  /**
   * A room's chance to take a released object itself (a toss into a bin):
   * return true and the object is the room's to move; it is not dropped.
   */
  divert?: (object: Object3D, portable: PortableObject) => boolean,
) {
  const fixedSupports: SupportSurface[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (object.userData.portable)
      assertDropProfile(
        (object.userData.portable as PortableObject).component.dropProfile,
      );
    if (!object.userData.boardSupport) return;
    const bounds = new Box3().setFromObject(object);
    fixedSupports.push({
      minX: bounds.min.x / metre,
      maxX: bounds.max.x / metre,
      minZ: bounds.min.z / metre,
      maxZ: bounds.max.z / metre,
      top: bounds.max.y / metre,
    });
  });
  const ray = new Raycaster(),
    point = new Vector2();
  const records = new Map<
    Object3D,
    {
      parent: Object3D;
      portable: PortableObject;
      position: Vector3;
      rotation: Quaternion;
      scale: Vector3;
    }
  >();
  const falling = new Map<
    Object3D,
    {
      motion: ReturnType<typeof createBoardFall>;
      from: Quaternion;
      flat: Quaternion;
      centre: Vector3;
      size: Vector3;
      axis: Vector3;
      halfHeight: number;
      age: number;
    }
  >();
  let held: {
    object: Object3D;
    grab: Vector3;
    offset: Vector3;
    rotation: Quaternion;
  } | null = null;
  const cameraRotation = new Quaternion();
  const worldRotation = new Quaternion();
  const worldPosition = new Vector3();
  const portableAt = (
    object: Object3D,
  ): { object: Object3D; portable: PortableObject } | null => {
    for (let o: Object3D | null = object; o; o = o.parent) {
      if (o.userData.portable)
        return { object: o, portable: o.userData.portable as PortableObject };
    }
    return null;
  };
  const hitAt = (x: number, y: number) => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    ray.setFromCamera(point.set(x, y), camera);
    return ray
      .intersectObject(root, true)
      .find((hit) => hit.object.visible && !hit.object.userData.noCollision);
  };
  const release = () => {
    if (!held) return;
    const { object } = held;
    const portable = records.get(object)!.portable;
    portable.component.drop();
    if (divert?.(object, portable)) {
      held = null;
      return;
    }
    const profile = portable.component.dropProfile;
    assertDropProfile(profile);
    const forward = camera.getWorldDirection(new Vector3());
    const vx = forward.x * 0.65 + 0.12;
    const vz = forward.z * 0.65;
    const axis = new Vector3(vz, 0, -vx).normalize();
    if (axis.lengthSq() === 0) axis.set(1, 0, 0);
    const flat =
      portable.flat === 'upright'
        ? new Quaternion()
        : new Quaternion().setFromAxisAngle(
            portable.flat === 'side'
              ? new Vector3(0, 0, 1)
              : new Vector3(1, 0, 0),
            portable.flat === 'side' ? Math.PI / 2 : -Math.PI / 2,
          );
    if (profile.shape === 'round')
      flat.setFromUnitVectors(
        new Vector3(
          profile.rollAxis === 'x' ? 1 : 0,
          profile.rollAxis === 'y' ? 1 : 0,
          profile.rollAxis === 'z' ? 1 : 0,
        ),
        axis,
      );
    // Bounds in the object's own frame, independent of where it was grabbed.
    object.updateMatrixWorld(true);
    const inverse = object.matrixWorld.clone().invert();
    const bounds = new Box3();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        bounds.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    const centre = bounds
      .getCenter(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const size = bounds
      .getSize(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const original = object.quaternion.clone();
    const position = object.position
      .clone()
      .divideScalar(metre)
      .add(centre.clone().applyQuaternion(original));
    falling.set(object, {
      motion: createBoardFall(
        position.x,
        position.y,
        position.z,
        vx,
        vz,
        profile,
      ),
      from: original,
      flat,
      centre,
      size,
      axis,
      halfHeight: size.y / 2,
      age: 0,
    });
    held = null;
  };
  return {
    use(x: number, y: number) {
      if (held) {
        release();
        return true;
      }
      const hit = hitAt(x, y);
      if (!hit || hit.distance > 3.2 * metre) return false;
      const found = portableAt(hit.object);
      if (!found || !found.portable.component.canPickUp.value) return false;
      const { object, portable } = found;
      if (!records.has(object))
        records.set(object, {
          parent: object.parent!,
          portable,
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
          scale: object.scale.clone(),
        });
      assertDropProfile(portable.component.dropProfile);
      portable.component.pickUp();
      portable.detach();
      root.attach(object);
      falling.delete(object);
      object.updateMatrixWorld(true);
      camera.getWorldQuaternion(cameraRotation);
      held = {
        object,
        grab: camera.worldToLocal(hit.point.clone()),
        offset: object.worldToLocal(hit.point.clone()),
        rotation: cameraRotation
          .clone()
          .invert()
          .multiply(object.getWorldQuaternion(new Quaternion())),
      };
      return true;
    },
    aimed() {
      const hit = hitAt(0, 0);
      return Boolean(
        held ||
        (hit &&
          hit.distance <= 3.2 * metre &&
          portableAt(hit.object)?.portable.component.canPickUp.value),
      );
    },
    update(dt: number) {
      // Only dev0 requests a model reset; ordinary drops never reattach themselves.
      for (const [object, record] of records) {
        if (record.portable.component.phase.value !== 'installed') continue;
        record.parent.add(object);
        object.position.copy(record.position);
        object.quaternion.copy(record.rotation);
        object.scale.copy(record.scale);
        falling.delete(object);
        if (held?.object === object) held = null;
        records.delete(object);
      }
      if (held) {
        camera.getWorldQuaternion(cameraRotation);
        worldRotation.copy(cameraRotation).multiply(held.rotation);
        held.object.quaternion.copy(worldRotation);
        worldPosition
          .copy(held.offset)
          .multiply(held.object.scale)
          .applyQuaternion(worldRotation);
        held.object.position
          .copy(camera.localToWorld(held.grab.clone()))
          .sub(worldPosition);
      }
      for (const [object, fall] of falling) {
        const portable = records.get(object)!.portable;
        fall.age += dt;
        const previous = fall.motion.body;
        const profile = portable.component.dropProfile;
        const rotate = () => {
          if (profile.shape === 'flat') {
            object.quaternion
              .copy(fall.from)
              .slerp(fall.flat, Math.min(1, fall.age / 0.32));
          } else {
            let angle = previous.angle;
            if (profile.shape === 'box') {
              const speed = Math.hypot(previous.vx, previous.vz);
              const snap = previous.grounded ? Math.max(0, 1 - speed / 0.2) : 0;
              angle +=
                ((Math.round(angle / (Math.PI / 2)) * Math.PI) / 2 - angle) *
                snap;
              // Box corners turn about a principal axis and finish on a face.
              object.quaternion
                .setFromAxisAngle(new Vector3(0, 0, 1), angle)
                .multiply(fall.flat);
            } else {
              object.quaternion
                .setFromAxisAngle(fall.axis, -angle)
                .multiply(fall.flat);
            }
            if (fall.age < 0.25) {
              const target = object.quaternion.clone();
              object.quaternion.copy(fall.from).slerp(target, fall.age / 0.25);
            }
          }
          const box = new Box3()
            .setFromCenterAndSize(new Vector3(), fall.size)
            .applyMatrix4(
              new Matrix4().makeRotationFromQuaternion(object.quaternion),
            );
          return box.getSize(new Vector3()).y / 2;
        };
        const height = rotate();
        // Never teleport onto a support from its side.
        const ceiling = previous.y - fall.halfHeight + 0.035;
        const groundAt = (x: number, z: number) => {
          let ground = floorY / metre;
          for (const surface of [...fixedSupports, ...supports()])
            if (
              surface.top <= ceiling &&
              x >= surface.minX &&
              x <= surface.maxX &&
              z >= surface.minZ &&
              z <= surface.maxZ
            )
              ground = Math.max(ground, surface.top);
          return ground;
        };
        fall.motion.step(
          dt,
          (x, z) => groundAt(x, z) + height,
          portable.component.impact,
        );
        fall.halfHeight = rotate();
        if (previous.grounded)
          previous.y = groundAt(previous.x, previous.z) + fall.halfHeight;
        const offset = fall.centre.clone().applyQuaternion(object.quaternion);
        object.position
          .set(
            previous.x - offset.x,
            previous.y - offset.y,
            previous.z - offset.z,
          )
          .multiplyScalar(metre);
        portable.component.motion(
          Math.hypot(previous.vx, previous.vz),
          previous.grounded,
        );
        if (previous.settled) {
          portable.component.settle();
          falling.delete(object);
        }
      }
    },
    dispose() {
      for (const [object, record] of records) record.parent.attach(object);
      records.clear();
      falling.clear();
      held = null;
    },
  };
}
