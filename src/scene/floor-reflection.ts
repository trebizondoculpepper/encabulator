import { AdditiveBlending, Color, PlaneGeometry } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/**
 * The shine of a polished floor: a planar mirror laid just over it that
 * renders the room reflected, softened a little (polished concrete is not
 * a mirror) and added on top of the floor's own lit colour, so the bright
 * things (windows, skylights, lamps) leave highlights in it and dark
 * things leave nothing. Like any polished surface it reflects little seen
 * from above and much more at a grazing angle (Schlick's Fresnel), so the
 * highlights move and grow as you walk.
 *
 * `width` by `depth` in scene units; it lies in the x-z plane.
 */
export function createFloorReflection(width: number, depth: number) {
  const reflector = new Reflector(new PlaneGeometry(width, depth), {
    textureWidth: 1024,
    textureHeight: 1024,
    clipBias: 0.001,
    multisample: 0,
    color: new Color('#ffffff'),
    shader: {
      name: 'PolishedFloor',
      uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        strength: { value: 0.6 },
        blur: { value: 0.0025 },
      },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform float blur;
        varying vec4 vUv;
        varying vec3 vWorld;
        void main() {
          vec2 uv = vUv.xy / vUv.w;
          // A small blur: polished, not mirrored.
          vec3 sum = vec3(0.0);
          float total = 0.0;
          for (int x = -2; x <= 2; x++)
            for (int y = -2; y <= 2; y++) {
              float w = 1.0 / (1.0 + float(x * x + y * y));
              sum += texture2D(tDiffuse, uv + vec2(float(x), float(y)) * blur).rgb * w;
              total += w;
            }
          vec3 reflected = sum / total;
          // Schlick: about 4% straight down, all of it at grazing.
          vec3 view = normalize(cameraPosition - vWorld);
          float facing = clamp(view.y, 0.0, 1.0);
          float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
          gl_FragColor = vec4(reflected * strength * (0.25 + 0.75 * fresnel), 1.0);
        }`,
    },
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.name = 'Floor shine';
  const material = reflector.material as unknown as {
    blending: number;
    transparent: boolean;
    depthWrite: boolean;
    uniforms: { strength: { value: number }; blur: { value: number } };
  };
  material.blending = AdditiveBlending;
  material.transparent = true;
  material.depthWrite = false;
  return {
    mesh: reflector,
    /** How strongly the floor reflects, 0 to 2. */
    setStrength(value: number) {
      material.uniforms.strength.value = value;
      reflector.visible = value > 0.001;
    },
    /** How soft the reflection is, 0 (a mirror) to 1. */
    setBlur(value: number) {
      material.uniforms.blur.value = 0.0005 + value * 0.006;
    },
    setSize(width: number, height: number) {
      reflector.getRenderTarget().setSize(width, height);
    },
    dispose() {
      reflector.dispose();
    },
  };
}
