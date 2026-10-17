import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPortableBoard } from '../game/portable-board';
import { click, partAudio } from '../audio/part-audio';
import { boardImpact, boardScrape } from '../audio/board-impact';
import { createSmokeEmitter } from '../scene/smoke-emitter';
import type { beginPart } from './parts';
import type { PortableObject } from './object-handling';

/** The part owns its pickup/impact sounds and dust; input is shared first-person use. */
export function makeBoardPortable(
  a: ReturnType<typeof beginPart>,
  detach: () => void,
  flat: PortableObject['flat'] = 'side',
) {
  const component = createPortableBoard();
  const dust = createSmokeEmitter(2, '157, 148, 127');
  dust.group.visible = false;
  let puffAge = 1;
  let dustParent: Object3D | null = null;
  const position = new Vector3(),
    scale = new Vector3();
  a.voice(component, {
    'pick-up': click({ band: 1600, q: 1.5, decay: 0.04, level: 0.14 }),
    impact: () =>
      boardImpact(component.impactSpeed.value, component.impacts.value),
  });
  component.onEvent((event) => {
    if (event !== 'impact') return;
    if (component.impacts.value === 1 && component.slipSpeed.value > 0.05)
      partAudio.play(boardScrape(component.slipSpeed.value), a.object);
    a.object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(a.object);
    bounds.getCenter(position);
    position.y = bounds.min.y + 0.008;
    a.object.getWorldScale(scale);
    dustParent = a.object.parent;
    if (dustParent) {
      dustParent.add(dust.group);
      dust.group.position.copy(position);
      dust.group.scale.copy(scale);
      dust.group.visible = true;
      puffAge = 0;
    }
  });
  a.updates.push((dt) => {
    puffAge += dt;
    dust.group.visible = puffAge < 0.5;
    if (dust.group.visible)
      dust.update(
        puffAge * 2,
        (1 - puffAge / 0.5) * 0.8,
        typeof window !== 'undefined' &&
          (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
            false),
      );
  });
  a.disposers.push(() => {
    component.dispose();
    dust.group.removeFromParent();
    dust.dispose();
  });
  a.object.userData.manufacturer = 'Pepperdyne';
  a.object.userData.portable = {
    component,
    flat,
    detach,
  } satisfies PortableObject;
  return component;
}
