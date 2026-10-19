import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { beginPart } from './parts';
import type { PanelKit } from '../views/eighties-controls';
import { createShortSpark } from '../views/button-effects';
import { discharge } from '../views/dazzle';
import { click, partAudio } from '../audio/part-audio';

/** The consequence of making or breaking a live contact, never an interlock. */
export function liveContact(kit: PanelKit) {
  const a = beginPart(kit, 'Live connection discharge');
  const spark = createShortSpark(kit, 14);
  spark.group.scale.setScalar(3);
  spark.group.visible = false;
  a.object.add(spark.group);
  a.object.userData.live = true;
  const position = new Vector3();
  const crack = click({ band: 3200, q: 0.7, decay: 0.09, level: 0.35 });
  const crackle = click({ band: 4200, q: 0.9, decay: 0.05, level: 0.18 });
  let followUps: number[] = [];
  a.updates.push((delta) => {
    followUps = followUps.map((wait) => wait - delta);
    while (followUps.length && followUps[0] <= 0) {
      followUps.shift();
      spark.fire();
      partAudio.play(crackle, a.object);
    }
    spark.update(
      delta,
      typeof window !== 'undefined' &&
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
          false),
    );
  });
  return {
    ...a.part(),
    fire(at: Object3D) {
      at.getWorldPosition(position);
      a.object.position.copy(position);
      a.object.parent?.worldToLocal(a.object.position);
      spark.fire();
      partAudio.play(crack, a.object);
      discharge(a.object);
      followUps = [];
      let wait = 0;
      for (let n = Math.floor(Math.random() * 4); n > 0; n--)
        followUps.push((wait += 0.12 + Math.random() * 0.45));
    },
  };
}
