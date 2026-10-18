import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import {
  MeshBasicNodeMaterial,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
} from 'three/webgpu';
import {
  abs,
  color,
  dot,
  float,
  mix,
  mx_fractal_noise_float,
  normalView,
  oneMinus,
  positionLocal,
  positionViewDirection,
  pow,
  sin,
  smoothstep,
  time,
  vec3,
} from 'three/tsl';
import type { ExhibitId } from '../game/plinths';
import { createLabelTexture } from '../toolkit/components/core/views/screens';

/**
 * The plinth room's exhibits, built in metres for WebGPURenderer (node
 * materials throughout). Not realism: three monumental objects, about a
 * metre tall, turning slowly above their plinths, each in a material of
 * its own:
 *
 * - the rhombus, a tall rhombic bipyramid of iridescent, dispersive
 *   glass round a pulsing magenta core that its facets refract;
 * - the helix, a double helix of polished gold strands with glowing base
 *   pairs (A–T red and blue, G–C green and amber);
 * - the sphere, obsidian veined with molten light, its veins drawn from
 *   noise in its own frame so they turn with it, tilted on its axis like
 *   a planet.
 */

/** How tall a plinth stands, metres. */
export const PLINTH_HEIGHT = 1.1;
/** How high the middle of each exhibit floats, metres. */
export const EXHIBIT_CENTRE = PLINTH_HEIGHT + 0.35 + 0.5;
/** How fast the exhibits turn, radians a second (one turn in about 40 s). */
export const TURN_RATE = 0.16;

export interface Exhibit {
  id: ExhibitId;
  /** The plinth and its exhibit, standing at the origin. */
  group: Group;
  /** What turns. */
  spinner: Group;
  /** Turn on by `delta` seconds. */
  update(delta: number): void;
  /**
   * Give the exhibit's materials something to reflect (a studio
   * environment), without lighting the room with it.
   */
  setEnvironment(texture: Texture, intensity: number): void;
  dispose(): void;
}

/** A rim of light where a surface turns away from the eye. */
const rim = (power: number) =>
  pow(oneMinus(abs(dot(normalView, positionViewDirection))), float(power));

function plinth(
  label: string,
  geometries: BufferGeometry[],
  materials: Material[],
  textures: Texture[],
) {
  const group = new Group();
  // Honed grey stone, a little warm, so the exhibit is the brightest
  // thing in the light; a darker shadow gap at its foot.
  const stone = new MeshStandardNodeMaterial({
    color: '#8f8a82',
    roughness: 0.6,
  });
  const base = new MeshStandardNodeMaterial({
    color: '#2a2826',
    roughness: 0.4,
  });
  materials.push(stone, base);
  const body = new BoxGeometry(1, PLINTH_HEIGHT - 0.08, 1);
  const foot = new BoxGeometry(0.94, 0.08, 0.94);
  const cap = new BoxGeometry(1.08, 0.04, 1.08);
  geometries.push(body, foot, cap);
  const bodyMesh = new Mesh(body, stone);
  bodyMesh.position.y = 0.08 + (PLINTH_HEIGHT - 0.08) / 2;
  const footMesh = new Mesh(foot, base);
  footMesh.position.y = 0.04;
  const capMesh = new Mesh(cap, stone);
  capMesh.position.y = PLINTH_HEIGHT - 0.02;
  for (const mesh of [bodyMesh, footMesh, capMesh]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // A small engraved name on every face.
  const plate = createLabelTexture(label, {
    ink: '#1e1d1b',
    plate: '#8f8a82',
    size: 40,
  });
  textures.push(plate.texture);
  const ink = new MeshStandardNodeMaterial({
    map: plate.texture,
    roughness: 0.6,
  });
  materials.push(ink);
  const plateGeometry = new PlaneGeometry(
    0.5,
    (0.5 * plate.height) / plate.width,
  );
  geometries.push(plateGeometry);
  for (let side = 0; side < 4; side++) {
    const face = new Mesh(plateGeometry, ink);
    const a = (side * Math.PI) / 2;
    face.position.set(
      Math.sin(a) * 0.502,
      PLINTH_HEIGHT - 0.2,
      Math.cos(a) * 0.502,
    );
    face.rotation.y = a;
    // In the cap's shadow like the stone round it, or it shows as a patch.
    face.receiveShadow = true;
    group.add(face);
  }
  return group;
}

function rhombus(geometries: BufferGeometry[], materials: Material[]) {
  const spinner = new Group();
  // A rhombic bipyramid: an octahedron drawn up to a metre tall.
  const shell = new OctahedronGeometry(0.5);
  shell.scale(0.62, 1, 0.62);
  geometries.push(shell);
  const glass = new MeshPhysicalNodeMaterial({
    color: '#e8fbff',
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 0.45,
    ior: 1.72,
    dispersion: 0.25,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 620],
    attenuationColor: new Color('#e6f8ff'),
    attenuationDistance: 3,
    specularIntensity: 1,
    side: DoubleSide,
  });
  // The facets' edges catch a cold rim.
  glass.emissiveNode = color('#7fd8ff').mul(rim(4)).mul(0.35);
  materials.push(glass);
  const body = new Mesh(shell, glass);
  body.castShadow = true;
  spinner.add(body);
  // The core: a small magenta rhombus, beating slowly, seen through the glass.
  const coreShape = new OctahedronGeometry(0.11);
  coreShape.scale(0.62, 1, 0.62);
  geometries.push(coreShape);
  const core = new MeshBasicNodeMaterial();
  core.colorNode = color('#ff2fae').mul(sin(time.mul(1.3)).mul(0.35).add(1.6));
  materials.push(core);
  const coreMesh = new Mesh(coreShape, core);
  spinner.add(coreMesh);
  return {
    spinner,
    update(delta: number) {
      spinner.rotation.y += TURN_RATE * delta;
      coreMesh.rotation.y -= TURN_RATE * 2.5 * delta;
    },
  };
}

function helix(geometries: BufferGeometry[], materials: Material[]) {
  const spinner = new Group();
  const radius = 0.3;
  const height = 1;
  const turns = 1.75;
  const strand = (phase: number) => {
    const points: Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = phase + t * turns * Math.PI * 2;
      points.push(
        new Vector3(
          Math.cos(a) * radius,
          t * height - height / 2,
          Math.sin(a) * radius,
        ),
      );
    }
    return new TubeGeometry(
      new CatmullRomCurve3(points),
      360,
      0.035,
      14,
      false,
    );
  };
  // Polished gold, warm and mirror-bright.
  const gold = new MeshPhysicalNodeMaterial({
    color: '#ffc75a',
    metalness: 1,
    roughness: 0.16,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
  });
  materials.push(gold);
  // The major and minor grooves: the second strand stands 140° on, not 180°.
  for (const phase of [0, (140 * Math.PI) / 180]) {
    const tube = strand(phase);
    geometries.push(tube);
    const mesh = new Mesh(tube, gold);
    mesh.castShadow = true;
    spinner.add(mesh);
  }
  // The base pairs: each rung two glowing halves, A–T or G–C either way round.
  const pairs = [
    ['#ff4b3a', '#3a7bff'],
    ['#3dff7a', '#ffb02e'],
  ] as const;
  const halves = new Map<string, Matrix4[]>();
  const rungs = 22;
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < rungs; i++) {
    const t = (i + 0.5) / rungs;
    const y = t * height - height / 2;
    const a1 = t * turns * Math.PI * 2;
    const a2 = a1 + (140 * Math.PI) / 180;
    const p1 = new Vector3(Math.cos(a1) * radius, y, Math.sin(a1) * radius);
    const p2 = new Vector3(Math.cos(a2) * radius, y, Math.sin(a2) * radius);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const [first, second] = pairs[(i * 7) % 3 === 0 ? 1 : 0];
    const [c1, c2] = i % 2 ? [second, first] : [first, second];
    for (const [from, colour] of [
      [p1, c1],
      [p2, c2],
    ] as const) {
      const dir = mid.clone().sub(from);
      const length = dir.length();
      const matrix = new Matrix4().compose(
        from.clone().add(mid).multiplyScalar(0.5),
        new Quaternion().setFromUnitVectors(up, dir.normalize()),
        new Vector3(1, length, 1),
      );
      let list = halves.get(colour);
      if (!list) halves.set(colour, (list = []));
      list.push(matrix);
    }
  }
  const rung = new CylinderGeometry(0.014, 0.014, 1, 10);
  geometries.push(rung);
  for (const [colour, matrices] of halves) {
    const glow = new MeshStandardNodeMaterial({
      color: '#111111',
      roughness: 0.3,
    });
    glow.emissiveNode = color(colour).mul(2.2);
    materials.push(glow);
    const mesh = new InstancedMesh(rung, glow, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    spinner.add(mesh);
  }
  return {
    spinner,
    update(delta: number) {
      spinner.rotation.y += TURN_RATE * delta;
    },
  };
}

function sphere(geometries: BufferGeometry[], materials: Material[]) {
  const spinner = new Group();
  // Tilted like the Earth, so its turning reads.
  const tilt = new Group();
  tilt.rotation.z = (23.4 * Math.PI) / 180;
  spinner.add(tilt);
  const ball = new SphereGeometry(0.5, 128, 96);
  geometries.push(ball);
  const obsidian = new MeshPhysicalNodeMaterial({
    metalness: 0,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  // Veins where a fractal noise in the sphere's own frame crosses zero:
  // they turn with it. A broad second noise varies the glass from black
  // to a deep oxblood, and the veins breathe slowly.
  const p = positionLocal.mul(2.4);
  const field = mx_fractal_noise_float(p, 4, 2.0, 0.5);
  const vein = oneMinus(smoothstep(0.0, 0.035, abs(field)));
  const halo = oneMinus(smoothstep(0.0, 0.16, abs(field))).mul(0.25);
  const body = mix(
    vec3(0.012, 0.01, 0.012),
    vec3(0.09, 0.012, 0.01),
    smoothstep(
      -0.3,
      0.6,
      mx_fractal_noise_float(positionLocal.mul(0.9), 3, 2.0, 0.5),
    ),
  );
  obsidian.colorNode = mix(body, vec3(0.08, 0.02, 0.005), vein);
  obsidian.roughnessNode = mix(float(0.22), float(0.6), vein);
  obsidian.emissiveNode = color('#ff5a12')
    .mul(vein.add(halo).min(1))
    .mul(sin(time.mul(0.7)).mul(0.2).add(1.5));
  materials.push(obsidian);
  const mesh = new Mesh(ball, obsidian);
  mesh.castShadow = true;
  tilt.add(mesh);
  return {
    spinner,
    update(delta: number) {
      mesh.rotation.y += TURN_RATE * 1.4 * delta;
    },
  };
}

const NAMES: Record<ExhibitId, string> = {
  rhombus: 'RHOMBUS',
  helix: 'HELIX',
  sphere: 'SPHERE',
};
const BUILDERS = { rhombus, helix, sphere };

/** A plinth with its exhibit floating over it, built in metres. */
export function createExhibit(id: ExhibitId): Exhibit {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  // The plinth's own materials, kept apart so the exhibit's studio does
  // not light them: lit by the spotlight alone, the plinth plainly comes
  // up when the visitor arrives.
  const stoneMaterials: Material[] = [];
  const group = new Group();
  group.name = `Exhibit ${id}`;
  group.add(plinth(NAMES[id], geometries, stoneMaterials, textures));
  const made = BUILDERS[id](geometries, materials);
  made.spinner.position.y = EXHIBIT_CENTRE;
  group.add(made.spinner);
  let clock = 0;
  return {
    id,
    group,
    spinner: made.spinner,
    setEnvironment(texture, intensity) {
      for (const material of materials)
        if ('envMap' in material) {
          (material as MeshStandardNodeMaterial).envMap = texture;
          (material as MeshStandardNodeMaterial).envMapIntensity = intensity;
          material.needsUpdate = true;
        }
    },
    update(delta) {
      clock += delta;
      made.update(delta);
      // A slow bob, so it floats.
      made.spinner.position.y = EXHIBIT_CENTRE + Math.sin(clock * 0.6) * 0.03;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of [...materials, ...stoneMaterials]) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
