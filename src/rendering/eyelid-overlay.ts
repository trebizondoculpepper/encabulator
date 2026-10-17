import {
  FramebufferTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { WebGLRenderer } from 'three';

/**
 * A blink as it is seen from inside, drawn over the frame just rendered:
 * not two eyelids but one view closing, as the two eyes are seen as one.
 *
 * The upper lid does most of the closing: a dark edge comes down from the
 * top, across the whole view, the lower lid rising a little to meet it a
 * little below the middle. A lid is far too near the eye to be in focus,
 * so its edge is broad and soft, gently curved, with the lashes a darker
 * blur along it, and the light dims as the eyes close, before the lids
 * reach the middle. Shut, the view is not black but the dull red-brown of
 * light through skin. Haze blurs, dims and warms what is seen through
 * the opening, for eyes still full of sleep.
 *
 * The copied frame is already as the screen shows it, so the shader
 * passes it through unconverted (as `ghost-overlay.ts` does).
 */
export function createEyelidOverlay(renderer: WebGLRenderer) {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const size = new Vector2();
  let frame: FramebufferTexture | null = null;
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: null },
      open: { value: 1 },
      haze: { value: 0 },
      aspect: { value: 1 },
      texel: { value: new Vector2() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float open;
      uniform float haze;
      uniform float aspect;
      uniform vec2 texel;
      varying vec2 vUv;

      // A disc of taps, golden-angle spaced, for an out-of-focus blur.
      vec3 blurred(vec2 uv, float radius) {
        vec3 sum = texture2D(map, uv).rgb;
        float total = 1.0;
        for (int i = 1; i <= 24; i++) {
          float r = sqrt(float(i) / 24.0) * radius;
          float a = float(i) * 2.39996;
          vec2 at = uv + vec2(cos(a), sin(a)) * r * texel;
          sum += texture2D(map, at).rgb;
          total += 1.0;
        }
        return sum / total;
      }

      void main() {
        float shut = 1.0 - open;
        // What is seen: blurred and dimmed by haze, and by the lids' own
        // shadow as they close.
        float radius = haze * 14.0 + shut * 6.0;
        vec3 seen = radius > 0.5 ? blurred(vUv, radius) : texture2D(map, vUv).rgb;
        float grey = dot(seen, vec3(0.299, 0.587, 0.114));
        seen = mix(seen, vec3(grey) * vec3(1.06, 0.98, 0.9), haze * 0.45);
        vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
        float vignette = 1.0 - haze * 0.75 * smoothstep(0.25, 0.85, length(c));
        seen *= vignette * (1.0 - 0.35 * haze) * (1.0 - 0.55 * shut);

        // The lids. Where their edges are, from the bottom (0) to the top
        // (1): the upper comes down to just below the middle, the lower
        // rises to meet it. Each edge bows toward the middle of the view;
        // open, both lie wholly off the screen.
        float meet = 0.42;
        float x = c.x;
        float bow = 0.06 * x * x;
        float upper = mix(1.2, meet, shut) + bow;
        float lower = mix(-0.15, meet, shut) - bow * 0.5;
        // Far out of focus: broad, soft edges, softest when barely closing.
        float soft = 0.05 + 0.1 * open;
        float lid = max(
          smoothstep(upper - soft, upper + soft, vUv.y),
          1.0 - smoothstep(lower - soft * 0.7, lower + soft * 0.7, vUv.y)
        );
        // The lashes: a darker, blurred fringe just inside the upper edge.
        float lashes = shut * (1.0 - shut) * 1.6 *
          exp(-pow((vUv.y - (upper - soft * 1.2)) / (soft * 0.9), 2.0));
        lid = max(lid, smoothstep(0.93, 1.0, shut));
        vec3 skin = vec3(0.075, 0.022, 0.014) * (0.6 + 0.4 * open);
        vec3 colour = mix(seen * (1.0 - clamp(lashes, 0.0, 0.7)), skin, lid);
        gl_FragColor = vec4(colour, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    /**
     * Draw the eyes `open` (1 open, 0 shut) and `haze` (0 clear, 1 just
     * woken) over the frame just drawn. Open and clear, it draws nothing.
     */
    draw(open: number, haze: number) {
      if (open >= 1 && haze <= 0) return;
      renderer.getDrawingBufferSize(size);
      if (
        !frame ||
        frame.image.width !== size.x ||
        frame.image.height !== size.y
      ) {
        frame?.dispose();
        frame = new FramebufferTexture(size.x, size.y);
        frame.minFilter = LinearFilter;
        frame.magFilter = LinearFilter;
      }
      renderer.copyFramebufferToTexture(frame);
      material.uniforms.map.value = frame;
      material.uniforms.open.value = open;
      material.uniforms.haze.value = haze;
      material.uniforms.aspect.value = size.x / size.y;
      // The blur is measured in pixels of a 1080-line screen.
      material.uniforms.texel.value.set(
        1 / (1080 * (size.x / size.y)),
        1 / 1080,
      );
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = autoClear;
    },
    dispose() {
      frame?.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
