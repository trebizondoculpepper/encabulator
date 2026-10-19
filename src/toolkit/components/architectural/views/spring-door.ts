import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/** The leaf's width and height, and the frame's opening, metres. */
export const SPRING_LEAF = { width: 0.926, height: 2.04, thickness: 0.044 };
export const SPRING_OPENING = { width: 1.0, height: 2.1 };

/**
 * A double-action spring door, a placeholder after a common UK corridor
 * door: a 926 × 2040 mm timber leaf (a pale beech veneer) hung in a
 * painted steel frame on a floor spring, so it swings either way; a tall,
 * narrow vision panel of wired, frosted glass, stainless push plates and
 * kick plates on both faces. Its face at z = 0, the floor at y = 0; the
 * leaf turns about its hinge edge (`set(angle)`, radians, either way).
 */
export function createSpringDoorView(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#5d6467', 0.45, 0.3);
  const { width, height } = SPRING_OPENING;
  for (const x of [-width / 2 - 0.03, width / 2 + 0.03])
    t.box(group, frame, 0.06, height + 0.06, 0.14, x, (height + 0.06) / 2, 0);
  t.box(group, frame, width + 0.12, 0.06, 0.14, 0, height + 0.03, 0);
  const pivot = new Group();
  pivot.position.set(-SPRING_LEAF.width / 2, 0, 0);
  // It swings: not merged with the still parts.
  pivot.userData.live = true;
  group.add(pivot);
  const leaf = new Group();
  leaf.position.x = SPRING_LEAF.width / 2;
  pivot.add(leaf);
  const timber = kitPaint(kit, '#c9a978', 0.55);
  const slab = t.box(
    leaf,
    timber,
    SPRING_LEAF.width,
    SPRING_LEAF.height,
    SPRING_LEAF.thickness,
    0,
    SPRING_LEAF.height / 2 + 0.01,
    0,
  );
  const glass = t.paint('#cfd8d8', 0.2, 0.1);
  const steel = t.paint('#c4c8c8', 0.25, 0.85);
  for (const face of [-1, 1]) {
    const z = (face * (SPRING_LEAF.thickness + 0.002)) / 2;
    t.box(leaf, glass, 0.15, 0.75, 0.004, 0.18, 1.45, z);
    t.box(leaf, steel, 0.075, 0.3, 0.003, 0.3, 1.1, z);
    t.box(leaf, steel, SPRING_LEAF.width - 0.04, 0.15, 0.003, 0, 0.09, z);
  }
  return {
    group,
    /** What a use pushes. */
    leaf: slab,
    set(angle: number) {
      pivot.rotation.y = angle;
    },
  };
}
