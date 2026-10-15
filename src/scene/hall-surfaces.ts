import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Texture } from 'three';

/**
 * The hall's building materials: each surface (floor, walls, columns,
 * struts, ceiling) wears a finish, and every finish is a texture mapped
 * from world position (triplanar: each face takes the texture on the axis
 * it faces), so a 150 m wall and a 1 m column show the same scale of
 * grain however their boxes are stretched. A finish has a texture, a tile
 * size in metres, and a default tint, roughness and metalness; the panel
 * can change any of them.
 */

export type HallSurface = 'floor' | 'walls' | 'columns' | 'struts' | 'ceiling';
export const HALL_SURFACES: HallSurface[] = [
  'floor',
  'walls',
  'columns',
  'struts',
  'ceiling',
];

export interface Finish {
  name: string;
  /** How many metres one tile of its texture covers. */
  tile: number;
  colour: string;
  roughness: number;
  metalness: number;
  draw: (c: CanvasRenderingContext2D, s: number) => void;
}

function seeded(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

function mottle(
  c: CanvasRenderingContext2D,
  s: number,
  base: string,
  seed: number,
  spots = 2000,
  spread = 50,
) {
  const random = seeded(seed);
  c.fillStyle = base;
  c.fillRect(0, 0, s, s);
  for (let i = 0; i < spots; i++) {
    const shade = 255 - spread + random() * spread;
    c.fillStyle = `rgba(${shade},${shade},${shade},${0.04 + random() * 0.07})`;
    c.beginPath();
    c.arc(random() * s, random() * s, 3 + random() * 36, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = `rgba(0,0,0,${0.02 + random() * 0.04})`;
    c.beginPath();
    c.arc(random() * s, random() * s, 2 + random() * 20, 0, Math.PI * 2);
    c.fill();
  }
}

const polished: Finish = {
  name: 'Polished concrete',
  tile: 6,
  colour: '#9d9c97',
  roughness: 0.12,
  metalness: 0,
  draw(c, s) {
    // Ground and polished, concrete shows little: a faint cloud from the
    // trowel, a fine salt of exposed aggregate, and the saw-cut joints.
    c.fillStyle = '#e4e3de';
    c.fillRect(0, 0, s, s);
    const random = seeded(7);
    for (let i = 0; i < 260; i++) {
      const shade = 225 + random() * 30;
      c.fillStyle = `rgba(${shade},${shade},${shade - 3},0.05)`;
      c.beginPath();
      c.arc(random() * s, random() * s, 20 + random() * 60, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 1400; i++) {
      const shade = 150 + random() * 100;
      c.fillStyle = `rgba(${shade},${shade - 4},${shade - 10},0.25)`;
      c.fillRect(random() * s, random() * s, 1, 1);
    }
    c.strokeStyle = 'rgba(70,70,68,0.35)';
    c.lineWidth = 1;
    c.strokeRect(0, 0, s, s);
  },
};
const sealed: Finish = {
  ...polished,
  name: 'Sealed concrete',
  colour: '#9b9890',
  roughness: 0.55,
  draw(c, s) {
    mottle(c, s, '#e2dfd6', 19, 3200, 70);
    c.strokeStyle = 'rgba(50,50,48,0.5)';
    c.lineWidth = 1.5;
    c.strokeRect(0, 0, s, s);
  },
};
const epoxy: Finish = {
  name: 'Epoxy coating',
  tile: 8,
  colour: '#7f8a86',
  roughness: 0.12,
  metalness: 0,
  draw(c, s) {
    mottle(c, s, '#f2f2f0', 23, 400, 20);
  },
};
const terrazzo: Finish = {
  name: 'Terrazzo',
  tile: 2,
  colour: '#c9c4b8',
  roughness: 0.2,
  metalness: 0,
  draw(c, s) {
    c.fillStyle = '#efece4';
    c.fillRect(0, 0, s, s);
    const random = seeded(31);
    const chips = ['#6d6a63', '#a39b8a', '#3b3a37', '#c9b79a', '#8a8f8c'];
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = chips[Math.floor(random() * chips.length)];
      c.beginPath();
      c.ellipse(
        random() * s,
        random() * s,
        1 + random() * 4,
        1 + random() * 3,
        random() * 3,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  },
};
const diamondPlate: Finish = {
  name: 'Diamond steel plate',
  tile: 0.4,
  colour: '#a7acae',
  roughness: 0.35,
  metalness: 0.8,
  draw(c, s) {
    c.fillStyle = '#c9cdcf';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#f2f4f5';
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        c.save();
        c.translate(((x + (y % 2) * 0.5) * s) / 4, ((y + 0.5) * s) / 4);
        c.rotate(y % 2 ? 0.6 : -0.6);
        c.fillRect(-s / 14, -s / 60, s / 7, s / 30);
        c.restore();
      }
  },
};
const boardFormed: Finish = {
  name: 'Board-formed concrete',
  tile: 2.4,
  colour: '#b8b5ac',
  roughness: 0.92,
  metalness: 0,
  draw(c, s) {
    const random = seeded(3);
    c.fillStyle = '#e8e5dc';
    c.fillRect(0, 0, s, s);
    const boards = 16;
    const bh = s / boards;
    for (let b = 0; b < boards; b++) {
      const shade = 215 + random() * 35;
      c.fillStyle = `rgba(${shade},${shade - 3},${shade - 10},0.35)`;
      c.fillRect(0, b * bh, s, bh);
      for (let g = 0; g < 14; g++) {
        c.strokeStyle = `rgba(80,78,72,${0.05 + random() * 0.07})`;
        c.lineWidth = 1;
        c.beginPath();
        const y = b * bh + random() * bh;
        c.moveTo(0, y);
        c.bezierCurveTo(
          s * 0.3,
          y + random() * 4 - 2,
          s * 0.6,
          y + random() * 4 - 2,
          s,
          y,
        );
        c.stroke();
      }
      c.fillStyle = 'rgba(60,58,54,0.35)';
      c.fillRect(0, b * bh, s, 1.5);
    }
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx < 4; tx++) {
        c.fillStyle = 'rgba(40,38,35,0.6)';
        c.beginPath();
        c.arc((tx + 0.5) * (s / 4), (ty + 0.5) * (s / 4), 3.5, 0, Math.PI * 2);
        c.fill();
      }
  },
};
const smoothConcrete: Finish = {
  name: 'Smooth concrete',
  tile: 3,
  colour: '#bdbab1',
  roughness: 0.85,
  metalness: 0,
  draw(c, s) {
    mottle(c, s, '#ebe9e2', 41, 1800, 45);
    // Form panel joints and tie holes, a panel to a tile.
    c.strokeStyle = 'rgba(70,68,62,0.35)';
    c.lineWidth = 1.5;
    c.strokeRect(0, 0, s, s);
    for (const [x, y] of [
      [0.15, 0.15],
      [0.85, 0.15],
      [0.15, 0.85],
      [0.85, 0.85],
    ]) {
      c.fillStyle = 'rgba(40,38,35,0.55)';
      c.beginPath();
      c.arc(x * s, y * s, 4, 0, Math.PI * 2);
      c.fill();
    }
  },
};
const paintedBlock: Finish = {
  name: 'Painted block',
  tile: 0.8,
  colour: '#d8d6cc',
  roughness: 0.8,
  metalness: 0,
  draw(c, s) {
    c.fillStyle = '#f4f3ee';
    c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = (row * s) / 4;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(s, y);
      c.stroke();
      for (let k = 0; k < 2; k++) {
        const x = ((k + (row % 2) * 0.5) * s) / 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + s / 4);
        c.stroke();
      }
    }
  },
};
const corrugated: Finish = {
  name: 'Corrugated steel',
  tile: 0.6,
  colour: '#a9b2b0',
  roughness: 0.5,
  metalness: 0.4,
  draw(c, s) {
    const g = c.createLinearGradient(0, 0, s, 0);
    for (let k = 0; k < 4; k++) {
      g.addColorStop(k / 4, '#ffffff');
      g.addColorStop(k / 4 + 0.12, '#9a9a9a');
    }
    g.addColorStop(1, '#ffffff');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  },
};
const brick: Finish = {
  name: 'Brick',
  tile: 0.8,
  colour: '#9c5a42',
  roughness: 0.9,
  metalness: 0,
  draw(c, s) {
    const random = seeded(53);
    c.fillStyle = '#d8d2c6';
    c.fillRect(0, 0, s, s);
    const rows = 12;
    const rh = s / rows;
    for (let r = 0; r < rows; r++)
      for (let k = -1; k < 4; k++) {
        const shade = 200 + random() * 55;
        c.fillStyle = `rgb(${shade},${shade * 0.9},${shade * 0.85})`;
        c.fillRect(
          ((k + (r % 2) * 0.5) * s) / 4 + 2,
          r * rh + 2,
          s / 4 - 4,
          rh - 4,
        );
      }
  },
};
const paintedSteel: Finish = {
  name: 'Painted steel',
  tile: 2,
  colour: '#4f5a60',
  roughness: 0.45,
  metalness: 0.5,
  draw(c, s) {
    mottle(c, s, '#f0f0f0', 61, 200, 15);
  },
};
const rustedSteel: Finish = {
  name: 'Weathered steel',
  tile: 1.5,
  colour: '#8a5a3c',
  roughness: 0.8,
  metalness: 0.3,
  draw(c, s) {
    mottle(c, s, '#e6d8cc', 71, 3000, 110);
  },
};

/** The finishes each surface may wear, its default first. */
export const FINISHES: Record<HallSurface, Finish[]> = {
  floor: [polished, sealed, epoxy, terrazzo, diamondPlate],
  walls: [boardFormed, smoothConcrete, paintedBlock, corrugated, brick],
  columns: [boardFormed, smoothConcrete, paintedSteel, rustedSteel],
  struts: [boardFormed, smoothConcrete, paintedSteel, rustedSteel],
  ceiling: [smoothConcrete, boardFormed, paintedSteel],
};

const textures = new Map<string, Texture>();
function finishTexture(finish: Finish) {
  let t = textures.get(finish.name);
  if (!t) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    finish.draw(canvas.getContext('2d')!, 512);
    t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    textures.set(finish.name, t);
  }
  return t;
}

export interface Surface {
  surface: HallSurface;
  material: MeshStandardMaterial;
  finish: Finish;
  setFinish(name: string): void;
  setColour(colour: string): void;
  setRoughness(roughness: number): void;
  setMetalness(metalness: number): void;
}

/**
 * A surface's material, mapped from world position. `metre` is how many
 * world units make a metre, so tile sizes stay in metres.
 */
export function createSurface(surface: HallSurface, metre: number): Surface {
  const material = new MeshStandardMaterial({ color: '#ffffff' });
  const uniforms = {
    triMap: { value: null as Texture | null },
    triTile: { value: 1 },
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.triMap = uniforms.triMap;
    shader.uniforms.triTile = uniforms.triTile;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 triWorld = vec4(transformed, 1.0);
        vec3 triNormal = objectNormal;
        #ifdef USE_INSTANCING
          triWorld = instanceMatrix * triWorld;
          triNormal = mat3(instanceMatrix) * triNormal;
        #endif
        triWorld = modelMatrix * triWorld;
        vTriPos = triWorld.xyz;
        vTriNormal = normalize(mat3(modelMatrix) * triNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D triMap;\nuniform float triTile;\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;',
      )
      .replace(
        '#include <map_fragment>',
        `vec3 triN = abs(vTriNormal);
        vec2 triUv = triN.y > max(triN.x, triN.z)
          ? vTriPos.xz
          : (triN.x > triN.z ? vTriPos.zy : vTriPos.xy);
        diffuseColor *= texture2D(triMap, triUv / triTile);`,
      );
  };
  const made: Surface = {
    surface,
    material,
    finish: FINISHES[surface][0],
    setFinish(name) {
      const finish =
        FINISHES[surface].find((f) => f.name === name) ?? FINISHES[surface][0];
      made.finish = finish;
      uniforms.triMap.value = finishTexture(finish);
      uniforms.triTile.value = finish.tile * metre;
      material.color = new Color(finish.colour);
      material.roughness = finish.roughness;
      material.metalness = finish.metalness;
    },
    setColour(colour) {
      material.color.set(colour);
    },
    setRoughness(roughness) {
      material.roughness = roughness;
    },
    setMetalness(metalness) {
      material.metalness = metalness;
    },
  };
  made.setFinish(FINISHES[surface][0].name);
  return made;
}

/** Free the shared finish textures. */
export function disposeFinishTextures() {
  for (const t of textures.values()) t.dispose();
  textures.clear();
}
