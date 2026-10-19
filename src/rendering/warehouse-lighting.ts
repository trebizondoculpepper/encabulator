import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  PointLight,
} from 'three';
import type { Scene } from 'three';
import type { Readable } from '../toolkit/components/core/logic/world/components';

/** The battens' warm white, and the emergency lighting's cool one. */
const MAINS = new Color('#f2f3e9');
const BATTERY = new Color('#dfe8f6');
/** A light's emergency level, a fraction of its fitting's full light. */
const EMERGENCY = 0.12;
/** At or below this, a zone's emergency fittings are on their batteries. */
const ON_BATTERY = 0.7;

/**
 * Shared overcast daylight and suspended lights for every warehouse
 * instance. Each light follows its fitting (`output`, 0 to 1: a
 * fluorescent batten coming to life, flickering, going out), else its
 * zone's level, else the one circuit; it is dimmed, never hidden (hiding a
 * light recompiles every material). With `emergency` (each zone's
 * emergency fittings' voltage), a light whose zone's emergency fittings
 * are on their batteries also stands in for them, a dim, cool light where
 * they are, so the room needs no more lights for its emergency lighting.
 * The light bounced about the room (`bounce`) follows the lights.
 */
export function addWarehouseLighting(
  scene: Scene,
  lights: readonly {
    x: number;
    y: number;
    z: number;
    zone?: number;
    output?: () => number;
  }[],
  metre: number,
  options: {
    daylight?: number;
    circuit?: Readable<number>;
    /** Each lighting zone's level, for the lights in it. */
    zones?: readonly Readable<number>[];
    /** Each zone's emergency fittings' voltage. */
    emergency?: readonly Readable<number>[];
    /** The battens' brightness, times their usual. */
    brightness?: number;
    /** How much light the lit room bounces about, as ambient light. */
    bounce?: number;
    /**
     * The scene's environment (image-based) light at full: with it, that
     * light follows the daylight and the room's lights, so the room
     * darkens when they go out.
     */
    environment?: number;
  } = {},
) {
  const skyLevel = options.daylight ?? 1;
  const full = 8 * metre * metre * (options.brightness ?? 1);
  const bounce = new AmbientLight('#ecebe2', 0);
  scene.add(
    new HemisphereLight('#e1e9ec', '#6f7067', 0.85 * skyLevel),
    new AmbientLight('#e9ece5', 0.3 * skyLevel),
    bounce,
  );
  const daylight = new DirectionalLight('#edf3f5', 1.3 * skyLevel);
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
  const fittings: {
    light: PointLight;
    zone?: number;
    output?: () => number;
  }[] = [];
  for (const { x, y, z, zone, output } of lights) {
    const light = new PointLight(MAINS, full, 13 * metre, 2);
    light.position.set(x * metre, y * metre, z * metre);
    scene.add(light);
    fittings.push({ light, zone, output });
  }
  const update = () => {
    let sum = 0;
    for (const { light, zone, output } of fittings) {
      const level = Math.max(
        0,
        output?.() ??
          (zone && options.zones?.[zone - 1]?.value) ??
          options.circuit?.value ??
          1,
      );
      const battery =
        zone !== undefined &&
        (options.emergency?.[zone - 1]?.value ?? 1) <= ON_BATTERY;
      const emergency = battery ? EMERGENCY : 0;
      light.intensity = full * Math.max(level, emergency);
      light.color.copy(level >= emergency ? MAINS : BATTERY);
      sum += Math.max(level, emergency);
    }
    const lit = fittings.length ? sum / fittings.length : 0;
    bounce.intensity = (options.bounce ?? 0) * lit;
    if (options.environment !== undefined)
      scene.environmentIntensity =
        options.environment * (skyLevel + (1 - skyLevel) * lit);
  };
  update();
  return { update };
}
