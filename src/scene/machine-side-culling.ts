import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { MCC_DEPTH, MCC_WIDTH } from './retro-encabulator-mcc';

/** How far beyond its ends the machine's front and back are both in view. */
const END_MARGIN = 0.3;
/** How far beyond its faces before a side is behind the machine for good. */
const FACE_MARGIN = 0.05;

/**
 * Draw only the side of the Encabulator line-up that can be seen: in
 * front of it, its back (the rear enclosure, its panels, service doors
 * and wiring) is not drawn; behind it, its unit doors and everything
 * fitted to them are not. Beside either end, both are. It changes only
 * what is drawn: every part goes on working, and hidden fittings cannot
 * be clicked from where they could not be reached anyway.
 */
export function createMachineSideCulling(machine: Object3D) {
  const rear = machine.getObjectByName('Encabulator rear enclosure') ?? null;
  // Each unit's door (or fixed cover) hangs from its hinge, with every
  // fitting on it; the hinge is named after it (the cover itself may have
  // been merged away with the still meshes).
  const fronts = new Set<Object3D>();
  machine.traverse((object) => {
    if (/^Section \d .* (door|cover) hinge$/.test(object.name))
      fronts.add(object);
  });
  // The raycaster does not honour visibility: a hidden side takes no clicks.
  for (const side of [...fronts, ...(rear ? [rear] : [])])
    side.raycast = () => (side.visible ? undefined : false);
  const eye = new Vector3();
  return {
    /** The doors' hinges it hides from behind, for a test. */
    fronts: [...fronts] as readonly Object3D[],
    rear,
    /** Show the sides the camera can see; call before each render. */
    update(camera: Camera) {
      machine.updateWorldMatrix(true, false);
      camera.getWorldPosition(eye);
      machine.worldToLocal(eye);
      const beside = Math.abs(eye.x) > MCC_WIDTH / 2 + END_MARGIN;
      const inFront = !beside && eye.z > FACE_MARGIN;
      const behind = !beside && eye.z < -MCC_DEPTH - FACE_MARGIN;
      if (rear) rear.visible = !inFront;
      for (const front of fronts) front.visible = !behind;
    },
  };
}
