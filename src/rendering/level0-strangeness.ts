import { Mesh, MeshBasicMaterial, PlaneGeometry, Scene } from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { effectFrame, settingsForActivity } from '../game/effect-settings';
import { createGhosting } from '../game/ghosting';
import {
  createHallucinations,
  defaultHallucinationSettings,
} from '../game/hallucination';
import type { Viewer } from '../game/hallucination';
import { strangeness } from '../game/level0-strangeness';
import { createPatterns } from '../game/patterns';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import { createApparitionImage } from './apparition-image';
import { createGhostOverlay } from './ghost-overlay';
import { createPatternOverlay } from './pattern-overlay';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Level 0's strangeness, drawn: dev1's colour channels, π drift and warp
 * through the shared material uniforms, and dev2's ghosting, geometric
 * patterns and apparitions over the room, each as strong as
 * `src/game/level0-strangeness.ts` says for the machine's strain. It
 * takes over the room's render (`render`), in dev2's order, and puts the
 * shared uniforms back when the room is left (`normal`).
 */
export function createLevel0Strangeness({
  renderer,
  scene,
  camera,
  metre,
  pose,
  fits,
}: {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  metre: number;
  /** The player: where they stand, metres, and which way they look. */
  pose: () => { x: number; z: number; yaw: number; pitch: number };
  /** Where an apparition could stand, metres. */
  fits: (x: number, z: number) => boolean;
}) {
  const m = metre;
  const hallucinations = createHallucinations({
    ...defaultHallucinationSettings(),
    perMinute: 0,
  });
  const ghosting = createGhosting();
  const echoes = createGhostOverlay(renderer);
  const patterns = createPatterns();
  const patternOverlay = createPatternOverlay(renderer, patterns);
  const image = createApparitionImage();
  const apparitionGeometry = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const visions = new Scene();
  const shown = new Map<number, Mesh<PlaneGeometry, MeshBasicMaterial>>();
  const aspect = () => {
    const picture = image.image as { width: number; height: number };
    return picture.width / picture.height;
  };
  const viewer = (): Viewer => {
    const p = pose();
    return {
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      halfWidth: Math.atan(
        Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.aspect,
      ),
    };
  };
  const showApparitions = () => {
    const alive = new Set<number>();
    for (const apparition of hallucinations.apparitions) {
      alive.add(apparition.id);
      let mesh = shown.get(apparition.id);
      if (!mesh) {
        mesh = new Mesh(
          apparitionGeometry,
          new MeshBasicMaterial({
            map: image,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        mesh.renderOrder = 10;
        shown.set(apparition.id, mesh);
        visions.add(mesh);
      }
      const height = hallucinations.settings.size * m;
      mesh.scale.set(height * aspect(), height, 1);
      mesh.position.set(apparition.x * m, 0, apparition.z * m);
      mesh.rotation.y = -pose().yaw;
      mesh.material.opacity = Math.max(0, apparition.opacity);
    }
    for (const [id, mesh] of shown)
      if (!alive.has(id)) {
        visions.remove(mesh);
        mesh.material.dispose();
        shown.delete(id);
      }
  };
  let seconds = 0;
  let take: number | null = null;
  /** Put the shared uniforms back as every other room expects them. */
  const normal = () => {
    ps1Uniforms.channels.value.set(1, 1, 1);
    ps1Uniforms.warp.value = 0;
    ps1Uniforms.pi.value = Math.PI;
  };
  return {
    /** How strange it is now. */
    level: strangeness(0, false),
    /** Advance with the machine's strain, and whether it has broken down. */
    update(delta: number, strain: number, brokenDown: boolean) {
      seconds += delta;
      const now = strangeness(strain, brokenDown);
      this.level = now;
      // dev1: colour channels, π and warp, through every material.
      const frame = effectFrame(settingsForActivity(now.activity), seconds);
      ps1Uniforms.channels.value.set(...frame.channels);
      ps1Uniforms.warp.value = reducedMotion() ? 0 : frame.warp;
      ps1Uniforms.warpTwist.value.set(...frame.twist);
      ps1Uniforms.warpSwell.value.set(...frame.swell);
      ps1Uniforms.warpField.value.set(0, 0, 0, 0);
      ps1Uniforms.pi.value = frame.pi;
      // dev2: ghosting, patterns and apparitions.
      ghosting.settings.strength = now.ghosting;
      patterns.settings.strength = now.patterns;
      hallucinations.settings.perMinute = now.apparitionsPerMinute;
      const normal =
        now.activity === 0 &&
        now.ghosting === 0 &&
        now.patterns === 0 &&
        now.apparitionsPerMinute === 0;
      if (brokenDown || normal) {
        // Normality, however it comes: whatever was showing goes at once,
        // the burnt-in ghosts of earlier frames with it.
        ghosting.ghosts.length = 0;
        hallucinations.apparitions.length = 0;
      }
      patterns.step(delta);
      hallucinations.step(delta, viewer(), Math.random, fits);
      showApparitions();
      take = ghosting.step(delta, pose()).take;
    },
    /** Draw the room, with whatever strangeness there is, as dev2 does. */
    render() {
      const drawRoom = () => renderer.render(scene, camera);
      const drawVisions = () => {
        if (!shown.size) return;
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.render(visions, camera);
        renderer.autoClear = autoClear;
      };
      if (take !== null) {
        drawRoom();
        drawVisions();
        echoes.take(take);
      }
      if (take === null || patterns.showing) {
        drawRoom();
        if (patterns.showing) patternOverlay.draw();
        drawVisions();
      }
      echoes.draw(ghosting.ghosts);
      echoes.keep(ghosting.inUse());
    },
    normal,
    dispose() {
      normal();
      echoes.dispose();
      patternOverlay.dispose();
      for (const mesh of shown.values()) mesh.material.dispose();
      apparitionGeometry.dispose();
      image.dispose();
    },
  };
}
