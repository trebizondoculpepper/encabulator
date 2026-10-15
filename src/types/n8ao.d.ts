/** N8AO (https://github.com/N8python/n8ao) ships no types; what we use of it. */
declare module 'n8ao' {
  import type { Camera, Color, Scene } from 'three';
  import type { Pass } from 'three/addons/postprocessing/Pass.js';

  export interface N8AOConfiguration {
    /** How far, in world units, the occlusion reaches. */
    aoRadius: number;
    /** How quickly occlusion fades with depth difference, in world units. */
    distanceFalloff: number;
    intensity: number;
    color: Color;
    halfRes: boolean;
    depthAwareUpsampling: boolean;
    screenSpaceRadius: boolean;
    gammaCorrection: boolean;
    transparencyAware: boolean;
    aoSamples: number;
    denoiseSamples: number;
    denoiseRadius: number;
  }

  /** An ambient occlusion pass for three's EffectComposer: renders the scene itself. */
  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: N8AOConfiguration;
    setQualityMode(
      mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra',
    ): void;
    setSize(width: number, height: number): void;
  }
}
