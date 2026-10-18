import { BoxGeometry, Group, Mesh } from 'three';
import { FINISHES, HALL_SURFACES } from '../scene/hall-surfaces';
import type { HallSurface } from '../scene/hall-surfaces';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createEffectsConsole } from './effects-console';
import type { ConsoleRow } from './effects-console';
import { createPs1Material } from '../toolkit/components/core/parts/ps1-material';

/** Everything the hall's console sets. */
export interface HallSettings {
  materials: Record<
    HallSurface,
    {
      /** The finish, an index into the surface's finishes. */
      finish: number;
      /** The finish's own colour, darker or lighter: 0.3 to 1.7. */
      shade: number;
      roughness: number;
      metalness: number;
    }
  >;
  /** The high-bay lamps: brightness and colour temperature, kelvin. */
  lampIntensity: number;
  lampKelvin: number;
  /** The overcast daylight through the skylights and windows. */
  skyIntensity: number;
  skyKelvin: number;
  /** How strongly the polished floor (and every shiny surface) reflects. */
  floorShine: number;
  /** How much light bounces from surface to surface (global illumination), 0 to 3. */
  bounce: number;
  bloom: number;
  /** How strongly corners and contacts are shaded (ambient occlusion), 0 to 2. */
  occlusion: number;
  /** How thick the haze is, 0 to 1. */
  haze: number;
}

export function defaultHallSettings(): HallSettings {
  const materials = {} as HallSettings['materials'];
  for (const surface of HALL_SURFACES) {
    const f = FINISHES[surface][0];
    materials[surface] = {
      finish: 0,
      shade: 1,
      roughness: f.roughness,
      metalness: f.metalness,
    };
  }
  return {
    materials,
    lampIntensity: 1.2,
    lampKelvin: 4000,
    skyIntensity: 0.6,
    skyKelvin: 7000,
    floorShine: 1,
    bounce: 1,
    bloom: 0.5,
    occlusion: 1,
    haze: 0.35,
  };
}

const STORE = 'encabulator.hall.console';

/** The settings this browser kept from last time, or the defaults. */
export function loadHallSettings(): HallSettings {
  const defaults = defaultHallSettings();
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORE) ?? 'null',
    ) as Partial<HallSettings> | null;
    if (!saved) return defaults;
    return {
      ...defaults,
      ...saved,
      materials: { ...defaults.materials, ...saved.materials },
    };
  } catch {
    return defaults;
  }
}

export function saveHallSettings(settings: HallSettings) {
  try {
    localStorage.setItem(STORE, JSON.stringify(settings));
  } catch {
    // Storage refused: the settings last only this visit.
  }
}

/**
 * The hall's console: a real desk on the floor by the door station, its
 * sloping top a panel of knobs in rows, one row for each building surface
 * and rows for the light, with a display naming the last knob touched.
 * FINISH steps through a surface's finishes; SHADE darkens or lightens
 * the finish's own colour; ROUGH and METAL set how it takes the light.
 * The floor's row also sets SHINE, the strength of reflections, and
 * BOUNCE, how much light bounces between surfaces.
 * LAMPS and SKY set brightness and colour temperature in kelvin. Every
 * change is heard by `changed`; the settings are kept in this browser.
 * Built in metres, standing on the floor, its panel facing +z.
 */
export function createHallConsole(
  kit: PanelKit,
  settings: HallSettings,
  changed: () => void,
) {
  const set = (fn: () => void) => () => {
    fn();
    saveHallSettings(settings);
    changed();
  };
  const dial = (
    name: string,
    min: number,
    max: number,
    get: () => number,
    write: (v: number) => void,
    options: {
      digits?: number;
      steps?: number;
      label?: (v: number) => string;
    } = {},
  ) => ({
    name,
    min,
    max,
    get,
    set: (v: number) => set(() => write(v))(),
    ...options,
  });
  const surfaceRow = (surface: HallSurface): ConsoleRow => {
    const m = settings.materials[surface];
    const finishes = FINISHES[surface];
    return {
      title: surface.toUpperCase(),
      dials: [
        dial(
          'FINISH',
          0,
          finishes.length - 1,
          () => m.finish,
          (v) => {
            const index = Math.round(v);
            if (index === m.finish) return;
            m.finish = index;
            // A new finish brings its own roughness and metalness.
            m.roughness = finishes[index].roughness;
            m.metalness = finishes[index].metalness;
          },
          {
            steps: finishes.length - 1,
            label: (v) => finishes[Math.round(v)].name.toUpperCase(),
          },
        ),
        dial(
          'SHADE',
          0.3,
          1.7,
          () => m.shade,
          (v) => (m.shade = v),
          { steps: 28 },
        ),
        dial(
          'ROUGH',
          0,
          1,
          () => m.roughness,
          (v) => (m.roughness = v),
          { steps: 20 },
        ),
        ...(surface === 'floor'
          ? [
              dial(
                'SHINE',
                0,
                2,
                () => settings.floorShine,
                (v) => (settings.floorShine = v),
                { steps: 40 },
              ),
              dial(
                'BOUNCE',
                0,
                3,
                () => settings.bounce,
                (v) => (settings.bounce = v),
                { steps: 30 },
              ),
            ]
          : [
              dial(
                'METAL',
                0,
                1,
                () => m.metalness,
                (v) => (m.metalness = v),
                { steps: 20 },
              ),
            ]),
      ],
    };
  };
  const kelvin = (v: number) => `${Math.round(v)} K`;
  const rows: ConsoleRow[] = [
    ...HALL_SURFACES.map(surfaceRow),
    {
      title: 'LAMPS',
      dials: [
        dial(
          'LEVEL',
          0,
          4,
          () => settings.lampIntensity,
          (v) => (settings.lampIntensity = v),
          { steps: 40 },
        ),
        dial(
          'KELVIN',
          1800,
          7500,
          () => settings.lampKelvin,
          (v) => (settings.lampKelvin = v),
          { steps: 57, label: kelvin },
        ),
      ],
    },
    {
      title: 'SKY',
      dials: [
        dial(
          'LEVEL',
          0,
          4,
          () => settings.skyIntensity,
          (v) => (settings.skyIntensity = v),
          { steps: 40 },
        ),
        dial(
          'KELVIN',
          3500,
          12000,
          () => settings.skyKelvin,
          (v) => (settings.skyKelvin = v),
          { steps: 85, label: kelvin },
        ),
      ],
    },
    {
      title: 'AIR',
      dials: [
        dial(
          'AO',
          0,
          2,
          () => settings.occlusion,
          (v) => (settings.occlusion = v),
          { steps: 20 },
        ),
        dial(
          'BLOOM',
          0,
          2,
          () => settings.bloom,
          (v) => (settings.bloom = v),
          { steps: 40 },
        ),
        dial(
          'HAZE',
          0,
          1,
          () => settings.haze,
          (v) => (settings.haze = v),
          { steps: 20 },
        ),
      ],
      buttons: [
        {
          legend: 'RESET',
          colour: 'red',
          press: set(() => Object.assign(settings, defaultHallSettings())),
        },
      ],
    },
  ];
  const panel = createEffectsConsole(kit, rows, () => [
    `LAMPS ${Math.round(settings.lampKelvin)}K  SKY ${Math.round(settings.skyKelvin)}K`,
  ]);

  // The desk: the panel on a sloping top, scaled up for easy reading, over
  // a steel cabinet, with a back panel so it reads as a desk from behind.
  const scale = 2.2;
  const tilt = 1.05;
  const group = new Group();
  group.name = 'Hall console';
  const top = new Group();
  const deskTop = 1.0;
  top.position.y = deskTop;
  top.rotation.x = -tilt;
  panel.group.scale.setScalar(scale);
  top.add(panel.group);
  group.add(top);
  const w = panel.width * scale;
  const h = panel.height * scale;
  const depth = h * Math.sin(tilt);
  const front = deskTop - (h / 2) * Math.cos(tilt);
  const back = deskTop + (h / 2) * Math.cos(tilt);
  const body = createPs1Material({ color: '#3d4a45', roughness: 0.6 });
  kit.materials.push(body);
  const cabinet = new Mesh(new BoxGeometry(w + 0.04, front, depth), body);
  cabinet.position.set(0, front / 2, 0);
  group.add(cabinet);
  const rear = new Mesh(new BoxGeometry(w + 0.04, back, 0.04), body);
  rear.position.set(0, back / 2, -depth / 2 - 0.02);
  group.add(rear);
  return {
    group,
    width: w,
    depth: depth + 0.1,
    uses: panel.uses,
    update: panel.update,
  };
}

/** The colour a surface shows: its finish's colour, shaded. */
export function surfaceColour(surface: HallSurface, settings: HallSettings) {
  const m = settings.materials[surface];
  return {
    finish: FINISHES[surface][m.finish] ?? FINISHES[surface][0],
    shade: m.shade,
  };
}
