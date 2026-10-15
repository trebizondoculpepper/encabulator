import { FINISHES, HALL_SURFACES } from '../scene/hall-surfaces';
import type { HallSurface } from '../scene/hall-surfaces';
import { kelvinToHex } from '../game/colour-temperature';

/** Everything the hall's control panel sets. */
export interface HallSettings {
  materials: Record<
    HallSurface,
    { finish: string; colour: string; roughness: number; metalness: number }
  >;
  /** The high-bay lamps: brightness and colour temperature, kelvin. */
  lampIntensity: number;
  lampKelvin: number;
  /** The overcast daylight through the skylights and windows. */
  skyIntensity: number;
  skyKelvin: number;
  bloom: number;
  /** How thick the haze is, 0 to 1. */
  haze: number;
}

export function defaultHallSettings(): HallSettings {
  const materials = {} as HallSettings['materials'];
  for (const surface of HALL_SURFACES) {
    const f = FINISHES[surface][0];
    materials[surface] = {
      finish: f.name,
      colour: f.colour,
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
    bloom: 0.5,
    haze: 0.35,
  };
}

const STORE = 'encabulator.hall.settings';

/** The settings saved in this browser last time, or the defaults. */
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
      materials: { ...defaults.materials, ...(saved.materials ?? {}) },
    };
  } catch {
    return defaults;
  }
}

/**
 * The hall's control panel: an HTML panel at the side of the screen, for
 * the developer, that sets the building's materials (each surface's
 * finish, colour, roughness and metalness) and its light (the lamps' and
 * the sky's brightness and colour temperature, the bloom and the haze).
 * `changed` hears every change as it happens; `settled` once a slider is
 * let go, for work too slow to do while dragging. Settings are kept in
 * this browser between visits.
 */
export function createHallPanel(
  parent: HTMLElement,
  settings: HallSettings,
  changed: (settings: HallSettings) => void,
  settled: (settings: HallSettings) => void,
) {
  const panel = document.createElement('div');
  panel.id = 'hall-panel';
  Object.assign(panel.style, {
    position: 'absolute',
    top: '56px',
    right: '12px',
    width: '280px',
    maxHeight: 'calc(100% - 120px)',
    overflowY: 'auto',
    padding: '10px 12px',
    background: 'rgba(22,26,25,0.88)',
    color: '#e8e2cc',
    font: '12px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif',
    borderRadius: '4px',
  });
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(settings));
    } catch {
      // Storage refused: the settings last only this visit.
    }
  };
  const fire = () => changed(settings);
  const done = () => {
    save();
    settled(settings);
  };
  const heading = (text: string) => {
    const h = document.createElement('div');
    h.textContent = text;
    Object.assign(h.style, {
      margin: '10px 0 4px',
      font: 'bold 11px "Helvetica Neue", Helvetica, Arial, sans-serif',
      letterSpacing: '0.08em',
      color: '#c9c23a',
    });
    panel.append(h);
  };
  const row = (label: string, input: HTMLElement, after?: HTMLElement) => {
    const line = document.createElement('label');
    Object.assign(line.style, {
      display: 'grid',
      gridTemplateColumns: '84px 1fr auto',
      alignItems: 'center',
      gap: '6px',
      margin: '3px 0',
    });
    const name = document.createElement('span');
    name.textContent = label;
    line.append(name, input);
    if (after) line.append(after);
    panel.append(line);
  };
  const slider = (
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
    format: (v: number) => string = (v) => v.toFixed(2),
    swatch?: (v: number) => string,
  ) => {
    const input = document.createElement('input');
    input.type = 'range';
    Object.assign(input, { min, max, step, value: String(get()) });
    const value = document.createElement('span');
    Object.assign(value.style, {
      minWidth: '52px',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
    });
    const show = () => {
      value.textContent = format(Number(input.value));
      if (swatch)
        value.style.borderLeft = `10px solid ${swatch(Number(input.value))}`;
    };
    show();
    input.addEventListener('input', () => {
      set(Number(input.value));
      show();
      fire();
    });
    input.addEventListener('change', done);
    row(label, input, value);
    return { input, show };
  };
  const refresh: (() => void)[] = [];

  heading('MATERIALS');
  for (const surface of HALL_SURFACES) {
    const m = settings.materials[surface];
    const sub = document.createElement('div');
    sub.textContent = surface[0].toUpperCase() + surface.slice(1);
    Object.assign(sub.style, { marginTop: '8px', fontWeight: 'bold' });
    panel.append(sub);
    const select = document.createElement('select');
    for (const f of FINISHES[surface]) {
      const option = document.createElement('option');
      option.value = option.textContent = f.name;
      select.append(option);
    }
    select.value = m.finish;
    const colour = document.createElement('input');
    colour.type = 'color';
    colour.value = m.colour;
    const rough = slider(
      'Roughness',
      0,
      1,
      0.01,
      () => m.roughness,
      (v) => (m.roughness = v),
    );
    const metal = slider(
      'Metalness',
      0,
      1,
      0.01,
      () => m.metalness,
      (v) => (m.metalness = v),
    );
    select.addEventListener('change', () => {
      // A new finish brings its own colour, roughness and metalness.
      const f = FINISHES[surface].find((x) => x.name === select.value)!;
      Object.assign(m, {
        finish: f.name,
        colour: f.colour,
        roughness: f.roughness,
        metalness: f.metalness,
      });
      colour.value = f.colour;
      rough.input.value = String(f.roughness);
      metal.input.value = String(f.metalness);
      rough.show();
      metal.show();
      fire();
      done();
    });
    colour.addEventListener('input', () => {
      m.colour = colour.value;
      fire();
    });
    colour.addEventListener('change', done);
    row('Finish', select);
    row('Colour', colour);
    // Keep the rows' order: finish and colour before the sliders.
    panel.append(rough.input.parentElement!, metal.input.parentElement!);
    refresh.push(() => {
      select.value = m.finish;
      colour.value = m.colour;
    });
  }

  heading('LIGHTING');
  slider(
    'Lamps',
    0,
    4,
    0.05,
    () => settings.lampIntensity,
    (v) => (settings.lampIntensity = v),
  );
  slider(
    'Lamp colour',
    1800,
    7500,
    50,
    () => settings.lampKelvin,
    (v) => (settings.lampKelvin = v),
    (v) => `${Math.round(v)} K`,
    kelvinToHex,
  );
  slider(
    'Skylights',
    0,
    4,
    0.05,
    () => settings.skyIntensity,
    (v) => (settings.skyIntensity = v),
  );
  slider(
    'Sky colour',
    3500,
    12000,
    100,
    () => settings.skyKelvin,
    (v) => (settings.skyKelvin = v),
    (v) => `${Math.round(v)} K`,
    kelvinToHex,
  );
  heading('ATMOSPHERE');
  slider(
    'Bloom',
    0,
    2,
    0.05,
    () => settings.bloom,
    (v) => (settings.bloom = v),
  );
  slider(
    'Haze',
    0,
    1,
    0.01,
    () => settings.haze,
    (v) => (settings.haze = v),
  );

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset to defaults';
  Object.assign(reset.style, { marginTop: '10px', width: '100%' });
  reset.addEventListener('click', () => {
    Object.assign(settings, defaultHallSettings());
    panel.remove();
    const again = createHallPanel(parent, settings, changed, settled);
    Object.assign(made, again);
    fire();
    done();
  });
  panel.append(reset);
  parent.append(panel);
  const made = {
    element: panel,
    dispose: () => panel.remove(),
  };
  void refresh;
  return made;
}
