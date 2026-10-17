import { Box3, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import type { createPortableBoard } from '../game/portable-board';
import { createBoardFall } from '../game/portable-board';

export interface PortableObject {
  component: ReturnType<typeof createPortableBoard>;
  /** Disconnect the electrical component and stop its installed animation. */
  detach(): void;
  flat: 'face' | 'side';
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
) {
  const fixedSupports: SupportSurface[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
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
    { parent: Object3D; portable: PortableObject }
  >();
  const falling = new Map<
    Object3D,
    {
      motion: ReturnType<typeof createBoardFall>;
      from: Quaternion;
      flat: Quaternion;
      centre: Vector3;
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
    const flat = new Quaternion().setFromAxisAngle(
      new Vector3(
        portable.flat === 'side' ? 0 : 1,
        0,
        portable.flat === 'side' ? 1 : 0,
      ),
      portable.flat === 'side' ? Math.PI / 2 : -Math.PI / 2,
    );
    // Measure a centred collision envelope in the final resting orientation.
    const original = object.quaternion.clone();
    object.quaternion.copy(flat);
    object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(object);
    const centre = bounds
      .getCenter(new Vector3())
      .sub(object.position)
      .divideScalar(metre);
    const halfHeight = (bounds.max.y - bounds.min.y) / (2 * metre);
    object.quaternion.copy(original);
    const forward = camera.getWorldDirection(new Vector3());
    const position = object.position.clone().divideScalar(metre).add(centre);
    falling.set(object, {
      motion: createBoardFall(
        position.x,
        position.y,
        position.z,
        forward.x * 0.65 + 0.12,
        forward.z * 0.65,
      ),
      from: original,
      flat,
      centre,
      halfHeight,
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
      if (!found) return false;
      const { object, portable } = found;
      if (!records.has(object))
        records.set(object, { parent: object.parent!, portable });
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
        held || (hit && hit.distance <= 3.2 * metre && portableAt(hit.object)),
      );
    },
    update(dt: number) {
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
        // Only surfaces below the board are eligible, so it cannot teleport onto a plinth from its side.
        const ceiling = previous.y - fall.halfHeight + 0.035;
        fall.motion.step(
          dt,
          (x, z) => {
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
            return ground + fall.halfHeight;
          },
          portable.component.impact,
        );
        object.quaternion
          .copy(fall.from)
          .slerp(fall.flat, Math.min(1, fall.age / 0.32));
        object.position
          .set(
            previous.x - fall.centre.x,
            previous.y - fall.centre.y,
            previous.z - fall.centre.z,
          )
          .multiplyScalar(metre);
        if (previous.settled) {
          object.quaternion.copy(fall.flat);
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
