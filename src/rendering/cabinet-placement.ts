import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  Vector2,
} from 'three';
import type { Camera, Object3D, Vector3 } from 'three';
import type { PortableObject } from '../toolkit/controls/input/object-handling';

export interface CabinetSocket {
  home: Object3D;
  position: Vector3;
  width: number;
  height: number;
  accepts(object: Object3D): boolean;
  place(object: Object3D): boolean;
}

/** One socket decision drives both the cursor and the shared use action. */
export function createCabinetPlacement(
  root: Object3D,
  camera: Camera,
  sockets: readonly CabinetSocket[],
  metre: number,
) {
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const targets = sockets.map((socket) => {
    const target = new Mesh(
      new PlaneGeometry(socket.width, socket.height),
      material,
    );
    target.name = 'Cabinet insertion target';
    target.position.copy(socket.position);
    target.visible = false;
    socket.home.add(target);
    return target;
  });
  const ray = new Raycaster();
  const point = new Vector2();
  const within = (object: Object3D, parent: Object3D) => {
    for (let at: Object3D | null = object; at; at = at.parent)
      if (at === parent) return true;
    return false;
  };
  const shown = (object: Object3D | null) => {
    for (let at = object; at; at = at.parent) if (!at.visible) return false;
    return true;
  };
  const aimed = (held: Object3D, x: number, y: number) => {
    root.updateWorldMatrix(true, true);
    camera.updateWorldMatrix(true, false);
    ray.setFromCamera(point.set(x, y), camera);
    const hit = ray
      .intersectObjects(targets, false)
      .find((hit) => shown(hit.object.parent));
    if (!hit || hit.distance > 3.2 * metre) return null;
    const socket =
      sockets[targets.findIndex((target) => target === hit.object)];
    const blocker = ray
      .intersectObject(root, true)
      .find(
        (other) =>
          shown(other.object) &&
          !within(other.object, held) &&
          !other.object.userData.noCollision,
      );
    if (
      blocker &&
      blocker.distance < hit.distance - 0.001 * metre &&
      !within(blocker.object, socket.home)
    )
      return null;
    return socket;
  };
  return {
    targetFeedback(
      object: Object3D,
      _portable: PortableObject,
      x: number,
      y: number,
    ) {
      const socket = aimed(object, x, y);
      return socket
        ? socket.accepts(object)
          ? ('accept' as const)
          : ('reject' as const)
        : null;
    },
    heldAction(
      object: Object3D,
      _portable: PortableObject,
      x: number,
      y: number,
    ): boolean | 'refuse' {
      const socket = aimed(object, x, y);
      if (!socket) return false;
      if (!socket.accepts(object)) return 'refuse';
      return socket.place(object) || 'refuse';
    },
    dispose() {
      for (const target of targets) {
        target.removeFromParent();
        target.geometry.dispose();
      }
      material.dispose();
    },
  };
}
