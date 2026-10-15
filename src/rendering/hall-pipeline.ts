import { NeutralToneMapping, UnsignedByteType } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import { RenderPipeline, WebGPURenderer } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import {
  convertToTexture,
  diffuseColor,
  packNormalToRGB,
  float,
  max,
  metalness,
  mix,
  mrt,
  normalView,
  output,
  pass,
  roughness,
  sample,
  unpackRGBToNormal,
  uniform,
  vec3,
  vec4,
  velocity,
} from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';

/** The most pixels per CSS pixel drawn: sharp on a Retina screen, not wasteful. */
const MAX_PIXEL_RATIO = 2;

/**
 * The Hall's renderer: Three's WebGPURenderer, which draws with WebGPU
 * where the browser has it and falls back to WebGL 2 where it does not.
 * Neutral tone mapping keeps paint colours as painted. `init` must finish
 * before the first frame.
 */
export function createHallRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGPURenderer({ canvas, antialias: false });
  renderer.setPixelRatio(
    Math.min(globalThis.devicePixelRatio ?? 1, MAX_PIXEL_RATIO),
  );
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  // Count a whole frame (every pass), not only the last.
  renderer.info.autoReset = false;
  return renderer;
}

/**
 * The Hall's render pipeline, after Three's node-based post-processing:
 *
 * 1. The scene is drawn once into several targets at once: its colour,
 *    its unlit diffuse colour, its normals, its metalness and roughness,
 *    its depth and its motion.
 * 2. Screen-space global illumination (SSGI) works out the light each
 *    surface gets bounced from the surfaces around it, and the ambient
 *    occlusion where they crowd it, from those targets.
 * 3. Screen-space reflections (SSR) trace the polished floor's (and every
 *    shiny surface's) reflection of what is on screen.
 * 4. Bloom makes the windows, skylights and lamps glare.
 * 5. Temporal reprojection anti-aliasing (TRAA) smooths edges and the
 *    noise of the GI and reflections over frames.
 *
 * `metre` is how many world units make a metre, for the effects' reach.
 */
export function createHallPipeline(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  metre: number,
) {
  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output,
      diffuseMetal: vec4(diffuseColor.rgb, metalness),
      normalRough: vec4(packNormalToRGB(normalView), roughness),
      velocity,
    }),
  );
  // WebGPU allows 32 bytes a pixel across the targets, and counts 8 for
  // each, so the material data shares two: diffuse colour with metalness,
  // the normal with roughness, at eight bits a channel.
  for (const name of ['diffuseMetal', 'normalRough'])
    scenePass.getTexture(name).type = UnsignedByteType;
  const colour = scenePass.getTextureNode('output');
  const diffuse = scenePass.getTextureNode('diffuseMetal');
  const depth = scenePass.getTextureNode('depth');
  const normalColour = scenePass.getTextureNode('normalRough');
  const motion = scenePass.getTextureNode('velocity');
  const normal = sample((uv) => unpackRGBToNormal(normalColour.sample(uv)));

  // Bounced light and occlusion: medium quality, smoothed by TRAA.
  const gi = ssgi(colour, depth, normal, camera);
  gi.sliceCount.value = 2;
  gi.stepCount.value = 8;
  const giStrength = uniform(1);
  const aoStrength = uniform(1);
  const occlusion = mix(float(1), gi.a, aoStrength);
  const lit = vec4(
    colour.rgb.mul(occlusion).add(diffuse.rgb.mul(gi.rgb).mul(giStrength)),
    colour.a,
  );

  // Reflections in everything shiny, the floor above all.
  const reflections = ssr(convertToTexture(lit), depth, normal, {
    // In mirror mode SSR weights a reflection by metalness alone; a polished
    // floor is no metal, so glossy surfaces reflect by their smoothness too.
    metalnessNode: max(diffuse.a, normalColour.a.oneMinus().mul(0.6)),
    roughnessNode: normalColour.a,
    reflectNonMetals: true,
    camera,
  });
  reflections.maxDistance.value = 60 * metre;
  reflections.thickness.value = 0.4 * metre;
  reflections.resolutionScale = 0.5;
  // SSR's alpha is the reflection's length, not its opacity: its colour
  // is already weighted, so it is added.
  const reflected = vec4(lit.rgb.add(reflections.rgb), lit.a);

  // Only what is brighter than white glares: the sky, lamps and sunlit glass.
  const glare = bloom(reflected, 0.15, 0.4, 1.1);
  const final = traa(reflected.add(glare), depth, motion, camera);

  const pipeline = new RenderPipeline(renderer);
  // `?stage=` shows one stage alone, for tuning: colour, gi, ao, lit,
  // reflections, reflected; otherwise the finished frame.
  const stage =
    typeof location === 'undefined'
      ? null
      : new URLSearchParams(location.search).get('stage');
  const stages: Record<string, Node> = {
    colour: colour,
    gi: vec4(gi.rgb, 1),
    ao: vec4(vec3(gi.a), 1),
    lit,
    reflections: vec4(reflections.rgb, 1),
    reflected,
  };
  pipeline.outputNode = (stage && stages[stage]) || final;
  return {
    render() {
      renderer.info.reset();
      pipeline.render();
    },
    /** Bounced light, 0 (none) to 3. */
    setGlobalIllumination(value: number) {
      // SSGI's own scale is generous; 1 on the knob is a natural amount.
      giStrength.value = value * 0.25;
    },
    /** Ambient occlusion, 0 (none) to 1 (full) and beyond. */
    setOcclusion(value: number) {
      aoStrength.value = value;
    },
    /** Reflections' strength, 0 (none) to 2. */
    setReflections(value: number) {
      reflections.intensity.value = value;
    },
    setBloom(value: number) {
      glare.strength.value = value * 0.3;
    },
    dispose() {
      pipeline.dispose();
    },
  };
}

export type HallPipeline = ReturnType<typeof createHallPipeline>;
