import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { click, partAudio } from '../audio/part-audio';
import { FLASH_FRAMES, ghostLevel, ghostSeconds } from '../logic/dazzle';

/** The pop of a bright discharge: a sharp report over a low thump. */
const pop = click({
  band: 1400,
  q: 0.6,
  decay: 0.07,
  level: 0.55,
  thump: [110, 0.09],
});

/** An afterimage's radius, as a share of the screen's height. */
const GHOST_RADIUS = 0.11;

/**
 * Being dazzled by a bright discharge (`../logic/dazzle.ts`), drawn over
 * a room's canvas: `flash(at)` pops, whites the view out for a frame or
 * two round where `at` is seen, then leaves a dark, faintly purple
 * afterimage on the screen there (it is on the eye, so it does not move
 * as the player looks about), fading over about seven seconds. Several
 * can be on the eye at once. Under reduced motion the flash is only a
 * soft brightening; the afterimage is the same. Call `update` each frame.
 */
export function createDazzle(
  canvas: HTMLCanvasElement,
  camera: Camera,
  random: () => number = Math.random,
) {
  const layer = document.createElement('div');
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  canvas.parentElement?.append(layer);
  const glare = document.createElement('div');
  Object.assign(glare.style, {
    position: 'absolute',
    inset: '0',
    opacity: '0',
    mixBlendMode: 'screen',
  });
  layer.append(glare);
  const ghosts: {
    element: HTMLDivElement;
    age: number;
    seconds: number;
  }[] = [];
  let frames = 0;
  const seen = new Vector3();
  return {
    /**
     * A discharge at `at` (an object, or a point in the scene): it pops,
     * and dazzles if it is in view. `strength` (0 to 1) sizes it.
     */
    flash(
      at: Object3D | Vector3,
      {
        strength = 1,
        reduced = false,
      }: { strength?: number; reduced?: boolean } = {},
    ) {
      if ('isObject3D' in at) {
        partAudio.play(pop, at);
        at.getWorldPosition(seen);
      } else seen.copy(at);
      seen.project(camera);
      if (seen.z > 1 || Math.abs(seen.x) > 1.2 || Math.abs(seen.y) > 1.2)
        return;
      const x = ((seen.x + 1) / 2) * 100;
      const y = ((1 - seen.y) / 2) * 100;
      glare.style.background = `radial-gradient(circle at ${x}% ${y}%, #ffffff 0%, #f4f8ff 35%, #dfe8ff 100%)`;
      glare.style.opacity = String(reduced ? 0.25 : 0.95 * strength);
      frames = FLASH_FRAMES;
      const element = document.createElement('div');
      const r = GHOST_RADIUS * (0.6 + 0.4 * strength) * 100;
      Object.assign(element.style, {
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${2 * r}vh`,
        height: `${2 * r * (0.8 + 0.2 * random())}vh`,
        transform: `translate(-50%, -50%) rotate(${random() * 180}deg)`,
        borderRadius: '50%',
        background:
          'radial-gradient(closest-side, rgba(14, 6, 24, 0.95), rgba(34, 14, 48, 0.75) 45%, rgba(40, 30, 10, 0.25) 75%, rgba(0, 0, 0, 0) 100%)',
        mixBlendMode: 'multiply',
        filter: 'blur(0.6vh)',
        opacity: '0',
      });
      layer.append(element);
      ghosts.push({ element, age: 0, seconds: ghostSeconds(random) });
    },
    update(delta: number) {
      if (frames > 0 && --frames === 0) glare.style.opacity = '0';
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const ghost = ghosts[i];
        // It shows once the flash has gone.
        if (frames > 0 && ghost === ghosts.at(-1)) continue;
        ghost.age += delta;
        const level = ghostLevel(ghost.age, ghost.seconds);
        ghost.element.style.opacity = level.toFixed(3);
        if (level > 0) continue;
        ghost.element.remove();
        ghosts.splice(i, 1);
      }
    },
    /** Clear the eye at once. */
    clear() {
      frames = 0;
      glare.style.opacity = '0';
      for (const ghost of ghosts) ghost.element.remove();
      ghosts.length = 0;
    },
    dispose() {
      layer.remove();
    },
  };
}
