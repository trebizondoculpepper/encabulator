import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PointLight,
} from 'three';
import type { Scene } from 'three';

/** Shared overcast daylight and suspended lights for every warehouse instance. */
export function addWarehouseLighting(
  scene: Scene,
  lights: readonly { x: number; y: number; z: number }[],
  metre: number,
) {
  scene.add(
    new HemisphereLight('#e1e9ec', '#6f7067', 0.85),
    new AmbientLight('#e9ece5', 0.3),
  );
  const daylight = new DirectionalLight('#edf3f5', 1.3);
  daylight.position.set(7 * metre, 24 * metre, 5 * metre);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(2048, 2048);
  Object.assign(daylight.shadow.camera, {
    left: -22 * metre,
    right: 22 * metre,
    top: 22 * metre,
    bottom: -22 * metre,
    near: metre,
    far: 60 * metre,
  });
  daylight.shadow.bias = -0.00015;
  daylight.shadow.normalBias = 0.02 * metre;
  daylight.shadow.radius = 4;
  scene.add(daylight);
  for (const { x, y, z } of lights) {
    const light = new PointLight('#f2f3e9', 8 * metre * metre, 13 * metre, 2);
    light.position.set(x * metre, y * metre, z * metre);
    scene.add(light);
  }
}
