import { Group, Mesh, PlaneGeometry } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createCanvasTexture } from '../../core/views/screens';
import { SLIDING_DOOR } from '../logic/sliding-door';

/**
 * The fittings of an office reception, placeholders at true size after
 * real products (dimensions from the makers' literature where given,
 * otherwise typical): the automatic sliding entrance and its air curtain,
 * a secured door with a proximity reader and keypad, and wayfinding signs.
 * Each is built in metres, facing +z (into the room), its mounting face at
 * z = 0 and its foot at y = 0 unless it says otherwise.
 */

/** Aluminium of a 1990s shopfront: natural silver anodised. */
const ANODISED = '#a9adb0';

/** A transparent glass material, one per kit. */
function glassOf(kit: PanelKit) {
  const glass = createPs1Material({
    color: '#b9c9cc',
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  kit.materials.push(glass);
  return glass;
}

/**
 * Manifestation (Approved Document K): a band of yellow dots across
 * glazing, so the glass is seen. Drawn on clear, for a strip 50 mm high.
 */
function manifestation(kit: PanelKit) {
  const { context: c, texture } = createCanvasTexture(256, 16);
  c.clearRect(0, 0, 256, 16);
  c.fillStyle = '#f2c11a';
  for (let x = 8; x < 256; x += 16) {
    c.beginPath();
    c.arc(x, 8, 6, 0, Math.PI * 2);
    c.fill();
  }
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    transparent: true,
    alphaTest: 0.4,
    roughness: 0.5,
  });
  kit.materials.push(material);
  return material;
}

/** A strip of manifestation `w` wide, its texture repeating every 0.4 m. */
function band(
  parent: Object3D,
  material: Material,
  w: number,
  y: number,
  z: number,
) {
  const geometry = new PlaneGeometry(w, 0.05);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * w) / 0.4);
  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, y, z);
  parent.add(mesh);
  // Seen from both sides of the glass.
  const back = mesh.clone();
  back.rotation.y = Math.PI;
  back.position.z = z - 0.004;
  parent.add(back);
}

/** The heights of the two bands of manifestation, metres (850–1000, 1400–1600). */
const BANDS = [0.925, 1.5];

/**
 * An automatic bi-parting sliding entrance after dormakaba's ES 200 on a
 * natural-anodised aluminium shopfront: two fixed side screens 850 mm
 * wide and two sliding leaves over a 1,600 mm clear opening, glazed to
 * 2,200 mm, with the drive in a header box 180 mm high on the inside, and
 * over it a small black motion sensor after BEA's Eagle (120 × 65 × 53
 * mm). Its foot is at the middle of the doorway; z = 0 is the inner face
 * of the wall (0.3 m thick), the screens in its middle. `set(open)` runs
 * the leaves (0 shut, 1 open).
 */
export function createSlidingEntrance(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'automatic sliding entrance';
  const alu = t.paint(ANODISED, 0.35, 0.6);
  const rubber = t.paint('#1c1d1e', 0.8);
  const glass = glassOf(kit);
  const dots = manifestation(kit);
  const clear = SLIDING_DOOR.travel * 2;
  const screen = 0.85;
  const width = clear + screen * 2;
  const head = 2.2;
  const wallMiddle = -0.15;
  // The frame: jambs, mullions, head and a floor track.
  for (const x of [-width / 2, width / 2])
    t.box(
      group,
      alu,
      0.05,
      head + 0.05,
      0.12,
      x,
      (head + 0.05) / 2,
      wallMiddle,
    );
  for (const x of [-clear / 2 - 0.02, clear / 2 + 0.02])
    t.box(group, alu, 0.04, head, 0.08, x, head / 2, wallMiddle);
  t.box(group, alu, width, 0.06, 0.12, 0, head + 0.03, wallMiddle);
  t.box(group, alu, width, 0.008, 0.3, 0, 0.004, wallMiddle);
  // The fixed side screens, with a bottom rail.
  for (const side of [-1, 1]) {
    const x = side * (clear / 2 + screen / 2);
    const pane = new Mesh(new PlaneGeometry(screen - 0.06, head - 0.1), glass);
    pane.position.set(x, head / 2 + 0.04, wallMiddle);
    group.add(pane);
    t.box(group, alu, screen - 0.04, 0.1, 0.06, x, 0.05, wallMiddle);
    const strips = new Group();
    strips.position.set(x, 0, wallMiddle + 0.004);
    group.add(strips);
    for (const y of BANDS) band(strips, dots, screen - 0.06, y, 0.002);
  }
  // The header box over the inside, holding the drive.
  t.box(group, alu, width, 0.18, 0.2, 0, head + 0.09, 0.1);
  t.box(
    group,
    t.paint('#8e9295', 0.4, 0.5),
    width - 0.02,
    0.004,
    0.18,
    0,
    head + 0.002,
    0.1,
  );
  // The motion sensor, in the middle of its face.
  const sensor = t.box(
    group,
    t.paint('#151617', 0.45),
    0.12,
    0.065,
    0.053,
    0,
    head + 0.09,
    0.2265,
  );
  sensor.name = 'motion sensor';
  t.box(
    group,
    t.paint('#3a2a2a', 0.15),
    0.06,
    0.02,
    0.002,
    0,
    head + 0.08,
    0.254,
  );
  // The two leaves, each 50 mm over its screen, inside the screens.
  const leafWidth = clear / 2 + 0.05;
  const leaves = [-1, 1].map((side) => {
    const leaf = new Group();
    leaf.name = 'sliding leaf';
    leaf.userData.live = true;
    group.add(leaf);
    const inner = new Group();
    inner.position.set((side * leafWidth) / 2 - side * 0.025, 0, 0.03);
    leaf.add(inner);
    const pane = new Mesh(
      new PlaneGeometry(leafWidth - 0.06, head - 0.18),
      glass,
    );
    pane.position.y = head / 2 + 0.01;
    inner.add(pane);
    t.box(inner, alu, leafWidth, 0.1, 0.045, 0, 0.06, 0);
    t.box(inner, alu, leafWidth, 0.06, 0.045, 0, head - 0.04, 0);
    for (const x of [-leafWidth / 2 + 0.02, leafWidth / 2 - 0.02])
      t.box(inner, alu, 0.04, head - 0.02, 0.045, x, head / 2, 0);
    // A rubber seal down the meeting edge.
    t.box(
      inner,
      rubber,
      0.012,
      head - 0.12,
      0.03,
      (-side * leafWidth) / 2,
      head / 2,
      0,
    );
    for (const y of BANDS) band(inner, dots, leafWidth - 0.06, y, 0.003);
    return { leaf, side };
  });
  return {
    group,
    width,
    leaves: leaves.map((l) => l.leaf),
    set(open: number) {
      for (const { leaf, side } of leaves)
        leaf.position.x = side * open * SLIDING_DOOR.travel;
    },
  };
}

/**
 * An air curtain over the entrance, after Thermoscreens' C2000 (a
 * 2,000 mm cream steel casing about 240 mm high and 250 mm deep; sizes
 * from the range's literature, taken as approximate): a slotted outlet
 * grille underneath blowing down across the doorway, an intake grille on
 * its face and a small green lamp. Hung on the wall: its back at z = 0,
 * its underside at y = 0.
 */
export function createAirCurtain(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'air curtain';
  const cream = t.paint('#e6dfca', 0.45, 0.1);
  const length = 2.0;
  t.box(group, cream, length, 0.24, 0.25, 0, 0.12, 0.125);
  t.box(
    group,
    t.paint('#9a968a', 0.5, 0.3),
    0.02,
    0.242,
    0.252,
    -length / 2,
    0.12,
    0.125,
  );
  t.box(
    group,
    t.paint('#9a968a', 0.5, 0.3),
    0.02,
    0.242,
    0.252,
    length / 2,
    0.12,
    0.125,
  );
  const slots =
    (rows: number, across: boolean) =>
    (c: CanvasRenderingContext2D, w: number, h: number) => {
      c.fillStyle = '#ddd6c1';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#4a4740';
      if (across)
        for (let x = 6; x < w - 4; x += 8) c.fillRect(x, h * 0.18, 3, h * 0.64);
      else
        for (let i = 0; i < rows; i++)
          c.fillRect(w * 0.02, (h * (i + 0.5)) / rows - 1.5, w * 0.96, 3);
    };
  // The outlet underneath: long slots across its length.
  const outlet = t.printed(length - 0.08, 0.1, slots(0, true), 512);
  outlet.mesh.rotation.x = Math.PI / 2;
  outlet.mesh.position.set(0, -0.001, 0.17);
  group.add(outlet.mesh);
  // The intake on its face: a band of horizontal louvres.
  const intake = t.printed(length - 0.3, 0.1, slots(6, false), 512);
  intake.mesh.position.set(-0.08, 0.13, 0.2505);
  group.add(intake.mesh);
  const lamp = t.led(group, '#35e06a', 0.004, length / 2 - 0.08, 0.12, 0.251);
  lamp.set(true);
  return { group, length };
}

/**
 * A secured door to the stairs: a beech-veneered fire door (926 × 2,040
 * mm leaf) in a painted hardwood frame, with a stainless lever, an
 * overhead closer, a kick plate and its signs, and beside it a
 * proximity reader with a keypad after Paxton's Net2 KP75 (taken as about
 * 150 × 85 × 25 mm). Its foot is at the middle of the doorway, z = 0 the
 * wall's face. `set(lamp)` lights the reader: 'idle', 'refused'.
 */
export function createSecuredDoor(kit: PanelKit, title: string) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'secured door';
  const frame = t.paint('#d9d6cd', 0.5);
  const beech = t.paint('#cfa978', 0.55);
  const steel = t.paint('#c9cccc', 0.25, 0.85);
  t.box(group, frame, 1.1, 0.07, 0.03, 0, 2.115, 0.015);
  for (const x of [-0.515, 0.515])
    t.box(group, frame, 0.07, 2.15, 0.03, x, 1.075, 0.015);
  const leaf = t.box(group, beech, 0.926, 2.04, 0.044, 0, 1.02, -0.01);
  leaf.name = 'door leaf';
  // Intumescent strip and smoke seal, a dark line round the leaf.
  t.box(group, t.paint('#2a2622', 0.8), 0.94, 0.006, 0.012, 0, 2.043, 0.008);
  t.box(group, steel, 0.88, 0.15, 0.002, 0, 0.09, 0.0125);
  // The lever on its rose, on the side away from the hinges.
  t.cyl(group, steel, 0.026, 0.012, 0.36, 1.0, 0.018, 'z', 20);
  t.cyl(group, steel, 0.0095, 0.13, 0.3, 1.0, 0.07, 'x', 12);
  t.cyl(group, steel, 0.0095, 0.05, 0.36, 1.0, 0.045, 'z', 12);
  // An overhead closer, after Dorma's TS83.
  t.box(
    group,
    t.paint('#b8bbbc', 0.35, 0.5),
    0.29,
    0.06,
    0.05,
    -0.2,
    1.97,
    0.037,
  );
  t.box(
    group,
    t.paint('#9fa3a4', 0.35, 0.5),
    0.25,
    0.015,
    0.02,
    -0.12,
    2.0,
    0.07,
  );
  // Its signs: the floor it leads to, and FIRE DOOR KEEP SHUT.
  const name = t.printed(
    0.3,
    0.1,
    (c, w, h) => {
      c.fillStyle = '#5b3f8c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold ${h * 0.3}px ${SANS}`;
      c.fillText(title, w / 2, h * 0.4);
      c.font = `${h * 0.17}px ${SANS}`;
      c.fillText('Authorised staff only', w / 2, h * 0.74);
    },
    384,
  );
  name.mesh.position.set(0, 1.62, 0.0125);
  group.add(name.mesh);
  const fire = t.printed(
    0.1,
    0.1,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1f5fa8';
      c.beginPath();
      c.arc(w / 2, h * 0.42, w * 0.34, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.11}px ${SANS}`;
      c.fillText('FIRE DOOR', w / 2, h * 0.4);
      c.fillText('KEEP SHUT', w / 2, h * 0.52);
      c.fillStyle = '#1f5fa8';
      c.font = `bold ${h * 0.09}px ${SANS}`;
      c.fillText('FIRE DOOR KEEP SHUT', w / 2, h * 0.9);
    },
    128,
  );
  fire.mesh.position.set(0, 1.43, 0.0125);
  group.add(fire.mesh);
  // The reader and keypad, on the wall beside the lever.
  const reader = new Group();
  reader.name = 'proximity reader';
  reader.position.set(0.72, 1.1, 0);
  group.add(reader);
  t.box(reader, t.paint('#1b1c1e', 0.4), 0.085, 0.15, 0.025, 0, 0, 0.0125);
  const keys = t.printed(
    0.06,
    0.08,
    (c, w, h) => {
      c.fillStyle = '#1b1c1e';
      c.fillRect(0, 0, w, h);
      c.font = `bold ${h * 0.12}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const labels = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '*',
        '0',
        '#',
      ];
      labels.forEach((label, i) => {
        const x = (w * ((i % 3) + 0.5)) / 3;
        const y = (h * (Math.floor(i / 3) + 0.5)) / 4;
        c.fillStyle = '#3c3e42';
        c.fillRect(x - w * 0.13, y - h * 0.09, w * 0.26, h * 0.18);
        c.fillStyle = '#e9e9e4';
        c.fillText(label, x, y);
      });
    },
    96,
  );
  keys.mesh.position.set(0, -0.025, 0.0255);
  reader.add(keys.mesh);
  t.label(reader, 'PRESENT CARD', 0, 0.035, 0.0255, 0.005, '#d8d8d2');
  const red = t.led(reader, '#ff3020', 0.004, -0.015, 0.06, 0.026);
  const green = t.led(reader, '#35e06a', 0.004, 0.015, 0.06, 0.026);
  return {
    group,
    leaf,
    reader,
    /** Light the reader: dim red while it waits, bright red when it refuses. */
    set(state: 'idle' | 'refused' | 'granted') {
      red.set(state === 'refused' ? 1 : state === 'idle' ? 0.45 : 0);
      green.set(state === 'granted');
    },
  };
}

/**
 * A wall-mounted wayfinding sign in a company's colours: a header bar
 * with `title` and a list of destinations, each with its arrow (an angle
 * in degrees, 0 up, 90 right). Flat-cut aluminium, `w` × `h` metres.
 */
export function createWayfindingSign(
  kit: PanelKit,
  options: {
    title: string;
    lines: readonly (readonly [string, number])[];
    colour: string;
    accent: string;
    w?: number;
    h?: number;
  },
) {
  const t = tools(kit);
  const { w = 0.8, h = 0.5 } = options;
  const group = new Group();
  group.name = `sign ${options.title}`;
  t.box(
    group,
    t.paint('#b9bcbd', 0.35, 0.6),
    w + 0.01,
    h + 0.01,
    0.006,
    0,
    0,
    0.003,
  );
  const face = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = options.colour;
      c.fillRect(0, 0, cw, ch);
      const bar = ch * 0.22;
      c.fillStyle = options.accent;
      c.fillRect(0, 0, cw, bar);
      c.fillStyle = options.colour;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.font = `bold ${bar * 0.5}px ${SANS}`;
      c.fillText(options.title, cw * 0.05, bar / 2);
      const rows = options.lines.length;
      const row = (ch - bar) / rows;
      options.lines.forEach(([text, angle], i) => {
        const y = bar + row * (i + 0.5);
        c.fillStyle = '#ffffff';
        c.font = `${row * 0.42}px ${SANS}`;
        c.fillText(text, cw * 0.05, y);
        // The arrow, at the right.
        c.save();
        c.translate(cw * 0.9, y);
        c.rotate((angle * Math.PI) / 180);
        c.beginPath();
        const s = row * 0.32;
        c.moveTo(0, -s);
        c.lineTo(s * 0.8, -s * 0.1);
        c.lineTo(s * 0.3, -s * 0.1);
        c.lineTo(s * 0.3, s);
        c.lineTo(-s * 0.3, s);
        c.lineTo(-s * 0.3, -s * 0.1);
        c.lineTo(-s * 0.8, -s * 0.1);
        c.closePath();
        c.fill();
        c.restore();
        if (i > 0) {
          c.fillStyle = 'rgba(255,255,255,0.35)';
          c.fillRect(cw * 0.05, bar + row * i - 1, cw * 0.9, 2);
        }
      });
    },
    640,
  );
  face.mesh.position.z = 0.0065;
  group.add(face.mesh);
  return group;
}
