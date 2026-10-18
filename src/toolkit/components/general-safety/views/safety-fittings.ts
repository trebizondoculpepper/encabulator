import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { kitGlow } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PLATE_WHITE, SANS, tools } from '../../core/views/fitting-tools';

/**
 * Views of general safety fittings: the emergency lighting test key switch,
 * emergency lights and exit signs, the accessible WC's alarm pull cord,
 * reset and over-door light, and warning signs. They only draw:
 * `../parts/safety-parts.ts` gives them their behaviour.
 */

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
