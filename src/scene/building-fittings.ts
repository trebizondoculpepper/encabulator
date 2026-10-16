import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import { METRE } from '../game/units';
import { createPs1Material } from '../rendering/ps1-material';
import { createMicroLabel, kitGlow, kitPaint } from './eighties-controls';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/**
 * Views of a present-day English building's fittings, for dev8: light
 * switches, dimmers, pull cords, emergency and exit lighting, the fire
 * alarm (call points, sounders, detectors, the panel), sprinklers and
 * their valve set, extinguishers, a fire door on its holder, sockets and
 * a fused spur, a floor box, the distribution board, the climate controls
 * (air-conditioning controller and cassette, thermostat, radiator and
 * valve, window vent, blinds), an extractor fan, an access controlled
 * door, an intercom and an accessible toilet's alarm. They only draw: the
 * parts in `src/rendering/building-parts.ts` give them their behaviour.
 *
 * Each is built in metres, facing +z, its mounting face at z = 0 (or, for
 * ceiling fittings, hanging from y = 0 and facing down).
 */

const SANS = 'Arial, Helvetica, sans-serif';

/** A soft round dot, so particles are puffs and drops rather than squares. */
function softDot(kit: PanelKit) {
  const { context: c, texture } = createCanvasTexture(64, 64);
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  return texture;
}
const PLATE_WHITE = '#f4f3ee';

function tools(kit: PanelKit) {
  const paint = (color: string, roughness = 0.5, metalness = 0) => {
    const m = createPs1Material({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A cylinder whose axis is y, or z (facing out of a wall). */
  const cyl = (
    parent: Object3D,
    material: Material,
    r: number,
    h: number,
    x = 0,
    y = 0,
    z = 0,
    axis: 'y' | 'z' | 'x' = 'y',
    segments = 20,
  ) => {
    const mesh = new Mesh(new CylinderGeometry(r, r, h, segments), material);
    mesh.position.set(x, y, z);
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };
  /** A lamp: dark until lit, in its colour. */
  const led = (
    parent: Object3D,
    colour: string,
    r: number,
    x: number,
    y: number,
    z: number,
    axis: 'y' | 'z' = 'z',
  ) => {
    const material = kitGlow(kit, colour);
    const on = new Color(colour);
    const off = on.clone().multiplyScalar(0.2);
    const mesh = cyl(parent, material, r, r * 0.6, x, y, z, axis, 12);
    material.color.copy(off);
    return {
      mesh,
      set(lit: boolean | number) {
        const level = typeof lit === 'number' ? lit : lit ? 1 : 0;
        material.color.copy(off).lerp(on, level);
      },
    };
  };
  const label = (
    parent: Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    height: number,
    ink = '#1b1b1b',
    plate: string | null = null,
  ) => {
    const mark = createMicroLabel(kit, text, { height, ink, plate });
    mark.position.set(x, y, z);
    parent.add(mark);
    return mark;
  };
  /** A printed face drawn on a canvas, `w` × `h` metres. */
  const printed = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
    pixels = 256,
    glow = false,
  ) => {
    const { context, texture } = createCanvasTexture(
      pixels,
      Math.max(8, Math.round((pixels * h) / w)),
    );
    draw(context, context.canvas.width, context.canvas.height);
    texture.needsUpdate = true;
    kit.textures.push(texture);
    const material = createPs1Material({ map: texture }, glow, glow);
    kit.materials.push(material);
    return {
      mesh: new Mesh(new PlaneGeometry(w, h), material),
      context,
      texture,
    };
  };
  return { paint, box, cyl, led, label, printed };
}

// ---- Lighting -----------------------------------------------------------

/** A white plate switch of 1 to 3 rocker gangs, its rockers each `set`. */
export function createRockerPlate(kit: PanelKit, gangs: number) {
  const t = tools(kit);
  const group = new Group();
  const width = gangs > 2 ? 0.146 : 0.086;
  t.box(group, t.paint(PLATE_WHITE, 0.35), width, 0.086, 0.009, 0, 0, 0.0045);
  const rockers = Array.from({ length: gangs }, (_, i) => {
    const x = (i - (gangs - 1) / 2) * (gangs > 2 ? 0.04 : 0.03);
    const pivot = new Group();
    pivot.position.set(x, 0, 0.009);
    group.add(pivot);
    const mesh = t.box(pivot, t.paint('#ecebe4', 0.3), 0.022, 0.044, 0.008);
    mesh.position.z = 0.003;
    return {
      mesh,
      set(on: boolean) {
        pivot.rotation.x = on ? -0.14 : 0.14;
      },
    };
  });
  return { group, rockers };
}

/** A rotary dimmer on a plate: `set` its level, 0 to 10. */
export function createDimmerPlate(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.009, 0, 0, 0.0045);
  const knob = t.cyl(
    group,
    t.paint('#e9e8e1', 0.3),
    0.017,
    0.02,
    0,
    0,
    0.019,
    'z',
  );
  const mark = t.box(
    knob,
    t.paint('#8a8a84'),
    0.003,
    0.002,
    0.012,
    0,
    0.011,
    0,
  );
  mark.rotation.x = 0;
  return {
    group,
    knob,
    set(level: number) {
      knob.rotation.y = -((level / 10) * 1.6 * Math.PI - 0.8 * Math.PI);
    },
  };
}

/** A ceiling pull-cord switch: its box, cord and bobble; `pull` it. */
export function createPullSwitch(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.035, 0.03, 0, -0.015, 0);
  const cord = new Group();
  group.add(cord);
  t.cyl(cord, t.paint('#efefe8', 0.8), 0.0015, 1.2, 0, -0.63, 0, 'y', 6);
  const bobble = t.cyl(
    cord,
    t.paint('#f2f1ea', 0.4),
    0.012,
    0.05,
    0,
    -1.25,
    0,
    'y',
    12,
  );
  let dip = 0;
  return {
    group,
    bobble,
    pull() {
      dip = 1;
    },
    update(delta: number) {
      dip = Math.max(0, dip - delta * 4);
      cord.position.y = -Math.sin(dip * Math.PI) * 0.06;
    },
  };
}

/** A key switch on a plate, as for testing emergency lights. */
export function createKeyPlate(kit: PanelKit, legend: string) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.009, 0, 0, 0.0045);
  t.cyl(
    group,
    t.paint('#c9c4ae', 0.3, 0.7),
    0.012,
    0.004,
    0,
    0.004,
    0.011,
    'z',
  );
  const key = new Group();
  key.position.set(0, 0.004, 0.013);
  group.add(key);
  const blade = t.box(
    key,
    t.paint('#c5c7c8', 0.25, 0.9),
    0.004,
    0.02,
    0.012,
    0,
    0,
    0.006,
  );
  t.label(group, legend, 0, -0.03, 0.0095, 0.004);
  return {
    group,
    key: blade,
    set(on: boolean) {
      key.rotation.z = on ? -Math.PI / 2 : 0;
    },
  };
}

/** A ceiling occupancy (PIR) sensor, its LED showing it sees someone. */
export function createOccupancySensor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.05, 0.012, 0, -0.006, 0);
  const dome = new Mesh(
    new SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    t.paint('#f6f5ef', 0.2),
  );
  dome.rotation.x = Math.PI;
  dome.position.y = -0.012;
  group.add(dome);
  const lamp = t.led(group, '#ff3b2a', 0.004, 0.038, -0.013, 0, 'y');
  return { group, set: lamp.set };
}

/** A non-maintained emergency light on the ceiling, with its charging LED. */
export function createEmergencyLight(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.08, 0.03, 0, -0.015, 0);
  const lens = kitGlow(kit, '#ffffff');
  t.cyl(group, lens, 0.05, 0.012, 0, -0.034, 0);
  const charging = t.led(group, '#35e06a', 0.005, 0.065, -0.031, 0, 'y');
  const dark = new Color('#c9c9c3');
  const bright = new Color('#ffffff');
  return {
    group,
    set(lit: boolean, charged: boolean) {
      lens.color.copy(lit ? bright : dark);
      charging.set(charged);
    },
  };
}

/** A maintained exit sign: a lit box with the running man. */
export function createExitSign(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#e8e8e2', 0.4), 0.42, 0.18, 0.05, 0, 0, 0.025);
  const face = t.printed(
    0.38,
    0.14,
    (c, w, h) => {
      c.fillStyle = '#138a43';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = c.fillStyle = '#ffffff';
      const u = h / 10;
      c.lineWidth = u * 0.7;
      c.lineCap = 'round';
      c.strokeRect(u * 1.2, u * 1.2, u * 4, u * 7.6);
      c.beginPath();
      c.arc(u * 7.4, u * 2.2, u * 0.9, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(u * 7, u * 3.4);
      c.lineTo(u * 6.2, u * 6.2);
      c.lineTo(u * 4.6, u * 8.6);
      c.moveTo(u * 6.2, u * 6.2);
      c.lineTo(u * 7.8, u * 7.2);
      c.lineTo(u * 8.4, u * 8.8);
      c.moveTo(u * 7, u * 3.8);
      c.lineTo(u * 8.6, u * 5.4);
      c.stroke();
      c.font = `bold ${u * 4}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText('Fire exit', u * 11, h / 2);
    },
    384,
    true,
  );
  face.mesh.position.z = 0.051;
  group.add(face.mesh);
  const material = face.mesh.material as MeshBasicMaterial;
  return {
    group,
    set(level: number) {
      material.color.setScalar(0.4 + level * 0.6);
    },
  };
}

// ---- Fire ---------------------------------------------------------------

/** A resettable manual call point: its face, and the key that resets it. */
export function createCallPoint(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#c4231c', 0.4), 0.09, 0.09, 0.05, 0, 0, 0.025);
  const face = t.printed(
    0.07,
    0.07,
    (c, w, h) => {
      c.fillStyle = '#eef0ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c0261f';
      c.textAlign = 'center';
      c.font = `bold ${w * 0.17}px ${SANS}`;
      c.fillText('FIRE', w / 2, h * 0.3);
      c.font = `bold ${w * 0.1}px ${SANS}`;
      c.fillText('PUSH HERE', w / 2, h * 0.62);
    },
    128,
  );
  face.mesh.position.z = 0.0505;
  group.add(face.mesh);
  // The resettable element shows a yellow-and-black flag once operated.
  const flag = t.printed(
    0.05,
    0.016,
    (c, w, h) => {
      for (let x = -h; x < w; x += h) {
        c.fillStyle = '#f2c618';
        c.fillRect(x, 0, h / 2, h);
        c.fillStyle = '#151515';
        c.fillRect(x + h / 2, 0, h / 2, h);
      }
    },
    128,
  );
  flag.mesh.position.set(0, -0.022, 0.0508);
  flag.mesh.visible = false;
  group.add(flag.mesh);
  const key = t.cyl(
    group,
    t.paint('#1b1b1b', 0.5),
    0.004,
    0.004,
    0.036,
    -0.036,
    0.051,
    'z',
    10,
  );
  return {
    group,
    face: face.mesh,
    key,
    set(latched: boolean) {
      flag.mesh.visible = latched;
      face.mesh.position.z = latched ? 0.047 : 0.0505;
    },
  };
}

/** A wall sounder-beacon: a red base and a lens that flashes. */
export function createSounderBeacon(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint('#c4231c', 0.4), 0.055, 0.06, 0, 0, 0.03, 'z', 24);
  const lens = kitGlow(kit, '#ff5040');
  t.cyl(group, lens, 0.032, 0.04, 0, 0, 0.08, 'z', 20);
  const off = new Color('#5a1d18');
  const on = new Color('#ff6a55');
  lens.color.copy(off);
  let time = 0;
  let sounding = false;
  return {
    group,
    set(value: boolean) {
      sounding = value;
    },
    update(delta: number) {
      time += delta;
      lens.color.copy(sounding && time % 1 < 0.12 ? on : off);
    },
  };
}

/** An optical smoke detector: its LED blinks; solid in alarm. */
export function createSmokeDetector(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.06, 0.012, 0, -0.006, 0, 'y', 28);
  t.cyl(group, t.paint('#efeee8', 0.4), 0.05, 0.035, 0, -0.03, 0, 'y', 28);
  const lamp = t.led(group, '#ff3020', 0.006, 0.04, -0.03, 0.02, 'z');
  lamp.mesh.rotation.x = 0;
  let time = 0;
  let alarm = false;
  return {
    group,
    set(value: boolean) {
      alarm = value;
    },
    update(delta: number) {
      time += delta;
      lamp.set(alarm || time % 4 < 0.08);
    },
  };
}

export interface PanelLamps {
  fire: boolean;
  zone1: boolean;
  zone2: boolean;
  /** An alarm stage is on: alert or evacuate. */
  alarm: boolean;
  /** Seconds left of the investigation delay, or 0. */
  countdown: number;
  /** The fire brigade has been called (the remote output). */
  brigade: boolean;
  silenced: boolean;
  power: boolean;
  onBattery: boolean;
  enabled: boolean;
}

/** The facia's drawing, pixels per metre. */
const FACIA_PX = 4000;

/**
 * A two-zone conventional fire alarm panel, after a common British panel
 * of the kind (C-TEC's CFP, 380 × 235 × 90 mm), with a maker's name of
 * our own: an off-white plastic case with a certification badge, the
 * zones' handwritten labels in windows, and a charcoal facia across its
 * lower half. On the facia's left, the printed operating instructions;
 * in the middle, numbered keys 1 to 4 (2, yellow, leaves access mode; 4
 * tests the lamps), the colour-coded buttons (white silences the panel's
 * own buzzer, red silences or resounds the sounders, green resets), and
 * the red key in its keyswitch; on the right, the red FIRE lamp, a lamp
 * for each zone in fire and each zone in fault, disable or test, and the
 * general lamps along the bottom.
 */
export function createFirePanel(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const W = 0.38;
  const H = 0.235;
  const D = 0.09;
  // The case: off-white plastic, the lid a touch proud of the box.
  t.box(
    group,
    t.paint('#dcdcd6', 0.55),
    W - 0.02,
    H - 0.02,
    D - 0.01,
    0,
    0,
    (D - 0.01) / 2,
  );
  t.box(group, t.paint('#ecece7', 0.45), W, H, 0.012, 0, 0, D - 0.006);
  const front = D + 0.0005;
  for (const x of [-W / 2 + 0.018, W / 2 - 0.018])
    t.cyl(
      group,
      t.paint('#d2d2cc', 0.4),
      0.006,
      0.003,
      x,
      -H / 2 + 0.018,
      front,
      'z',
      16,
    );
  const badge = t.printed(
    0.06,
    0.03,
    (c, w, h) => {
      c.fillStyle = '#4a4d50';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9d9d4';
      c.font = `bold ${h * 0.34}px ${SANS}`;
      c.fillText('EN54-2/4', w * 0.12, h * 0.62);
    },
    192,
  );
  badge.mesh.position.set(-0.11, 0.075, front);
  group.add(badge.mesh);

  // The facia: drawn as one picture, with the lamps and buttons set into it.
  const fw = 0.35;
  const fh = 0.118;
  const top = 0.012;
  const at = (px: number, py: number): [number, number] => [
    -fw / 2 + px / FACIA_PX,
    top - py / FACIA_PX,
  ];
  const facia = t.printed(
    fw,
    fh,
    (c, w, h) => {
      const round = (
        x: number,
        y: number,
        rw: number,
        rh: number,
        r: number,
      ) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + rw, y, x + rw, y + rh, r);
        c.arcTo(x + rw, y + rh, x, y + rh, r);
        c.arcTo(x, y + rh, x, y, r);
        c.arcTo(x, y, x + rw, y, r);
        c.fill();
      };
      c.fillStyle = '#ecece7';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#3b3e41';
      round(0, 0, w, h, 40);
      // Instructions, on the left.
      c.fillStyle = '#5b5f62';
      round(30, 26, 360, 44, 8);
      c.fillStyle = '#ffffff';
      c.font = `bold 22px ${SANS}`;
      c.fillText('Fire Alarm Control Panel Instructions', 40, 56);
      const lines: [string, string | null][] = [
        ['To silence the internal sounder: press', '#f4f4f0'],
        ['To silence/resound the alarm sounders:', null],
        ['  turn key to I or enter code and press', '#d6322a'],
        ['To reset the panel: ensure the alarm', null],
        ['  sounders are silenced and press', '#2fa04a'],
        ['To exit access mode: remove key OR press', '#f2c618'],
      ];
      c.font = `15px ${SANS}`;
      lines.forEach(([text, swatch], i) => {
        const y = 100 + i * 24;
        c.fillStyle = '#ffffff';
        c.fillText(text, 36, y);
        if (swatch) {
          c.fillStyle = swatch;
          c.fillRect(340, y - 12, 26, 12);
        }
      });
      c.fillStyle = '#f2c618';
      c.font = `bold 16px ${SANS}`;
      c.fillText('Indicators', 36, 264);
      c.fillStyle = '#ffffff';
      c.font = `14px ${SANS}`;
      c.fillText('constant light = zone disabled', 36, 286);
      c.fillText('flashing light = zone in fault or test mode', 36, 306);
      c.fillStyle = '#f2c618';
      c.fillText('General fault: flashing light - call engineer', 36, 330);
      // The maker's mark, our own.
      c.fillStyle = '#c4231c';
      round(36, 360, 64, 64, 6);
      c.fillStyle = '#ffffff';
      c.font = `bold 40px ${SANS}`;
      c.fillText('W', 48, 407);
      c.font = `bold 16px ${SANS}`;
      c.fillText('WARDEN CF2 SERIES', 112, 384);
      c.font = `12px ${SANS}`;
      c.fillText('The system must be tested regularly.', 112, 404);
      c.fillText('If in doubt, refer to the user manual.', 112, 420);
      // The controls' field, a lighter grey, curving into the lamps'.
      c.fillStyle = '#4c5053';
      round(420, 20, 330, 420, 30);
      c.fillStyle = '#e8e8e2';
      c.font = `13px ${SANS}`;
      c.textAlign = 'center';
      const under = (text: string, x: number, y: number) =>
        text.split('\n').forEach((line, i) => c.fillText(line, x, y + i * 14));
      under('override\ndelays', 470, 134);
      under('exit access\nmode', 470, 222);
      under('next option', 470, 310);
      under('enable/disable', 470, 396);
      c.fillStyle = '#f2c618';
      c.fillText('lamp test', 470, 410);
      c.fillStyle = '#e8e8e2';
      under('silence internal\nsounder', 610, 134);
      under('silence/resound\nsounders', 610, 222);
      under('control panel\nreset', 610, 310);
      under('access', 660, 404);
      c.font = `bold 14px ${SANS}`;
      c.fillText('0', 610, 314);
      c.fillText('I', 662, 357);
      // The keyhole: a round head over a slot, rimmed in pale plastic.
      c.fillStyle = '#d8d8d2';
      c.beginPath();
      c.arc(610, 352, 26, 0, Math.PI * 2);
      c.fill();
      c.fillRect(598, 352, 24, 46);
      c.fillStyle = '#141516';
      c.beginPath();
      c.arc(610, 352, 21, 0, Math.PI * 2);
      c.fill();
      c.fillRect(602, 352, 16, 42);
      c.textAlign = 'left';
      // The lamps' field.
      c.fillStyle = '#c4231c';
      round(790, 36, 56, 70, 6);
      c.fillStyle = '#ffffff';
      c.font = `bold 20px ${SANS}`;
      c.fillText('Fire', 798, 62);
      c.fillStyle = '#e8e8e2';
      c.font = `bold 16px ${SANS}`;
      c.fillText('Fire Zones', 1010, 38);
      c.font = `15px ${SANS}`;
      c.fillText('1', 900, 58);
      c.fillText('2', 980, 58);
      c.fillText('1', 900, 150);
      c.fillText('2', 980, 150);
      c.strokeStyle = '#f2c618';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(870, 190);
      c.lineTo(870, 200);
      c.lineTo(1330, 200);
      c.lineTo(1330, 190);
      c.stroke();
      c.fillStyle = '#e8e8e2';
      c.font = `bold 15px ${SANS}`;
      c.fillText('Zone fault/disable/test', 1010, 222);
      c.font = `12px ${SANS}`;
      const general = [
        'supply\npresent',
        'accessed',
        'remote\noutput',
        'general\nfault',
        'power\nsupply fault',
        'system\nfault',
        'sounder\nstatus',
        'output\ndelays',
      ];
      c.textAlign = 'center';
      general.forEach((text, i) => under(text, 820 + i * 66, 330));
      c.textAlign = 'left';
    },
    Math.round(fw * FACIA_PX),
  );
  facia.mesh.position.set(0, top - fh / 2, front);
  group.add(facia.mesh);
  // The zones' labels, handwritten in their windows above the facia.
  const labels = t.printed(
    0.14,
    0.018,
    (c, w, h) => {
      c.fillStyle = '#ecece7';
      c.fillRect(0, 0, w, h);
      c.font = `${h * 0.42}px "Comic Sans MS", ${SANS}`;
      ['1 CALL POINTS', '2 DETECTORS'].forEach((text, i) => {
        c.fillStyle = '#ffffff';
        c.fillRect(i * w * 0.5 + 4, 2, w * 0.5 - 8, h - 4);
        c.strokeStyle = '#9a9a94';
        c.strokeRect(i * w * 0.5 + 4, 2, w * 0.5 - 8, h - 4);
        c.fillStyle = '#1d3d8f';
        c.fillText(text, i * w * 0.5 + 12, h * 0.7);
      });
    },
    512,
  );
  labels.mesh.position.set(0.06, top + 0.014, front);
  group.add(labels.mesh);

  // Lamps.
  const lamp = (px: number, py: number, colour: string, r = 0.0026) => {
    const [x, y] = at(px, py);
    return t.led(group, colour, r, x, y, front + 0.001);
  };
  const lamps = {
    fire: lamp(818, 84, '#ff3020', 0.0034),
    zone1: lamp(904, 86, '#ff3020'),
    zone2: lamp(984, 86, '#ff3020'),
    fault1: lamp(904, 176, '#ffb020'),
    fault2: lamp(984, 176, '#ffb020'),
    supply: lamp(820, 300, '#35e06a'),
    accessed: lamp(886, 300, '#ffb020'),
    remote: lamp(952, 300, '#ffb020'),
    general: lamp(1018, 300, '#ffb020'),
    power: lamp(1084, 300, '#ffb020'),
    system: lamp(1150, 300, '#ffb020'),
    sounders: lamp(1216, 300, '#ffb020'),
    delays: lamp(1282, 300, '#ffb020'),
  };
  // Buttons: numbered keys and the colour-coded three.
  const button = (px: number, py: number, colour: string, digit?: string) => {
    const [x, y] = at(px, py);
    const mesh = t.box(
      group,
      t.paint(colour, 0.35),
      0.014,
      0.009,
      0.003,
      x,
      y,
      front + 0.0015,
    );
    if (digit)
      t.label(
        group,
        digit,
        x,
        y,
        front + 0.0032,
        0.005,
        colour === '#f2c618' ? '#1b1b1b' : '#ffffff',
      );
    return mesh;
  };
  const keys = [
    button(470, 92, '#1e1f21', '1'),
    button(470, 180, '#f2c618', '2'),
    button(470, 268, '#1e1f21', '3'),
    button(470, 356, '#1e1f21', '4'),
  ];
  const silenceBuzzer = button(610, 92, '#f4f4f0');
  const silenceResound = button(610, 180, '#d6322a');
  const reset = button(610, 268, '#2fa04a');
  // The keyswitch, as on the real panel: a keyhole cut in the facia (a
  // round head over a slot, drawn on the facia) with the key standing
  // straight out of it, its head a chunky, rounded red plastic paddle,
  // upright at 0 and turned a quarter to I.
  const [kx, ky] = at(610, 352);
  const barrel = t.cyl(
    group,
    t.paint('#141516', 0.8),
    0.0055,
    0.0008,
    kx,
    ky,
    front + 0.0004,
    'z',
    24,
  );
  const key = new Group();
  key.position.set(kx, ky, front + 0.0008);
  group.add(key);
  const red = t.paint('#d42a1e', 0.3);
  // The neck where the head meets the lock.
  t.box(key, red, 0.0035, 0.007, 0.005, 0, 0, 0.0025);
  const head = new Shape();
  head.moveTo(0.004, -0.0035);
  head.lineTo(0.004, 0.0035);
  head.quadraticCurveTo(0.007, 0.0045, 0.0085, 0.009);
  head.absellipse(
    0.017,
    0,
    0.0095,
    0.0115,
    Math.PI * 0.82,
    -Math.PI * 0.82,
    true,
    0,
  );
  head.quadraticCurveTo(0.007, -0.0045, 0.004, -0.0035);
  const headGeometry = new ExtrudeGeometry(head, {
    depth: 0.003,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0008,
    bevelSegments: 3,
    curveSegments: 16,
  });
  // Drawn with its length along x and its face in xy: stand it out of
  // the facia (x to z), its thin edge towards the viewer.
  headGeometry.translate(0, 0, -0.0015);
  headGeometry.rotateY(-Math.PI / 2);
  key.add(new Mesh(headGeometry, red));
  let time = 0;
  let testing = 0;
  let state: PanelLamps | null = null;
  return {
    group,
    keys,
    silenceBuzzer,
    silenceResound,
    reset,
    key: barrel,
    keyHead: key,
    set(next: PanelLamps) {
      state = next;
      key.rotation.z = next.enabled ? -Math.PI / 2 : 0;
    },
    /** Light every lamp for a moment. */
    lampTest() {
      testing = 2.5;
    },
    update(delta: number) {
      time += delta;
      testing = Math.max(0, testing - delta);
      if (!state) return;
      if (testing > 0) {
        for (const l of Object.values(lamps)) l.set(true);
        return;
      }
      const s = state;
      // Fire lamps flash until the alarm is silenced, then stay lit.
      const fireLit = (on: boolean) => on && (s.silenced || time % 1 < 0.5);
      lamps.fire.set(fireLit(s.fire));
      lamps.zone1.set(fireLit(s.zone1));
      lamps.zone2.set(fireLit(s.zone2));
      lamps.fault1.set(false);
      lamps.fault2.set(false);
      lamps.supply.set(s.power);
      lamps.accessed.set(s.enabled);
      lamps.remote.set(s.brigade);
      lamps.general.set(s.onBattery && time % 1 < 0.5);
      lamps.power.set(s.onBattery);
      lamps.system.set(false);
      lamps.sounders.set(s.silenced);
      // Output delays: flashing while the investigation delay runs.
      lamps.delays.set(s.countdown > 0 && time % 1 < 0.5);
    },
  };
}

/** A pendant sprinkler head, and the spray it gives when discharging. */
export function createSprinklerHead(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const chrome = t.paint('#d0d3d4', 0.2, 0.9);
  t.cyl(group, t.paint('#f2f1ea', 0.4), 0.035, 0.01, 0, -0.005, 0);
  t.cyl(group, chrome, 0.008, 0.04, 0, -0.03, 0, 'y', 10);
  t.cyl(group, chrome, 0.018, 0.003, 0, -0.06, 0, 'y', 16);
  const bulb = t.cyl(
    group,
    kitGlow(kit, '#e0312a'),
    0.003,
    0.016,
    0,
    -0.045,
    0,
    'y',
    8,
  );
  // The spray: drops falling from the deflector in a cone.
  const count = 600;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const seed = () => {
    const a = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 1.4;
    return [Math.cos(a) * s, -0.4 - Math.random() * 0.6, Math.sin(a) * s];
  };
  for (let i = 0; i < count; i++) {
    life[i] = Math.random() * 1.2;
    const [vx, vy, vz] = seed();
    speeds.set([vx, vy, vz], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const drops = new Points(
    geometry,
    new PointsMaterial({
      map: softDot(kit),
      color: '#bcd4e6',
      // Point sizes ignore the room's scale: give them in scene units.
      size: 0.03 * METRE,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  kit.materials.push(drops.material as Material);
  drops.visible = false;
  drops.frustumCulled = false;
  group.add(drops);
  let on = false;
  return {
    group,
    set(burst: boolean, spraying: boolean) {
      on = spraying;
      drops.visible = spraying;
      bulb.visible = !burst;
    },
    update(delta: number) {
      if (!on) return;
      for (let i = 0; i < count; i++) {
        life[i] += delta;
        if (life[i] > 1.3) {
          life[i] = 0;
          const [vx, vy, vz] = seed();
          speeds.set([vx, vy, vz], i * 3);
        }
        const s = life[i];
        positions[i * 3] = speeds[i * 3] * s;
        positions[i * 3 + 1] =
          -0.06 + speeds[i * 3 + 1] * s - 4.9 * s * s * 0.4;
        positions[i * 3 + 2] = speeds[i * 3 + 2] * s;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * A sprinkler valve set on its riser: the main valve's handwheel, the
 * alarm valve with its flag (SPRINKLER OPERATED while water flows), the
 * reset that replaces burst heads, and a gauge.
 */
export function createValveSet(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#b5221b', 0.45, 0.3);
  t.cyl(group, red, 0.06, 2.4, 0, 1.2, 0.12);
  t.cyl(group, red, 0.1, 0.22, 0, 0.8, 0.12);
  const wheel = new Mesh(
    new TorusGeometry(0.12, 0.012, 8, 24),
    t.paint('#c9b23a', 0.4, 0.5),
  );
  wheel.position.set(0, 0.8, 0.27);
  group.add(wheel);
  t.cyl(group, red, 0.012, 0.15, 0, 0.8, 0.2, 'z');
  t.cyl(group, red, 0.11, 0.3, 0, 1.45, 0.12);
  const flag = t.printed(0.16, 0.05, () => {}, 256);
  flag.mesh.position.set(0, 1.45, 0.231);
  group.add(flag.mesh);
  const reset = t.box(
    group,
    t.paint('#2e3236', 0.4),
    0.06,
    0.03,
    0.02,
    0,
    1.35,
    0.235,
  );
  t.label(group, 'RESET', 0, 1.32, 0.231, 0.008, '#1b1b1b');
  const gauge = t.printed(
    0.09,
    0.09,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#222';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w * 0.78, h * 0.3);
      c.stroke();
      c.fillStyle = '#222';
      c.font = `${h * 0.12}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('bar', w / 2, h * 0.8);
    },
    128,
  );
  gauge.mesh.position.set(0.16, 1.7, 0.13);
  group.add(gauge.mesh);
  t.cyl(group, red, 0.008, 0.16, 0.08, 1.7, 0.12, 'x');
  let last = '';
  return {
    group,
    wheel,
    reset,
    set(open: boolean, tripped: boolean) {
      wheel.rotation.z = open ? 0 : Math.PI * 1.5;
      const text = `${open ? 'MAIN OPEN' : 'MAIN SHUT'}|${tripped ? 'TRIPPED' : 'SET'}`;
      if (text === last) return;
      last = text;
      const c = flag.context;
      const w = c.canvas.width;
      const h = c.canvas.height;
      c.fillStyle = tripped ? '#f2c618' : '#e8e8e2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1b1b1b';
      c.font = `bold ${h * 0.34}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText(
        tripped ? 'SPRINKLER OPERATED' : 'INSTALLATION SET',
        w / 2,
        h * 0.42,
      );
      c.font = `${h * 0.26}px ${SANS}`;
      c.fillText(open ? 'MAIN VALVE OPEN' : 'MAIN VALVE SHUT', w / 2, h * 0.82);
      flag.texture.needsUpdate = true;
    },
  };
}

export type ExtinguisherKind = 'water' | 'foam' | 'co2' | 'powder';
const BANDS: Record<ExtinguisherKind, [string, string]> = {
  water: ['#c4231c', 'WATER'],
  foam: ['#efe3b8', 'FOAM'],
  co2: ['#1b1b1b', 'CO2'],
  powder: ['#2a5bc4', 'POWDER'],
};

/** A portable extinguisher of its kind, on its wall bracket, with its sign. */
export function createExtinguisher(kit: PanelKit, kind: ExtinguisherKind) {
  const t = tools(kit);
  const group = new Group();
  const [band, name] = BANDS[kind];
  const body = t.cyl(
    group,
    t.paint('#c4231c', 0.35),
    0.075,
    0.5,
    0,
    0.55,
    0.11,
    'y',
    20,
  );
  t.cyl(group, t.paint(band, 0.4), 0.0755, 0.07, 0, 0.66, 0.11, 'y', 20);
  t.cyl(group, t.paint('#1b1b1b', 0.5), 0.02, 0.07, 0, 0.83, 0.11, 'y', 10);
  t.box(group, t.paint('#2a2a2a', 0.5), 0.12, 0.012, 0.03, 0.03, 0.88, 0.11);
  const pin = t.cyl(
    group,
    t.paint('#d8d0b4', 0.3, 0.7),
    0.004,
    0.04,
    -0.03,
    0.86,
    0.13,
    'z',
    6,
  );
  if (kind === 'co2') {
    const horn = t.cyl(
      group,
      t.paint('#1b1b1b', 0.5),
      0.02,
      0.22,
      0.1,
      0.55,
      0.11,
      'y',
      10,
    );
    horn.rotation.z = 0.15;
  } else {
    const hose = t.cyl(
      group,
      t.paint('#1b1b1b', 0.6),
      0.008,
      0.4,
      0.085,
      0.62,
      0.11,
      'y',
      8,
    );
    hose.rotation.z = 0.08;
  }
  t.box(group, t.paint('#333333', 0.5), 0.08, 0.04, 0.03, 0, 0.82, 0.015);
  const sign = t.printed(
    0.14,
    0.1,
    (c, w, h) => {
      c.fillStyle = '#c4231c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = band === '#c4231c' ? '#ffffff' : band;
      c.fillRect(0, h * 0.55, w, h * 0.45);
      c.fillStyle = band === '#efe3b8' ? '#1b1b1b' : '#ffffff';
      if (band === '#c4231c') c.fillStyle = '#c4231c';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.24}px ${SANS}`;
      c.fillText(name, w / 2, h * 0.86);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.2}px ${SANS}`;
      c.fillText('FIRE', w / 2, h * 0.36);
    },
    192,
  );
  sign.mesh.position.set(0, 1.12, 0.002);
  group.add(sign.mesh);
  const label = t.label(
    group,
    kind === 'co2' ? 'CO₂' : name,
    0,
    0.5,
    0.186,
    0.012,
    '#ffffff',
    null,
  );
  label.rotation.y = 0;
  // The discharge: a cloud of its agent from the nozzle.
  const count = 240;
  const positions = new Float32Array(count * 3);
  const life = new Float32Array(count).map(() => Math.random());
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const cloud = new Points(
    geometry,
    new PointsMaterial({
      color:
        kind === 'water'
          ? '#a9c6dc'
          : kind === 'powder'
            ? '#e9e6f2'
            : '#f4f4f0',
      size: (kind === 'water' ? 0.03 : 0.08) * METRE,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  kit.materials.push(cloud.material as Material);
  cloud.visible = false;
  cloud.frustumCulled = false;
  group.add(cloud);
  let spraying = false;
  return {
    group,
    body,
    set(state: 'ready' | 'unpinned' | 'discharging' | 'empty') {
      pin.visible = state === 'ready';
      spraying = state === 'discharging';
      cloud.visible = spraying;
    },
    update(delta: number) {
      if (!spraying) return;
      for (let i = 0; i < count; i++) {
        life[i] = (life[i] + delta * 1.4) % 1;
        const s = life[i];
        const spread = s * 0.4;
        positions[i * 3] = 0.12 + Math.sin(i * 12.9898) * spread;
        positions[i * 3 + 1] = 0.45 + Math.cos(i * 78.233) * spread * 0.6;
        positions[i * 3 + 2] = 0.2 + s * 1.6;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * A fire door held open by an electromagnetic door holder: the leaf on
 * its hinge, its closer, the holder on the wall and the keeper on the
 * leaf. The door swings to its target angle; `set` the target.
 */
export function createHeldFireDoor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#eeece4', 0.5);
  t.box(group, frame, 1.08, 0.06, 0.12, 0, 2.11, 0);
  for (const x of [-0.51, 0.51])
    t.box(group, frame, 0.06, 2.14, 0.12, x, 1.07, 0);
  t.box(group, t.paint('#1d2326', 0.6), 0.96, 2.08, 0.02, 0, 1.04, -0.05);
  const hinge = new Group();
  hinge.position.set(-0.48, 0, 0.04);
  group.add(hinge);
  const leaf = t.box(
    hinge,
    t.paint('#c79d64', 0.5),
    0.93,
    2.04,
    0.045,
    0.465,
    1.02,
    0,
  );
  t.box(hinge, t.paint('#1d2326', 0.08, 0.3), 0.16, 0.8, 0.05, 0.69, 1.45, 0);
  t.box(hinge, t.paint('#cfd2d2', 0.2, 0.9), 0.03, 0.03, 0.06, 0.87, 0.3, 0.03);
  t.box(
    hinge,
    t.paint('#cfd2d2', 0.2, 0.9),
    0.32,
    0.06,
    0.06,
    0.25,
    1.98,
    0.05,
  );
  const sign = t.printed(
    0.18,
    0.18,
    (c, w, h) => {
      c.fillStyle = '#1d4f9c';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.12}px ${SANS}`;
      c.fillText('FIRE DOOR', w / 2, h * 0.36);
      c.fillText('KEEP CLOSED', w / 2, h * 0.52);
      c.font = `${h * 0.08}px ${SANS}`;
      c.fillText('WHEN NOT IN USE', w / 2, h * 0.66);
    },
    128,
  );
  sign.mesh.position.set(0.465, 1.62, 0.024);
  hinge.add(sign.mesh);
  // A short return wall beside the hinge, and the holder on it, where the
  // open leaf's edge comes to rest.
  t.box(group, t.paint('#dcdad2', 0.8), 0.1, 2.2, 1.0, -0.62, 1.1, 0.55);
  const holder = t.box(
    group,
    t.paint('#b9bcbe', 0.3, 0.6),
    0.06,
    0.08,
    0.08,
    -0.54,
    0.3,
    0.9,
  );
  const holderLamp = t.led(group, '#35e06a', 0.004, -0.54, 0.36, 0.95);
  let angle = 0;
  let target = 0;
  return {
    group,
    leaf,
    holder,
    /** Open (swung into the room, back against the holder) or shut. */
    setTarget(open: boolean) {
      target = open ? -1.5 : 0;
    },
    setHolder(energised: boolean) {
      holderLamp.set(energised);
    },
    get open() {
      return target !== 0;
    },
    update(delta: number) {
      angle += (target - angle) * Math.min(1, delta * (target ? 4 : 1.6));
      hinge.rotation.y = angle;
    },
  };
}

// ---- Power --------------------------------------------------------------

/** A twin switched socket with a tester plugged into each side. */
export function createTwinSocket(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.146, 0.086, 0.01, 0, 0, 0.005);
  const sides = [-0.036, 0.036].map((x) => {
    for (const [w, h, dx, dy] of [
      [0.004, 0.009, 0, 0.004],
      [0.008, 0.004, -0.011, -0.012],
      [0.008, 0.004, 0.011, -0.012],
    ] as const)
      t.box(group, t.paint('#1b1b1b'), w, h, 0.002, x + dx, dy - 0.006, 0.0105);
    const pivot = new Group();
    pivot.position.set(x + 0.026, 0.026, 0.01);
    group.add(pivot);
    const rocker = t.box(
      pivot,
      t.paint('#ecebe4', 0.3),
      0.012,
      0.02,
      0.006,
      0,
      0,
      0.003,
    );
    const flag = t.box(
      pivot,
      t.paint('#c4231c'),
      0.008,
      0.004,
      0.0008,
      0,
      0.005,
      0.0062,
    );
    // A plug-in socket tester: three LEDs that light when the socket is live.
    const tester = new Group();
    tester.position.set(x, -0.006, 0.01);
    group.add(tester);
    t.box(tester, t.paint('#f2d33a', 0.4), 0.044, 0.05, 0.03, 0, 0, 0.015);
    const lamps = [-0.012, 0, 0.012].map((dx) =>
      t.led(tester, '#ffb020', 0.003, dx, 0.012, 0.0305),
    );
    return {
      rocker,
      set(on: boolean, live: boolean) {
        pivot.rotation.x = on ? -0.15 : 0.15;
        flag.visible = on;
        for (const lamp of lamps) lamp.set(live);
      },
    };
  });
  return { group, sides };
}

/** A switched fused spur: its switch, fuse carrier and neon. */
export function createFusedSpur(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const pivot = new Group();
  pivot.position.set(0.018, 0.016, 0.01);
  group.add(pivot);
  const rocker = t.box(
    pivot,
    t.paint('#ecebe4', 0.3),
    0.016,
    0.026,
    0.006,
    0,
    0,
    0.003,
  );
  t.box(
    group,
    t.paint('#e3e2da', 0.3),
    0.022,
    0.03,
    0.006,
    -0.018,
    0.012,
    0.013,
  );
  t.label(group, 'FUSE', -0.018, -0.008, 0.0105, 0.004);
  const neon = t.led(group, '#ff4a2a', 0.004, 0.018, -0.025, 0.011);
  return {
    group,
    rocker,
    set(on: boolean, live: boolean) {
      pivot.rotation.x = on ? -0.15 : 0.15;
      neon.set(live);
    },
  };
}

/** A flip-lid floor box flush in the floor, facing up; `set` it open. */
export function createFloorBox(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#9da3a4', 0.35, 0.6), 0.33, 0.004, 0.33, 0, 0.002, 0);
  t.box(group, t.paint('#141414', 0.9), 0.3, 0.003, 0.3, 0, 0.003, 0);
  const sockets = t.printed(
    0.15,
    0.09,
    (c, w, h) => {
      c.fillStyle = PLATE_WHITE;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1c1c1c';
      for (const cx of [w * 0.27, w * 0.73]) {
        c.fillRect(cx - 5, h * 0.3, 10, 22);
        c.fillRect(cx - 32, h * 0.65, 18, 9);
        c.fillRect(cx + 14, h * 0.65, 18, 9);
      }
    },
    256,
  );
  sockets.mesh.rotation.x = -Math.PI / 2;
  sockets.mesh.position.set(-0.05, 0.005, 0.05);
  group.add(sockets.mesh);
  const hinge = new Group();
  hinge.position.set(0, 0.006, -0.15);
  group.add(hinge);
  const lid = t.box(
    hinge,
    t.paint('#7f888b', 0.4),
    0.3,
    0.008,
    0.3,
    0,
    0,
    0.15,
  );
  return {
    group,
    lid,
    set(open: boolean) {
      hinge.rotation.x = open ? -1.8 : 0;
    },
  };
}

/**
 * A distribution board: its steel box and door, the main switch and a
 * breaker for each circuit, with their labels.
 */
export function createDistributionBoard(kit: PanelKit, circuits: string[]) {
  const t = tools(kit);
  const group = new Group();
  const w = 0.12 + circuits.length * 0.05;
  t.box(group, t.paint('#e4e4df', 0.4, 0.2), w, 0.32, 0.11, 0, 0, 0.055);
  t.box(group, t.paint('#2c2f31', 0.5), w - 0.04, 0.1, 0.004, 0, 0.02, 0.111);
  const handle = (x: number, red = false) => {
    const pivot = new Group();
    pivot.position.set(x, 0.02, 0.113);
    group.add(pivot);
    t.box(pivot, t.paint('#f2f1ea', 0.4), 0.034, 0.08, 0.02, 0, 0, 0.01);
    const lever = t.box(
      pivot,
      t.paint(red ? '#c4231c' : '#2b2b2b', 0.4),
      0.014,
      0.026,
      0.022,
      0,
      0,
      0.026,
    );
    return {
      lever,
      set(on: boolean) {
        lever.position.y = on ? 0.016 : -0.016;
      },
    };
  };
  const main = handle(-w / 2 + 0.05, true);
  t.label(group, 'MAIN\nSWITCH', -w / 2 + 0.05, -0.04, 0.112, 0.006);
  const breakers = circuits.map((name, i) => {
    const x = -w / 2 + 0.11 + i * 0.05;
    t.label(group, name, x, -0.04, 0.112, 0.0055);
    return handle(x);
  });
  t.label(group, 'DISTRIBUTION BOARD  DB1', 0, 0.12, 0.111, 0.009);
  t.label(group, 'DANGER 230 V', 0, -0.12, 0.111, 0.009, '#c4231c');
  return { group, main, breakers };
}

// ---- Climate ------------------------------------------------------------

/** An air-conditioning wall controller: LCD and four buttons. */
export function createAcController(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.12, 0.12, 0.022, 0, 0, 0.011);
  const screen = t.printed(0.09, 0.05, () => {}, 256, true);
  screen.mesh.position.set(0, 0.022, 0.0225);
  group.add(screen.mesh);
  const names = ['ON/OFF', 'MODE', '▼', '▲'] as const;
  const buttons = names.map((name, i) => {
    const x = -0.042 + i * 0.028;
    const b = t.box(
      group,
      t.paint('#d9d8d1', 0.3),
      0.022,
      0.012,
      0.006,
      x,
      -0.03,
      0.025,
    );
    t.label(group, name, x, -0.045, 0.0222, 0.004);
    return b;
  });
  let last = '';
  return {
    group,
    power: buttons[0],
    mode: buttons[1],
    down: buttons[2],
    up: buttons[3],
    set(
      on: boolean,
      mode: string,
      setpoint: number,
      room: number,
      running: boolean,
    ) {
      const text = `${on}|${mode}|${setpoint}|${room.toFixed(1)}|${running}`;
      if (text === last) return;
      last = text;
      const c = screen.context;
      const w = c.canvas.width;
      const h = c.canvas.height;
      c.fillStyle = on ? '#a9c7d8' : '#5d6b72';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#10232d';
      c.font = `bold ${h * 0.26}px monospace`;
      if (on) {
        c.fillText(`${mode.toUpperCase()}${running ? '  ~' : ''}`, 8, h * 0.3);
        c.font = `bold ${h * 0.42}px monospace`;
        c.fillText(`${setpoint.toFixed(1)}°`, 8, h * 0.75);
      }
      c.font = `${h * 0.2}px monospace`;
      c.fillText(`ROOM ${room.toFixed(1)}°`, w * 0.5, h * 0.9);
      screen.texture.needsUpdate = true;
    },
  };
}

/** A four-way ceiling cassette whose vanes swing open while it runs. */
export function createAcCassette(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#f0efe8', 0.4), 0.62, 0.03, 0.62, 0, -0.015, 0);
  t.box(group, t.paint('#c9c8c0', 0.5), 0.28, 0.005, 0.28, 0, -0.033, 0);
  const vanes = [0, 1, 2, 3].map((i) => {
    const pivot = new Group();
    const a = (i * Math.PI) / 2;
    pivot.position.set(Math.sin(a) * 0.23, -0.032, Math.cos(a) * 0.23);
    pivot.rotation.y = a;
    group.add(pivot);
    t.box(pivot, t.paint('#3d3f40', 0.5), 0.4, 0.004, 0.05, 0, 0, 0);
    return pivot;
  });
  let open = 0;
  let target = 0;
  return {
    group,
    set(running: boolean) {
      target = running ? 0.7 : 0;
    },
    update(delta: number) {
      open += (target - open) * Math.min(1, delta * 2);
      for (const vane of vanes) vane.rotation.x = open;
    },
  };
}

/** A dial room thermostat: its dial and its "calling for heat" lamp. */
export function createThermostat(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.045, 0.025, 0, 0, 0.0125, 'z', 32);
  const dial = t.cyl(
    group,
    t.paint('#e3e2da', 0.3),
    0.036,
    0.012,
    0,
    0,
    0.031,
    'z',
    32,
  );
  t.box(dial, t.paint('#c4231c'), 0.003, 0.004, 0.026, 0, 0.007, 0.0);
  const face = t.printed(
    0.06,
    0.012,
    (c, w, h) => {
      c.fillStyle = PLATE_WHITE;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#333';
      c.font = `${h * 0.8}px ${SANS}`;
      c.fillText('5   10   15   20   25   30', 2, h * 0.85);
    },
    256,
  );
  face.mesh.position.set(0, 0.05, 0.002);
  group.add(face.mesh);
  const lamp = t.led(group, '#ff6a2a', 0.004, 0.032, -0.03, 0.026);
  return {
    group,
    dial,
    set(setpoint: number, calling: boolean) {
      dial.rotation.y = -(((setpoint - 5) / 25) * 1.6 - 0.8) * Math.PI;
      lamp.set(calling);
    },
  };
}

/** A panel radiator with a thermostatic valve; warms in colour as it heats. */
export function createRadiator(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const material = t.paint('#f2f1ea', 0.4);
  t.box(group, material, 1.0, 0.6, 0.08, 0, 0.45, 0.07);
  for (let x = -0.47; x <= 0.47; x += 0.05)
    t.box(group, material, 0.012, 0.58, 0.004, x, 0.45, 0.112);
  const head = t.cyl(
    group,
    t.paint('#f6f5ef', 0.4),
    0.025,
    0.07,
    0.55,
    0.22,
    0.07,
    'y',
    20,
  );
  t.cyl(
    group,
    t.paint('#c9c9c3', 0.3, 0.8),
    0.012,
    0.08,
    0.55,
    0.14,
    0.07,
    'y',
    10,
  );
  const marker = t.box(
    head,
    t.paint('#1b1b1b'),
    0.004,
    0.06,
    0.004,
    0,
    0,
    0.026,
  );
  void marker;
  const cold = new Color('#f2f1ea');
  const hot = new Color('#f7d2b8');
  return {
    group,
    head,
    set(valve: number, heat: number) {
      head.rotation.y = (valve / 5) * Math.PI * 1.5;
      (material as unknown as { color: Color }).color
        .copy(cold)
        .lerp(hot, heat);
    },
  };
}

/** A window with a top-hung opening vent on its restrictor, and blinds. */
export function createWindowWithVent(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const alu = t.paint('#5c6267', 0.45, 0.45);
  const glass = createPs1Material({
    color: '#a8b9bc',
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
  });
  kit.materials.push(glass);
  t.box(group, alu, 1.3, 0.06, 0.1, 0, 0, 0);
  t.box(group, alu, 1.3, 0.06, 0.1, 0, 1.6, 0);
  for (const x of [-0.62, 0.62]) t.box(group, alu, 0.06, 1.6, 0.1, x, 0.8, 0);
  t.box(group, alu, 1.3, 0.05, 0.1, 0, 1.2, 0);
  t.box(group, glass, 1.18, 1.15, 0.01, 0, 0.6, 0);
  const sky = kitGlow(kit, '#c9ccd0');
  t.box(group, sky, 1.3, 1.6, 0.01, 0, 0.8, -0.2);
  const hinge = new Group();
  hinge.position.set(0, 1.57, 0.02);
  group.add(hinge);
  const sash = t.box(hinge, alu, 1.18, 0.34, 0.05, 0, -0.18, 0);
  sash.material = alu;
  t.box(hinge, glass, 1.1, 0.28, 0.01, 0, -0.18, 0.01);
  const handle = t.box(
    group,
    t.paint('#d8d8d2', 0.3, 0.6),
    0.1,
    0.02,
    0.03,
    0,
    1.24,
    0.08,
  );
  // Vertical blinds in front.
  const slats: Group[] = [];
  for (let x = -0.58; x <= 0.58; x += 0.08) {
    const pivot = new Group();
    pivot.position.set(x, 0.85, 0.2);
    group.add(pivot);
    const slat = new Mesh(
      new BoxGeometry(0.089, 1.5, 0.003),
      createPs1Material({
        color: '#e6e2d4',
        roughness: 0.85,
        side: DoubleSide,
      }),
    );
    kit.materials.push(slat.material as Material);
    pivot.add(slat);
    slats.push(pivot);
  }
  const headrail = t.box(
    group,
    t.paint('#efeee6', 0.4),
    1.3,
    0.04,
    0.06,
    0,
    1.62,
    0.2,
  );
  return {
    group,
    handle,
    sash,
    headrail,
    slats,
    set(vent: boolean, blindsOpen: boolean) {
      hinge.rotation.x = vent ? -0.18 : 0;
      for (const slat of slats) slat.rotation.y = blindsOpen ? 1.4 : 0.05;
    },
  };
}

/** A wall extractor fan: grille and blades that spin while it runs. */
export function createExtractorFan(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.4), 0.16, 0.16, 0.04, 0, 0, 0.02);
  t.cyl(group, t.paint('#1b1b1b', 0.8), 0.06, 0.005, 0, 0, 0.03, 'z', 24);
  const rotor = new Group();
  rotor.position.z = 0.034;
  group.add(rotor);
  for (let i = 0; i < 5; i++) {
    const blade = t.box(
      rotor,
      t.paint('#d9d8d1', 0.5),
      0.012,
      0.05,
      0.002,
      0,
      0.028,
      0,
    );
    const holder = new Group();
    holder.rotation.z = (i / 5) * Math.PI * 2;
    holder.add(blade);
    rotor.add(holder);
  }
  for (let y = -0.05; y <= 0.05; y += 0.02)
    t.box(group, t.paint('#f0efe8', 0.4), 0.13, 0.006, 0.006, 0, y, 0.042);
  let speed = 0;
  let running = false;
  return {
    group,
    set(value: boolean) {
      running = value;
    },
    update(delta: number) {
      speed += ((running ? 20 : 0) - speed) * Math.min(1, delta * 0.8);
      rotor.rotation.z += speed * delta;
    },
  };
}

// ---- Access and welfare -------------------------------------------------

/**
 * An access controlled door: the leaf on its hinge, the maglock over it,
 * a card reader, a push-to-exit button and a green emergency door release.
 */
export function createAccessDoor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#eeece4', 0.5);
  t.box(group, frame, 1.08, 0.06, 0.12, 0, 2.11, 0);
  for (const x of [-0.51, 0.51])
    t.box(group, frame, 0.06, 2.14, 0.12, x, 1.07, 0);
  t.box(group, t.paint('#1d2326', 0.6), 0.96, 2.08, 0.02, 0, 1.04, -0.05);
  const hinge = new Group();
  hinge.position.set(-0.48, 0, 0.04);
  group.add(hinge);
  const leaf = t.box(
    hinge,
    t.paint('#8f9aa0', 0.45, 0.2),
    0.93,
    2.04,
    0.045,
    0.465,
    1.02,
    0,
  );
  t.box(
    hinge,
    t.paint('#cfd2d2', 0.2, 0.9),
    0.14,
    0.022,
    0.05,
    0.8,
    1.02,
    0.05,
  );
  t.box(group, t.paint('#c9cccc', 0.3, 0.7), 0.3, 0.05, 0.05, 0.25, 2.05, 0.08);
  // The reader, the exit button and the release, beside the door.
  const reader = new Group();
  reader.position.set(0.75, 1.2, 0);
  group.add(reader);
  const readerBody = t.box(
    reader,
    t.paint('#1e2124', 0.4),
    0.08,
    0.12,
    0.025,
    0,
    0,
    0.0125,
  );
  const readerLamp = t.led(reader, '#ff3020', 0.006, 0, 0.04, 0.026);
  const greenLamp = t.led(reader, '#35e06a', 0.006, 0.02, 0.04, 0.026);
  t.label(reader, 'PRESENT CARD', 0, -0.03, 0.0255, 0.006, '#e8e8e2');
  const exitPlate = new Group();
  exitPlate.position.set(0.75, 1.0, 0);
  group.add(exitPlate);
  t.box(exitPlate, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const exitButton = t.cyl(
    exitPlate,
    t.paint('#2fa04a', 0.4),
    0.025,
    0.01,
    0,
    0.006,
    0.014,
    'z',
    24,
  );
  t.label(exitPlate, 'PUSH TO EXIT', 0, -0.032, 0.0105, 0.005);
  const release = new Group();
  release.position.set(0.75, 1.5, 0);
  group.add(release);
  t.box(release, t.paint('#1d8a43', 0.4), 0.09, 0.09, 0.05, 0, 0, 0.025);
  const releaseFace = t.printed(
    0.07,
    0.07,
    (c, w, h) => {
      c.fillStyle = '#eef0ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d8a43';
      c.textAlign = 'center';
      c.font = `bold ${w * 0.11}px ${SANS}`;
      c.fillText('EMERGENCY', w / 2, h * 0.3);
      c.fillText('DOOR', w / 2, h * 0.46);
      c.fillText('RELEASE', w / 2, h * 0.62);
      c.font = `${w * 0.08}px ${SANS}`;
      c.fillText('PUSH HERE', w / 2, h * 0.84);
    },
    128,
  );
  releaseFace.mesh.position.z = 0.0505;
  release.add(releaseFace.mesh);
  const releaseFlag = t.box(
    release,
    t.paint('#f2c618', 0.4),
    0.05,
    0.012,
    0.002,
    0,
    -0.022,
    0.052,
  );
  const releaseKey = t.cyl(
    release,
    t.paint('#1b1b1b', 0.5),
    0.004,
    0.004,
    0.036,
    -0.036,
    0.051,
    'z',
    10,
  );
  let angle = 0;
  let target = 0;
  return {
    group,
    leaf,
    reader: readerBody,
    exitButton,
    release: releaseFace.mesh,
    releaseKey,
    set(locked: boolean, open: boolean, broken: boolean) {
      readerLamp.set(locked);
      greenLamp.set(!locked);
      target = open ? -1.3 : 0;
      releaseFlag.visible = broken;
      releaseFace.mesh.position.z = broken ? 0.047 : 0.0505;
    },
    update(delta: number) {
      angle += (target - angle) * Math.min(1, delta * 3);
      hinge.rotation.y = angle;
    },
  };
}

/** A door entry intercom: speaker grille and call button. */
export function createIntercom(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#c9cccc', 0.3, 0.7), 0.1, 0.18, 0.02, 0, 0, 0.01);
  for (let y = 0.03; y < 0.08; y += 0.01)
    t.box(group, t.paint('#2a2a2a'), 0.06, 0.004, 0.002, 0, y, 0.021);
  const button = t.cyl(
    group,
    t.paint('#d9d8d1', 0.3, 0.6),
    0.018,
    0.008,
    0,
    -0.04,
    0.024,
    'z',
    24,
  );
  t.label(group, 'RECEPTION', 0, -0.07, 0.021, 0.006);
  return { group, button };
}

/**
 * An accessible toilet's emergency alarm: the red pull cord with its two
 * bangles, the reset button plate, and the over-door light.
 */
export function createToiletAlarm(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#c4231c', 0.6);
  // The cord hangs from the ceiling at y = 0 down to near the floor.
  const cord = new Group();
  group.add(cord);
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.035, 0.03, 0, -0.015, 0);
  t.cyl(cord, red, 0.002, 2.4, 0, -1.23, 0, 'y', 6);
  for (const y of [-1.6, -2.35]) {
    const bangle = new Mesh(new TorusGeometry(0.025, 0.004, 6, 16), red);
    bangle.position.set(0, y, 0);
    cord.add(bangle);
  }
  const bangle = cord.children[cord.children.length - 1] as Mesh;
  let dip = 0;
  return {
    group,
    bangle,
    cord,
    pull() {
      dip = 1;
    },
    update(delta: number) {
      dip = Math.max(0, dip - delta * 3);
      cord.position.y = -Math.sin(dip * Math.PI) * 0.08;
    },
  };
}

/** The toilet alarm's reset plate: RESET button and acknowledge lamp. */
export function createAlarmReset(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const button = t.cyl(
    group,
    t.paint('#c4231c', 0.4),
    0.016,
    0.008,
    0,
    -0.004,
    0.014,
    'z',
    20,
  );
  t.label(group, 'ALARM RESET', 0, -0.032, 0.0105, 0.005);
  const lamp = t.led(group, '#ff3020', 0.005, 0, 0.026, 0.011);
  return { group, button, set: lamp.set };
}

/** An over-door alarm light: a red dome that flashes in alarm. */
export function createOverDoorLight(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.4), 0.12, 0.08, 0.03, 0, 0, 0.015);
  const lens = kitGlow(kit, '#ff3020');
  const dome = new Mesh(
    new SphereGeometry(0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lens,
  );
  dome.rotation.x = Math.PI / 2;
  dome.position.z = 0.03;
  group.add(dome);
  const off = new Color('#5a1d18');
  const on = new Color('#ff4a35');
  let time = 0;
  let alarm = false;
  return {
    group,
    set(value: boolean) {
      alarm = value;
    },
    update(delta: number) {
      time += delta;
      lens.color.copy(alarm && time % 0.8 < 0.4 ? on : off);
    },
  };
}

/** A wall-mounted title board for a section of dev8. */
export function createSectionBoard(
  kit: PanelKit,
  title: string,
  width: number,
) {
  const t = tools(kit);
  const group = new Group();
  const sign = t.printed(
    width,
    0.16,
    (c, w, h) => {
      c.fillStyle = '#20302b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8e2cc';
      c.font = `bold ${h * 0.55}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText(title, h * 0.3, h / 2);
    },
    Math.round(width * 600),
  );
  group.add(sign.mesh);
  return group;
}

/** A yellow warning sign, black lettering and border, `w` × `h` metres. */
export function createWarningSign(
  kit: PanelKit,
  lines: string[],
  w = 0.3,
  h = 0.2,
) {
  const t = tools(kit);
  const sign = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#f2c618';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#151515';
      c.lineWidth = ch * 0.05;
      c.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1);
      c.fillStyle = '#151515';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const size = (ch * 0.7) / lines.length;
      lines.forEach((line, i) => {
        // Each line as large as it can be, within the border.
        let px = i === 0 ? size * 1.15 : size * 0.8;
        c.font = `bold ${px}px ${SANS}`;
        const width = c.measureText(line).width;
        if (width > cw * 0.86) px *= (cw * 0.86) / width;
        c.font = `bold ${px}px ${SANS}`;
        c.fillText(
          line,
          cw / 2,
          ch * 0.5 + (i - (lines.length - 1) / 2) * size * 1.05,
        );
      });
    },
    384,
  );
  return sign.mesh;
}

/** A small engraved caption for a fitting. */
export function createCaption(kit: PanelKit, text: string) {
  return createMicroLabel(kit, text, { height: 0.016, ink: '#2a2a28' });
}

/** A ceiling loudspeaker of the voice alarm, hanging from y = 0. */
export function createCeilingSpeaker(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.11, 0.01, 0, -0.005, 0, 'y', 32);
  const ring = t.paint('#c9c8c0', 0.5);
  for (let r = 0.02; r < 0.1; r += 0.016) {
    const torus = new Mesh(new TorusGeometry(r, 0.0015, 4, 32), ring);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = -0.011;
    group.add(torus);
  }
  return { group };
}

/** An electric fire bell: a red gong on its base, its striker under it. */
export function createFireBell(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#c4231c', 0.3, 0.4);
  t.cyl(group, red, 0.05, 0.03, 0, 0, 0.015, 'z', 24);
  const gong = new Mesh(
    new SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6),
    red,
  );
  gong.rotation.x = Math.PI / 2;
  gong.position.z = 0.03;
  group.add(gong);
  const striker = t.box(
    group,
    t.paint('#2a2a2a', 0.5),
    0.01,
    0.03,
    0.01,
    0,
    -0.07,
    0.05,
  );
  let time = 0;
  let ringing = false;
  return {
    group,
    set(value: boolean) {
      ringing = value;
    },
    update(delta: number) {
      time += delta;
      striker.position.x = ringing ? Math.sin(time * 120) * 0.004 : 0;
    },
  };
}

/**
 * A steel waste-paper bin, and the fire in it: flames that grow with the
 * fire's size (0 to 1) and flicker, and an orange light the room adds.
 */
export function createBinFire(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const bin = new Mesh(
    new CylinderGeometry(0.15, 0.12, 0.36, 20, 1, true),
    createPs1Material({
      color: '#6d7376',
      roughness: 0.5,
      metalness: 0.6,
      side: DoubleSide,
    }),
  );
  kit.materials.push(bin.material as Material);
  bin.position.y = 0.18;
  group.add(bin);
  t.cyl(group, t.paint('#2a2522', 0.9), 0.12, 0.01, 0, 0.005, 0);
  const flames = new Group();
  flames.position.y = 0.3;
  group.add(flames);
  const colours = ['#ff9a2a', '#ffcf4a', '#ff5a1a'];
  const tongues = colours.map((colour, i) => {
    const material = kitGlow(kit, colour);
    material.transparent = true;
    material.opacity = 0.85;
    const cone = new Mesh(
      new CylinderGeometry(0, 0.09 - i * 0.02, 0.4, 10),
      material,
    );
    cone.position.set((i - 1) * 0.04, 0.2, (i % 2) * 0.03);
    flames.add(cone);
    return cone;
  });
  // Smoke: grey puffs rising from the bin in a plume, then spreading out
  // under the ceiling, as a real ceiling jet does.
  const count = 420;
  const positions = new Float32Array(count * 3);
  const life = new Float32Array(count).map(() => Math.random());
  const drift = new Float32Array(count * 2).map(() => Math.random() * 2 - 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const puffs = new PointsMaterial({
    map: softDot(kit),
    color: '#5a5a58',
    size: 0.35 * METRE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  kit.materials.push(puffs);
  const cloud = new Points(geometry, puffs);
  cloud.frustumCulled = false;
  group.add(cloud);
  let time = 0;
  let size = 0;
  let smoke = 0;
  return {
    group,
    set(value: number, smokiness = 0) {
      size = value;
      smoke = smokiness;
    },
    update(delta: number) {
      time += delta;
      puffs.opacity = Math.min(0.45, smoke * 0.5);
      cloud.visible = smoke > 0.02;
      if (cloud.visible)
        for (let i = 0; i < count; i++) {
          life[i] = (life[i] + delta * 0.25) % 1;
          const s = life[i];
          // Up the plume, then out under the ceiling.
          const rise = Math.min(1, s / 0.4);
          const spread = Math.max(0, s - 0.4) * 11;
          positions[i * 3] = drift[i * 2] * (0.08 + spread);
          positions[i * 3 + 1] =
            0.5 + rise * 2.0 + Math.min(0.12, spread * 0.02);
          positions[i * 3 + 2] = drift[i * 2 + 1] * (0.08 + spread);
        }
      geometry.attributes.position.needsUpdate = cloud.visible;
      flames.visible = size > 0.001;
      const scale = 0.4 + size * 2.2;
      tongues.forEach((cone, i) => {
        const flicker = 1 + 0.25 * Math.sin(time * (11 + i * 3.7) + i);
        cone.scale.set(scale, scale * flicker, scale);
        cone.position.y = 0.2 * scale * flicker;
      });
    },
  };
}

export { kitPaint };
