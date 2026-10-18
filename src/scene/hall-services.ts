import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
} from 'three';
import type { Material } from 'three';
import { createInstancer } from '../toolkit/components/core/views/instancer';
import {
  HALL_LENGTH,
  HALL_WIDTH,
  NAVE_WIDTH,
  SIDE_HEIGHT,
} from './industrial-hall';

/**
 * The hall's building services, hung from its structure as a plant of the
 * 1990s would have them: gas-fired unit heaters on the nave's columns,
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
  const hanger = paint('#4d5256', 0.5, 0.6);
  const heaterPaint = paint('#c9c1a9', 0.5, 0.3);
  const dark = paint('#26292b', 0.6, 0.4);
  const grille = paint('#7d8285', 0.5, 0.6);
  const L = HALL_LENGTH;
  const W = HALL_WIDTH;
  const nave = NAVE_WIDTH;
  const low = SIDE_HEIGHT;
  const it = createInstancer();
  const box = it.part(new BoxGeometry(1, 1, 1), galvanised);
  const boxDark = it.part(new BoxGeometry(1, 1, 1), dark);
  const boxHanger = it.part(new BoxGeometry(1, 1, 1), hanger, 45);
  const boxGrille = it.part(new BoxGeometry(1, 1, 1), grille, 45);
  const boxHeater = it.part(new BoxGeometry(1, 1, 1), heaterPaint);
  const flue = it.part(new CylinderGeometry(1, 1, 1, 12), dark);

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
    /** The instanced meshes, and the distance (metres) beyond which each is hidden. */
    built: it.built(),
    dispose() {
      it.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
