import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { createMicroLabel, kitGlow, kitPaint } from './eighties-controls';
import type { PanelKit } from './eighties-controls';

/**
 * Heavy-duty 30 mm pilot devices, as fitted to the doors of American motor
 * control centres in the 1990s: oiltight push buttons with flush or
 * extended heads, a maintained mushroom-head emergency stop, lever
 * selector switches, a speed potentiometer and push-to-test pilot lights,
 * each in a black ring nut with its legend plate above. Real size in
 * metres, on the panel face, facing +z; a caller scales the group.
 * These are views only: each is worked by a component.
 */

const add = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
/** A cylinder standing out of the panel along +z. */
const disc = (
  parent: Object3D,
  radius: number,
  depth: number,
  material: Material,
  z: number,
  segments = 20,
  top = radius,
) => {
  const mesh = add(
    parent,
    new CylinderGeometry(top, radius, depth, segments),
    material,
    0,
    0,
    z + depth / 2,
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
};

/** The colours of 30 mm operator caps and lenses. */
export const OPERATOR_COLOURS = {
  red: '#c8261c',
  green: '#1f8a3a',
  black: '#1b1b1c',
  amber: '#e08a12',
  blue: '#1d4f9e',
  white: '#e9e6dc',
  yellow: '#e8c215',
} as const;
export type OperatorColour = keyof typeof OPERATOR_COLOURS;

/** The ring nut every 30 mm device is held by. */
function ringNut(kit: PanelKit, group: Group) {
  disc(group, 0.021, 0.004, kitPaint(kit, '#141415'), 0, 24);
  disc(group, 0.0165, 0.002, kitPaint(kit, '#26272a', 0.3), 0.004, 24);
}

/**
 * A legend plate: black anodised aluminium with white engraved letters,
 * clipped above the device. `yellow` gives the emergency stop's plate.
 */
export function createLegendPlate(
  kit: PanelKit,
  text: string,
  { width = 0.05, height = 0.014, yellow = false } = {},
) {
  const group = new Group();
  add(
    group,
    new BoxGeometry(width, height, 0.0012),
    kitPaint(kit, yellow ? '#e5bf14' : '#151516', 0.2),
    0,
    0,
    0.0006,
  );
  const label = createMicroLabel(kit, text, {
    height: height * 0.36,
    ink: yellow ? '#141414' : '#eeeae0',
  });
  label.position.z = 0.0013;
  group.add(label);
  return group;
}

/** An engraved phenolic nameplate: white letters cut through black. */
export function createNameplate(
  kit: PanelKit,
  text: string,
  { width = 0.1, height = 0.028, colour = '#121212', ink = '#f4f1e6' } = {},
) {
  const group = new Group();
  add(
    group,
    new BoxGeometry(width, height, 0.0016),
    kitPaint(kit, colour),
    0,
    0,
    0.0008,
  );
  const lines = text.split('\n').length;
  const label = createMicroLabel(kit, text, {
    height: (height * 0.42) / lines,
    ink,
  });
  label.position.z = 0.0017;
  group.add(label);
  for (const sx of [-1, 1])
    disc(
      group,
      0.0014,
      0.0008,
      kitPaint(kit, '#b9bbbd', 0.7),
      0.0016,
      8,
    ).position.x = sx * (width / 2 - 0.004);
  return group;
}

export interface PushButtonView {
  group: Group;
  /** The part that takes a click. */
  cap: Object3D;
  /** It dips in and springs back. */
  press(): void;
  /** Light it, for an illuminated button. */
  setLit(on: boolean): void;
  update(delta: number): void;
}

/**
 * A 30 mm momentary push button: a coloured cap in a black ring nut,
 * `flush` with its guard ring (START), `extended` proud of it (STOP), or
 * `illuminated`, a translucent cap lit from behind.
 */
export function createPushButton(
  kit: PanelKit,
  colour: OperatorColour,
  { head = 'flush' as 'flush' | 'extended' | 'illuminated' } = {},
): PushButtonView {
  const group = new Group();
  ringNut(kit, group);
  const lit = head === 'illuminated';
  const base = new Color(OPERATOR_COLOURS[colour]);
  const material = lit
    ? kitGlow(kit, base.clone().multiplyScalar(0.45).getStyle())
    : kitPaint(kit, OPERATOR_COLOURS[colour]);
  // A guard ring stands round a flush head, so it is hard to press by accident.
  if (head === 'flush') {
    const guard = kitPaint(kit, '#18181a');
    guard.side = DoubleSide;
    const ring = add(
      group,
      new CylinderGeometry(0.015, 0.0155, 0.007, 24, 1, true),
      guard,
      0,
      0,
      0.0095,
    );
    ring.rotation.x = Math.PI / 2;
  }
  const cap = new Group();
  group.add(cap);
  const capDepth = head === 'extended' ? 0.012 : 0.008;
  disc(cap, 0.0125, capDepth, material, 0, 24, 0.0122);
  const rest = 0.006 + (head === 'flush' ? -0.002 : 0);
  cap.position.z = rest;
  const litColour = base.clone().lerp(new Color('#ffffff'), 0.25);
  const darkColour = base.clone().multiplyScalar(0.45);
  let held = 0;
  return {
    group,
    cap,
    press() {
      held = 0.18;
    },
    setLit(on) {
      if (lit)
        (material as unknown as { color: Color }).color.copy(
          on ? litColour : darkColour,
        );
    },
    update(delta) {
      held = Math.max(0, held - delta);
      const target = held > 0 ? rest - 0.004 : rest;
      cap.position.z += (target - cap.position.z) * Math.min(1, delta * 30);
    },
  };
}

export interface MushroomView {
  group: Group;
  head: Object3D;
  /** Pushed in (applied) or pulled out. */
  set(pushed: boolean): void;
  update(delta: number): void;
}

/** A 40 mm red mushroom-head emergency stop, maintained, pull to release. */
export function createMushroomHead(kit: PanelKit): MushroomView {
  const group = new Group();
  ringNut(kit, group);
  const head = new Group();
  group.add(head);
  const red = kitPaint(kit, OPERATOR_COLOURS.red);
  disc(head, 0.007, 0.016, kitPaint(kit, '#1a1a1b'), 0);
  disc(head, 0.02, 0.012, red, 0.016, 28, 0.016);
  disc(head, 0.016, 0.003, red, 0.028, 28, 0.012);
  const out = 0.004;
  const pushedIn = -0.004;
  let target = out;
  head.position.z = out;
  return {
    group,
    head,
    set(pushed) {
      target = pushed ? pushedIn : out;
    },
    update(delta) {
      head.position.z += (target - head.position.z) * Math.min(1, delta * 25);
    },
  };
}

export interface LeverSelectorView {
  group: Group;
  knob: Object3D;
  /** Show it at `position`, from 0. */
  set(position: number): void;
  update(delta: number): void;
}

/**
 * A lever-operated selector switch: a black knob with a raised bar,
 * turning through 45° detents, two or three positions, with white index
 * marks on its legend plate. A `key` one has a cylinder lock in place of
 * the lever, and its key stands in it.
 */
export function createLeverSelector(
  kit: PanelKit,
  positions: 2 | 3,
  { key = false } = {},
): LeverSelectorView {
  const group = new Group();
  ringNut(kit, group);
  const knob = new Group();
  group.add(knob);
  if (key) {
    disc(knob, 0.012, 0.01, kitPaint(kit, '#c3c5c6', 0.75), 0.004, 20);
    add(
      knob,
      new BoxGeometry(0.0022, 0.009, 0.002),
      kitPaint(kit, '#1a1a1a'),
      0,
      0,
      0.0145,
    );
    // The key: a brass blade and a black bow.
    add(
      knob,
      new BoxGeometry(0.0016, 0.008, 0.012),
      kitPaint(kit, '#c8a64a', 0.7),
      0,
      0,
      0.02,
    );
    add(
      knob,
      new BoxGeometry(0.004, 0.018, 0.012),
      kitPaint(kit, '#202022'),
      0,
      0,
      0.031,
    ).scale.set(1, 1, 0.3);
  } else {
    disc(knob, 0.0145, 0.008, kitPaint(kit, '#1d1d1e'), 0.004, 24, 0.0135);
    // The lever bar, with a white line along it to show the position.
    add(
      knob,
      new BoxGeometry(0.008, 0.03, 0.012),
      kitPaint(kit, '#232325'),
      0,
      0,
      0.018,
    );
    add(
      knob,
      new BoxGeometry(0.0016, 0.022, 0.0006),
      kitPaint(kit, '#eeeae0'),
      0,
      0.002,
      0.0243,
    );
  }
  const angles =
    positions === 2
      ? [Math.PI / 4, -Math.PI / 4]
      : [Math.PI / 4, 0, -Math.PI / 4];
  let target = angles[0];
  knob.rotation.z = target;
  return {
    group,
    knob,
    set(position) {
      target = angles[Math.max(0, Math.min(angles.length - 1, position))];
    },
    update(delta) {
      knob.rotation.z += (target - knob.rotation.z) * Math.min(1, delta * 20);
    },
  };
}

/**
 * A speed potentiometer: a round black knob with a pointer over a skirt
 * printed 0 to 10, turning through 270°.
 */
export function createPotentiometer(kit: PanelKit): LeverSelectorView {
  const group = new Group();
  ringNut(kit, group);
  const ticks = createMicroLabel(kit, '0        5        10', {
    height: 0.0028,
    ink: '#eeeae0',
  });
  ticks.position.set(0, -0.024, 0.0045);
  group.add(ticks);
  const knob = new Group();
  group.add(knob);
  disc(knob, 0.017, 0.004, kitPaint(kit, '#2a2b2d', 0.2), 0.004, 28);
  disc(knob, 0.012, 0.012, kitPaint(kit, '#1b1b1c'), 0.008, 28, 0.011);
  add(
    knob,
    new BoxGeometry(0.0018, 0.012, 0.0008),
    kitPaint(kit, '#eeeae0'),
    0,
    0.009,
    0.0205,
  );
  let target = 0;
  const angle = (share: number) =>
    (Math.PI * 3) / 4 - share * ((Math.PI * 3) / 2);
  knob.rotation.z = angle(0);
  return {
    group,
    knob,
    /** `position` here is a share of its travel, 0 to 1. */
    set(share) {
      target = angle(Math.max(0, Math.min(1, share)));
    },
    update(delta) {
      knob.rotation.z += (target - knob.rotation.z) * Math.min(1, delta * 20);
    },
  };
}

export interface PilotLightView {
  group: Group;
  lens: Object3D;
  set(on: boolean): void;
  press(): void;
  update(delta: number): void;
}

/**
 * A 30 mm push-to-test pilot light: a ribbed, domed lens in a black ring
 * nut, lit by a filament lamp behind it. Pressing the lens dips it.
 */
export function createPilotLamp(
  kit: PanelKit,
  colour: OperatorColour,
): PilotLightView {
  const group = new Group();
  ringNut(kit, group);
  const lens = new Group();
  group.add(lens);
  const base = new Color(OPERATOR_COLOURS[colour]);
  const glass = kitGlow(kit, base.clone().multiplyScalar(0.35).getStyle());
  disc(lens, 0.0135, 0.007, glass, 0.004, 20, 0.013);
  disc(lens, 0.013, 0.004, glass, 0.011, 20, 0.009);
  // Lit, the lens glows saturated; a little white keeps it bright.
  const on = base
    .clone()
    .multiplyScalar(1.5)
    .lerp(new Color('#ffffff'), colour === 'white' ? 0 : 0.1);
  const off = base.clone().multiplyScalar(0.35);
  let held = 0;
  return {
    group,
    lens,
    set(lit) {
      (glass as unknown as { color: Color }).color.copy(lit ? on : off);
    },
    press() {
      held = 0.18;
    },
    update(delta) {
      held = Math.max(0, held - delta);
      const target = held > 0 ? -0.0025 : 0;
      lens.position.z += (target - lens.position.z) * Math.min(1, delta * 30);
    },
  };
}
