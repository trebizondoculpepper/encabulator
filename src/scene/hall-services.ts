import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import type { Material } from 'three';
import { createInstancer } from './instancer';
import {
  HALL_LENGTH,
  HALL_WIDTH,
  NAVE_HEIGHT,
  NAVE_WIDTH,
  SIDE_HEIGHT,
} from './industrial-hall';

/**
 * The hall's building services, hung from its structure as a plant of the
 * 1990s would have them: two great spiral supply ducts down the nave with
 * drop diffusers, rectangular ducts with grilles under the side halls'
 * slabs, an air handling unit feeding them, gas-fired unit heaters on the
 * nave's columns with their flues, red sprinkler mains and branch lines,
 * galvanised cable trays, and exhaust fans in the walls. Built in metres
 * in the hall's frame.
 */
export function createHallServices() {
  const group = new Group();
  group.name = 'Building services';
  const materials: Material[] = [];
  const paint = (color: string, roughness = 0.4, metalness = 0.7) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    materials.push(m);
    return m;
  };
  const galvanised = paint('#b9bec0', 0.35, 0.85);
  const seam = paint('#9ea3a5', 0.35, 0.85);
  const hanger = paint('#4d5256', 0.5, 0.6);
  const red = paint('#b32319', 0.45, 0.3);
  const heaterPaint = paint('#c9c1a9', 0.5, 0.3);
  const dark = paint('#26292b', 0.6, 0.4);
  const grille = paint('#7d8285', 0.5, 0.6);
  const ahuPaint = paint('#a7aca6', 0.55, 0.3);
  const L = HALL_LENGTH;
  const W = HALL_WIDTH;
  const nave = NAVE_WIDTH;
  const high = NAVE_HEIGHT;
  const low = SIDE_HEIGHT;
  const it = createInstancer();
  const box = it.part(new BoxGeometry(1, 1, 1), galvanised);
  const boxDark = it.part(new BoxGeometry(1, 1, 1), dark);
  const boxHanger = it.part(new BoxGeometry(1, 1, 1), hanger);
  const boxGrille = it.part(new BoxGeometry(1, 1, 1), grille);
  const boxHeater = it.part(new BoxGeometry(1, 1, 1), heaterPaint);
  const boxAhu = it.part(new BoxGeometry(1, 1, 1), ahuPaint);
  const boxRed = it.part(new BoxGeometry(1, 1, 1), red);
  const tube = it.part(new CylinderGeometry(1, 1, 1, 24, 1, true), galvanised);
  const ring = it.part(new TorusGeometry(1, 0.025, 4, 24), seam);
  const pipe = it.part(new CylinderGeometry(1, 1, 1, 10), red);
  const flue = it.part(new CylinderGeometry(1, 1, 1, 12), dark);
  const cone = it.part(
    new CylinderGeometry(0.2, 1, 1, 20, 1, true),
    galvanised,
  );
  const H = Math.PI / 2;

  // ---- Spiral supply ducts down the nave, with drop diffusers ------------
  const ductY = high - 3.4;
  for (const sz of [-1, 1]) {
    const z = sz * (nave / 2 - 6);
    const r = 0.7;
    it.put(tube, 0, ductY, z, r, L - 6, r, 0, 0, H);
    // The spiral lock seam, shown as rings every 1.5 m, and joints every 3.
    for (let x = -L / 2 + 3; x < L / 2 - 3; x += 1.5)
      it.put(ring, x, ductY, z, r + 0.01, r + 0.01, 1, 0, H, 0);
    // Hangers: strap rods up to the waffle slab.
    for (let x = -L / 2 + 6; x < L / 2 - 3; x += 6) {
      it.put(
        boxHanger,
        x,
        (ductY + high) / 2 + 0.3,
        z,
        0.03,
        high - ductY - 0.6,
        0.03,
      );
      it.put(boxHanger, x, ductY + r + 0.02, z, 0.05, 0.04, 2 * r + 0.2);
    }
    // Drop diffusers: a short spigot and a bell under the duct, every 12 m.
    for (let x = -L / 2 + 9; x < L / 2 - 6; x += 12) {
      it.put(tube, x, ductY - r - 0.5, z, 0.25, 1.0, 0.25);
      it.put(cone, x, ductY - r - 1.15, z, 0.6, 0.3, 0.6);
    }
    // End caps.
    for (const sx of [-1, 1])
      it.put(box, sx * (L / 2 - 3), ductY, z, 0.05, 2 * r, 2 * r);
  }

  // ---- Rectangular ducts under the side halls' slabs ---------------------
  const sideDuctY = low - 1.55;
  for (const sz of [-1, 1]) {
    const z = sz * (nave / 2 + (W / 2 - nave / 2) / 2 + 2);
    it.put(box, 0, sideDuctY, z, L - 8, 0.7, 1.2);
    for (let x = -L / 2 + 4; x < L / 2 - 4; x += 1.5)
      it.put(boxGrille, x, sideDuctY, z, 0.04, 0.74, 1.24);
    for (let x = -L / 2 + 7.5; x < L / 2 - 4; x += 7.5) {
      // A supply grille on the duct's side, facing the walls.
      it.put(
        boxGrille,
        x + 3.5,
        sideDuctY - 0.05,
        z + sz * 0.61,
        0.9,
        0.35,
        0.02,
      );
      it.put(boxHanger, x, sideDuctY + 0.55, z, 0.04, 0.4, 1.4);
    }
  }

  // ---- The air handling unit, at the west end of the south side hall -----
  {
    const x = -L / 2 + 22;
    const z = W / 2 - 14;
    it.put(boxAhu, x, 1.6, z, 9, 3.2, 3.2);
    for (let i = 0; i < 4; i++)
      it.put(boxDark, x - 3.6 + i * 2.4, 1.6, z - 1.61, 0.9, 2.2, 0.02);
    for (let i = 0; i < 6; i++)
      it.put(boxGrille, x + 4.51, 0.8 + i * 0.35, z, 0.02, 0.1, 2.6);
    it.put(
      box,
      x + 2.5,
      3.2 + (sideDuctY - 3.2) / 2,
      z,
      1.4,
      sideDuctY - 3.2 + 0.35,
      1.0,
    );
    it.put(
      box,
      x + 2.5,
      sideDuctY,
      (z + W / 2 - 13.4) / 2,
      1.4,
      0.7,
      Math.abs(W / 2 - 13.4 - z) + 1,
    );
    it.put(boxRed, x - 4.2, 1.3, z - 1.62, 0.3, 0.3, 0.02);
  }

  // ---- Gas unit heaters on the nave's columns, with their flues ----------
  for (const sz of [-1, 1])
    for (let x = -L / 2 + 15; x < L / 2 - 1; x += 30) {
      const z = sz * (nave / 2 - 1.2);
      const y = 6.5;
      it.put(boxHeater, x, y, z, 1.1, 0.75, 0.8);
      // Louvres on its face, turned into the nave.
      for (let k = 0; k < 5; k++)
        it.put(
          boxDark,
          x,
          y - 0.25 + k * 0.12,
          z - sz * 0.41,
          0.95,
          0.04,
          0.02,
        );
      it.put(boxHanger, x, y + 0.6, z + sz * 0.5, 0.06, 0.5, 0.6);
      it.put(
        flue,
        x,
        (y + low + 1) / 2 + 0.3,
        z + sz * 0.3,
        0.1,
        low + 1 - y,
        0.1,
      );
    }

  // ---- Sprinkler mains and branch lines ----------------------------------
  const sprinklerY = high - 0.4;
  it.put(pipe, 0, sprinklerY, 0, 0.1, L - 4, 0.1, 0, 0, H);
  for (let x = -L / 2 + 4.8; x < L / 2 - 2; x += 3.2) {
    it.put(pipe, x, sprinklerY, 0, 0.04, nave - 2, 0.04, H, 0, 0);
    for (let z = -nave / 2 + 3; z < nave / 2 - 2; z += 3.2)
      it.put(boxRed, x, sprinklerY - 0.1, z, 0.04, 0.1, 0.04);
  }
  for (const sz of [-1, 1]) {
    const y = low - 0.25;
    const z0 = sz * (nave / 2 + 1);
    const z1 = sz * (W / 2 - 1);
    it.put(pipe, 0, y, sz * (W / 2 - 2), 0.08, L - 4, 0.08, 0, 0, H);
    for (let x = -L / 2 + 3.75; x < L / 2 - 2; x += 7.5)
      it.put(
        pipe,
        x,
        y,
        (z0 + z1) / 2,
        0.035,
        Math.abs(z1 - z0),
        0.035,
        H,
        0,
        0,
      );
  }

  // ---- Cable trays along the side halls, by the columns ------------------
  for (const sz of [-1, 1]) {
    const z = sz * (nave / 2 + 1.6);
    const y = low - 2.4;
    for (const side of [-0.3, 0.3])
      it.put(box, 0, y, z + side, L - 6, 0.1, 0.02);
    for (let x = -L / 2 + 3; x < L / 2 - 3; x += 0.3)
      it.put(box, x, y - 0.04, z, 0.025, 0.02, 0.6);
    for (let x = -L / 2 + 4; x < L / 2 - 3; x += 3)
      it.put(boxHanger, x, (y + low) / 2, z, 0.025, low - y, 0.025);
  }

  // ---- Exhaust fans high in the side walls -------------------------------
  for (const sz of [-1, 1])
    for (let x = -L / 2 + 3.75 + 15; x < L / 2 - 2; x += 30) {
      const z = sz * (W / 2 - 0.05);
      it.put(boxDark, x, low - 1.2, z, 1.4, 1.4, 0.3);
      for (let k = 0; k < 6; k++)
        it.put(
          boxGrille,
          x,
          low - 1.75 + k * 0.22,
          z - sz * 0.16,
          1.3,
          0.05,
          0.02,
        );
    }

  it.build(group);
  return {
    group,
    dispose() {
      it.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
