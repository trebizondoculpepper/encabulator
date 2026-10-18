import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material } from 'three';

/** How much floor a stack of chairs takes, metres either side of its middle. */
export const CHAIR_STACK_HALF = 0.3;

/**
 * A stack of training-room chairs, `count` high: blue fabric seats and
 * backs on black shells, chrome legs, each chair nested 75 mm above the
 * one below, as the training room keeps them (no more than eight, its
 * notice says). Its origin is on the floor under the middle of the stack;
 * the backs are towards -z. Metres. The paints are the caller's, so a
 * room can share or merge them.
 */
export function createChairStack(
  count: number,
  paint: { fabric: Material; shell: Material; chrome: Material },
) {
  const stack = new Group();
  stack.name = 'Stack of chairs';
  const box = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    stack.add(mesh);
    return mesh;
  };
  const leg = (h: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(
      new CylinderGeometry(0.011, 0.011, h, 8),
      paint.chrome,
    );
    mesh.position.set(x, y, z);
    stack.add(mesh);
    return mesh;
  };
  for (let i = 0; i < count; i++) {
    const y = 0.45 + i * 0.075;
    box(paint.fabric, 0.46, 0.05, 0.44, 0, y, 0);
    const back = box(paint.fabric, 0.44, 0.34, 0.04, 0, y + 0.3, -0.23);
    back.rotation.x = -0.12;
    box(paint.shell, 0.47, 0.012, 0.45, 0, y - 0.03, 0);
    for (const sx of [-0.21, 0.21]) {
      leg(0.47, sx, y - 0.24, 0.19);
      const rear = leg(0.82, sx, y + 0.02, -0.22);
      rear.rotation.x = 0.1;
    }
  }
  return stack;
}
