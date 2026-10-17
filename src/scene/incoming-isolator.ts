import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material } from 'three';
import { disconnectHandle } from '../rendering/parts';
import type { PanelKit } from './eighties-controls';
import { createMicroLabel, kitPaint } from './eighties-controls';

/** The enclosure's yellow moulding, and its lid's, a shade lighter. */
const YELLOW = '#f0c419';
const LID = '#f5cf2e';
/**
 * The enclosure, metres: Eaton's P3-100/I5/SVB, a 100 A three-pole main
 * switch in an insulated surface-mounting box, 200 × 280 × 169 mm.
 */
const W = 0.2;
const H = 0.28;
const D = 0.169;
/** How high its middle hangs, and how far back its face is from the line-up's. */
const Y = 1.45;
const FACE_Z = -0.3;
/** The galvanised stand's posts, either side of the box. */
const POST_X = 0.09;

/**
 * The incoming supply isolator: an enclosed rotary main switch, yellow,
 * with a red rotary handle (after Eaton's P3-100/I5/SVB, 100 A, three
 * poles, under a maker's name of our own), on a galvanised unistrut stand
 * to the left of the motor control line-up. The 480 V three-phase supply
 * comes down to it in rigid conduit from overhead into a gland in its top
 * and goes on through a short conduit from its side into the line-up's
 * first section, MAIN INCOMING. Its handle turns a quarter turn, 0 (OFF)
 * to I (ON); it starts off, and off, nothing in the line-up is live. Its
 * origin is on the floor, under the middle of its face's plane; its face
 * is at `FACE_Z`.
 */
export function createIncomingIsolator(
  kit: PanelKit,
  initial: 'off' | 'on' = 'off',
) {
  const group = new Group();
  group.name = 'Incoming supply isolator';
  const add = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    x: number,
    y: number,
    options: Parameters<typeof createMicroLabel>[2],
  ) => {
    const mesh = createMicroLabel(kit, text, options);
    mesh.position.set(x, y, FACE_Z + 0.0015);
    group.add(mesh);
    return mesh;
  };
  const galvanised = kitPaint(kit, '#9ea3a4', 0.6);
  const conduit = kitPaint(kit, '#a7abab', 0.7);
  const grey = kitPaint(kit, '#4a4d50');
  const back = FACE_Z - D;
  // Two unistrut posts from the floor, the channels across them, and the
  // box bolted to the channels.
  for (const x of [-POST_X, POST_X])
    add(galvanised, 0.041, 2.3, 0.041, x, 1.15, back - 0.021);
  for (const y of [Y - 0.1, Y + 0.1])
    add(galvanised, 2 * POST_X + 0.06, 0.041, 0.041, 0, y, back - 0.021);
  // The moulded box, and its lid, screwed at the corners.
  add(kitPaint(kit, YELLOW), W, H, D - 0.012, 0, Y, FACE_Z - D / 2 - 0.006);
  add(kitPaint(kit, LID), W - 0.004, H - 0.004, 0.012, 0, Y, FACE_Z - 0.006);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const screw = new Mesh(
        new CylinderGeometry(0.006, 0.006, 0.003, 12),
        grey,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(
        sx * (W / 2 - 0.014),
        Y + sy * (H / 2 - 0.014),
        FACE_Z + 0.0015,
      );
      group.add(screw);
    }
  // Its handle, on the lid, a little below the middle.
  const handle = disconnectHandle(kit, {
    name: 'INCOMING ISOLATOR handle',
    initial,
    style: 'rotary',
    sound: 'soft-click',
  });
  handle.object.position.set(0, Y - 0.015, FACE_Z);
  group.add(handle.object);
  // What it is, its rating and a warning, printed on the lid.
  const ink = '#151515';
  label('INCOMING SUPPLY\nISOLATOR', 0, Y + H / 2 - 0.032, {
    height: 0.009,
    ink,
  });
  label('MAIN SWITCH', 0, Y - 0.078, { height: 0.006, ink });
  label('100 A  480 VAC  3 PH  60 Hz', 0, Y - 0.094, {
    height: 0.0045,
    ink,
    bold: false,
  });
  label('DANGER  480 V', 0, Y - H / 2 + 0.022, {
    height: 0.006,
    ink: '#ffffff',
    plate: '#c42a1e',
  });
  label('VOLTARA', W / 2 - 0.032, Y + H / 2 - 0.016, { height: 0.004, ink });
  // A lock-out notice on the channel below.
  const lockout = createMicroLabel(
    kit,
    'LOCK OUT BEFORE\nWORKING ON EQUIPMENT',
    {
      height: 0.006,
      ink,
      plate: '#f2c618',
    },
  );
  lockout.position.set(0, Y - H / 2 - 0.06, back + 0.001);
  group.add(lockout);
  // The supply down from overhead in rigid conduit into a gland in its top,
  // and on from its side into the line-up through a short nipple.
  const pipe = (length: number, r = 0.021) =>
    new Mesh(new CylinderGeometry(r, r, length, 16), conduit);
  const top = Y + H / 2;
  const down = pipe(2.6 - top);
  down.position.set(0, top + (2.6 - top) / 2, FACE_Z - D / 2);
  group.add(down);
  const side = pipe(ISOLATOR.gap + 0.02, 0.018);
  side.rotation.z = Math.PI / 2;
  side.position.set(W / 2 + ISOLATOR.gap / 2, Y + 0.06, FACE_Z - D / 2);
  group.add(side);
  for (const [x, y, z] of [
    [0, top + 0.008, 0],
    [W / 2 + 0.008, Y + 0.06, Math.PI / 2],
  ]) {
    const gland = new Mesh(new CylinderGeometry(0.028, 0.028, 0.016, 6), grey);
    gland.rotation.z = z;
    gland.position.set(x, y, FACE_Z - D / 2);
    group.add(gland);
  }
  return { group, handle };
}

/**
 * Where the isolator stands beside the line-up, in its coordinates: `x`
 * its middle, `gap` between its side and the line-up's, and its footprint
 * from the line-up's front, for walking into it.
 */
export const ISOLATOR = {
  width: 2 * POST_X + 0.06,
  gap: 0.15,
  front: FACE_Z + 0.12,
  back: FACE_Z - D - 0.05,
};
