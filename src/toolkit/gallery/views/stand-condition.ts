import { ParticleSprite } from '../../components/core/views/particles';
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material, MeshStandardMaterial, ShaderMaterial } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { StandCondition } from '../logic/stand-conditions';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  STAND_BEND_Y,
  createMobileStand,
} from '../../components/industrial-control/views/control-stations';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createCanvasTexture } from '../../components/core/views/screens';

/**
 * The wandering button's stand in any state of repair
 * (`src/toolkit/gallery/logic/stand-conditions.ts`): built as dev9's, or chrome-plated, then
 * worn, dirtied, cracked, rusted, tagged, sooted, burnt, bent and broken as
 * its condition says. The dirt and damage are painted on canvases, laid
 * out from a seed, so no two stands are spoilt alike.
 */

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;
const between = (r: Random, a: number, b: number) => a + (b - a) * r();

/** Spray-paint colours and the tags (our own, harmless) they write. */
const SPRAY = [
  '#e8306b',
  '#2fd0e0',
  '#f5e23a',
  '#7ee04a',
  '#f5f5f5',
  '#1a1a1a',
];
const TAGS = ['ZOK', 'NO!', 'WHY', 'KRAK', 'PRESS', 'OI', 'BZZT', 'NOPE', 'X'];

/**
 * Paint the wear and damage of `c` on a canvas `w` × `h` pixels over a
 * surface of colour `ground`. `bottom` is how far up its foot is from the
 * floor (metres) and `metres` how tall it is, so soot and grime gather low
 * and scorching high, near the station that burnt.
 */
function weather(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  c: StandCondition,
  r: Random,
  ground: string,
  { bottom = 0, metres = 1, tags = true } = {},
) {
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  /** The canvas row at a height above the floor, metres. */
  const rowAt = (y: number) => h * (1 - (y - bottom) / metres);
  // Grime: soft dark smudges, thickest low down.
  for (let i = 0; i < Math.round(c.grime * 40); i++) {
    const x = r() * w;
    const y = h - Math.pow(r(), 1.8) * h;
    const radius = between(r, 0.04, 0.14) * w;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(40,34,26,${0.35 * c.grime})`);
    g.addColorStop(1, 'rgba(40,34,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Rust: orange-brown blotches, weeping downwards.
  for (let i = 0; i < Math.round(c.rust * 26); i++) {
    const x = r() * w;
    const y = r() * h;
    const radius = between(r, 0.02, 0.07) * w;
    ctx.fillStyle = `rgba(${between(r, 120, 160)},${between(r, 55, 75)},30,${between(r, 0.5, 0.85)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * between(r, 0.6, 1.2), r() * 3, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,62,28,0.35)';
    ctx.lineWidth = radius * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + between(r, -3, 3), y + between(r, 0.1, 0.3) * h);
    ctx.stroke();
  }
  // Scratches: bright lines of bare metal, scraped across.
  for (let i = 0; i < Math.round(c.scratches * 90); i++) {
    const x = r() * w;
    const y = r() * h;
    const a = between(r, -0.5, 0.5) + (r() < 0.3 ? Math.PI / 2 : 0);
    const len = between(r, 0.05, 0.4) * w;
    ctx.strokeStyle = `rgba(225,228,226,${between(r, 0.35, 0.8)})`;
    ctx.lineWidth = between(r, 0.6, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // Graffiti: tags in spray paint, with fuzzy edges and drips.
  if (tags)
    for (let i = 0; i < Math.round(c.graffiti * 5); i++) {
      const colour = SPRAY[Math.floor(r() * SPRAY.length)];
      const text = TAGS[Math.floor(r() * TAGS.length)];
      const size = between(r, 0.18, 0.32) * Math.min(w, h * 0.5);
      const x = r() * w * 0.7;
      const y = rowAt(
        between(r, bottom + metres * 0.2, bottom + metres * 0.85),
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(between(r, -0.35, 0.2));
      ctx.font = `italic 900 ${size}px "Marker Felt", "Comic Sans MS", Impact, sans-serif`;
      ctx.shadowColor = colour;
      ctx.shadowBlur = size * 0.15;
      ctx.lineWidth = size * 0.12;
      ctx.strokeStyle = r() < 0.5 ? '#141414' : '#f2f2f2';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = colour;
      ctx.fillText(text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colour;
      ctx.lineWidth = size * 0.05;
      const span = ctx.measureText(text).width;
      for (let d = 0; d < 3; d++) {
        const dx = r() * span;
        ctx.beginPath();
        ctx.moveTo(dx, size * 0.1);
        ctx.lineTo(dx, size * between(r, 0.4, 1.2));
        ctx.stroke();
      }
      ctx.restore();
    }
  // Scorch: heat tint and charring, worst near the top, where it burnt.
  if (c.scorch > 0) {
    const top = rowAt(bottom + metres);
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    const fade = Math.min(1, metres > 0.6 ? 0.55 : 1);
    g.addColorStop(0, `rgba(18,14,12,${0.85 * c.scorch})`);
    g.addColorStop(0.25 * fade, `rgba(70,40,30,${0.6 * c.scorch})`);
    g.addColorStop(0.45 * fade, `rgba(60,70,110,${0.35 * c.scorch})`);
    g.addColorStop(0.7 * fade, `rgba(150,110,50,${0.25 * c.scorch})`);
    g.addColorStop(1, 'rgba(150,110,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // Soot: smoke stains streaked upwards in tongues.
  for (let i = 0; i < Math.round(c.soot * 16); i++) {
    const x = r() * w;
    const width = between(r, 0.06, 0.2) * w;
    const g = ctx.createLinearGradient(0, h, 0, h * between(r, 0, 0.6));
    g.addColorStop(0, `rgba(12,10,9,${0.55 * c.soot})`);
    g.addColorStop(1, 'rgba(12,10,9,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, h * 0.75, width, h * 0.6, 0, 0, 7);
    ctx.fill();
  }
}

/** Cracks in plastic: dark hairlines with a pale stress edge, from the edges in. */
function cracks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
  r: Random,
) {
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.round(amount * 9); i++) {
    // Start on an edge, and wander inwards, forking.
    const side = Math.floor(r() * 4);
    let x = side === 0 ? 0 : side === 1 ? w : r() * w;
    let y = side === 2 ? 0 : side === 3 ? h : r() * h;
    let heading = Math.atan2(h / 2 - y, w / 2 - x) + between(r, -0.6, 0.6);
    const steps = Math.round(between(r, 4, 12));
    const points: [number, number][] = [[x, y]];
    for (let s = 0; s < steps; s++) {
      heading += between(r, -0.5, 0.5);
      x += Math.cos(heading) * w * 0.05;
      y += Math.sin(heading) * h * 0.05;
      points.push([x, y]);
    }
    for (const [colour, width, dx] of [
      ['rgba(235,232,222,0.5)', 3.2, 1],
      ['rgba(20,18,16,0.9)', 1.6, 0],
    ] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(points[0][0] + dx, points[0][1]);
      for (const [px, py] of points.slice(1)) ctx.lineTo(px + dx, py);
      ctx.stroke();
    }
  }
}

/** A canvas texture for a material, kept in `kit`. */
function canvasMaterial(
  kit: PanelKit,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  options: { roughness: number; metalness?: number; transparent?: boolean },
) {
  const { context, texture } = createCanvasTexture(w, h);
  paint(context, w, h);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    roughness: options.roughness,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    depthWrite: !options.transparent,
    polygonOffset: options.transparent ?? false,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  kit.materials.push(material);
  return material;
}

/** Its vital fluid: a dark brown, thin enough at its edges to show amber. */
const FLUID = '36,18,6';
const FLUID_THIN = '92,50,16';

/**
 * Brown fluid that has leaked out of a stand: a glossy material whose
 * canvas, `w` × `h` pixels, `paint` fills with the fluid where it lies and
 * leaves clear elsewhere. Wet, it shines and mirrors the room.
 */
function fluidMaterial(
  kit: PanelKit,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const material = canvasMaterial(kit, w, h, paint, {
    roughness: 0.05,
    transparent: true,
  }) as MeshStandardMaterial;
  material.envMapIntensity = 3;
  return material;
}

/**
 * A run of fluid down a surface from its top edge: a streak narrowing as
 * it goes, ending in the bead of a drip.
 */
function run(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  length: number,
  r: Random,
) {
  ctx.fillStyle = `rgba(${FLUID},0.92)`;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, 0);
  let wander = 0;
  const steps = 12;
  const right: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const y = (i / steps) * length;
    wander += between(r, -0.6, 0.6);
    const half = (width / 2) * (1 - (0.55 * i) / steps);
    ctx.lineTo(x + wander - half, y);
    right.push([x + wander + half, y]);
  }
  for (const [px, py] of right.reverse()) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + wander, length, width * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

/** A soft round glow, for the new stand's aura. */
function glowSprite(kit: PanelKit, colour: string, size: number) {
  const { context: c, texture } = createCanvasTexture(128, 128);
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = new SpriteMaterial({
    map: texture,
    color: new Color(colour),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  kit.materials.push(material);
  const sprite = new ParticleSprite(material);
  sprite.scale.setScalar(size);
  // A glow takes no clicks: they go through to the button.
  return { sprite, material };
}

/**
 * Whatever vital fluid the stand ran on, `amount` of it leaked out from the
 * tear: run down the post, pooled on the base round its foot and over the
 * edge on the `side` it leans to, and spread across the floor in a glossy
 * brown puddle, pulled out to that side as if the floor fell away there.
 */
function leaking(
  kit: PanelKit,
  stand: ReturnType<typeof createMobileStand>,
  amount: number,
  side: number,
  r: Random,
) {
  const wet = (mesh: Mesh) => {
    mesh.raycast = () => {};
    stand.group.add(mesh);
    return mesh;
  };
  // Down the post, from the tear to the collar at its foot.
  const length = STAND_BEND_Y - 0.135;
  const coat = fluidMaterial(kit, 256, 512, (ctx, w, h) => {
    const runs = Math.round(4 + 6 * amount);
    for (let i = 0; i < runs; i++)
      run(
        ctx,
        // Most on the side it leans to: the canvas wraps from the back.
        w * (0.75 - side * 0.25) + between(r, -0.3, 0.3) * w,
        between(r, 6, 18),
        h * between(r, 0.35, 1),
        r,
      );
  });
  const film = wet(
    new Mesh(new CylinderGeometry(0.0306, 0.0306, length, 24, 1, true), coat),
  );
  film.position.y = 0.135 + length / 2;
  // On the base: a pool round the foot of the post, and a run to the edge.
  const plate = fluidMaterial(kit, 512, 512, (ctx, w, h) => {
    const s = w / 0.44;
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = `rgba(${FLUID_THIN},0.8)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.085 * s, 0.075 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${FLUID},0.92)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.075 * s, 0.065 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // The run to the edge: a canvas's x is the stand's x.
    ctx.beginPath();
    ctx.moveTo(side * 0.05 * s, -0.02 * s);
    ctx.quadraticCurveTo(side * 0.14 * s, 0.03 * s, side * 0.225 * s, 0.01 * s);
    ctx.lineTo(side * 0.225 * s, 0.05 * s);
    ctx.quadraticCurveTo(side * 0.13 * s, 0.07 * s, side * 0.05 * s, 0.04 * s);
    ctx.closePath();
    ctx.fill();
  });
  const pool = wet(new Mesh(new PlaneGeometry(0.44, 0.44), plate));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.1153;
  // Over the edge and down the skirt.
  const edge = fluidMaterial(kit, 256, 64, (ctx, w, h) => {
    for (let i = 0; i < 3; i++)
      run(
        ctx,
        w * (0.5 + side * between(r, 0.02, 0.12)),
        between(r, 5, 10),
        h * 0.9,
        r,
      );
  });
  const drip = wet(new Mesh(new PlaneGeometry(0.44, 0.05), edge));
  drip.position.set(side * 0.2207, 0.09, 0);
  drip.rotation.y = (side * Math.PI) / 2;
  // On the floor: a puddle under the base, pulled out to the side, with
  // drops flung beside it. 2.6 m square, its centre under the stand.
  const SIZE = 2.6;
  const floor = fluidMaterial(kit, 1024, 1024, (ctx, w, h) => {
    const s = w / SIZE;
    ctx.translate(w / 2, h / 2);
    // Its course: from under the stand out to the side, curving back, clear
    // of the label in front.
    const reach = 0.55 + 0.45 * amount;
    const blobs: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      blobs.push([
        side * (0.1 + reach * k) + between(r, -0.02, 0.02),
        0.02 - 0.2 * k * k + between(r, -0.02, 0.02),
        (0.3 * (1 - k) ** 1.4 + 0.04) * between(r, 0.85, 1.15),
      ]);
    }
    // Drops beside the tongue, where it was pulled.
    for (let i = 0; i < 14; i++) {
      const [x, z] = blobs[4 + Math.floor(r() * 18)];
      blobs.push([
        x + between(r, -0.12, 0.12),
        z + between(r, -0.1, 0.12),
        between(r, 0.006, 0.02),
      ]);
    }
    const fill = (grow: number, colour: string, shrink = 1) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (const [x, z, radius] of blobs) {
        ctx.moveTo(x * s + (radius * shrink + grow) * s, z * s);
        ctx.arc(x * s, z * s, (radius * shrink + grow) * s, 0, Math.PI * 2);
      }
      ctx.fill();
    };
    // Thin at its edge, where it shows amber, deep in the middle; its
    // edge rounded off, as a liquid's is, not scalloped by the drops.
    ctx.filter = `blur(${0.008 * s}px)`;
    fill(0.006, `rgba(${FLUID_THIN},0.7)`);
    ctx.filter = `blur(${0.004 * s}px)`;
    fill(0, `rgba(${FLUID},0.96)`);
    ctx.filter = `blur(${0.03 * s}px)`;
    fill(0, 'rgba(14,6,2,0.6)', 0.6);
    // Its wet sheen: the gallery's light lying on it in soft streaks, kept
    // inside the fluid.
    ctx.globalCompositeOperation = 'source-atop';
    ctx.filter = `blur(${0.025 * s}px)`;
    for (let i = 3; i < 20; i += 4) {
      const [x, z, radius] = blobs[i];
      ctx.fillStyle = 'rgba(214,190,160,0.22)';
      ctx.beginPath();
      ctx.ellipse(
        (x - side * radius * 0.2) * s,
        (z - radius * 0.35) * s,
        radius * 0.55 * s,
        radius * 0.18 * s,
        side * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  });
  const puddle = wet(new Mesh(new PlaneGeometry(SIZE, SIZE), floor));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.001;
  // And it mirrors what stands over it, the wreck and the light, darkly and
  // tinted by the fluid: a planar reflection drawn only where it lies.
  const mirror = new Reflector(new PlaneGeometry(SIZE, SIZE), {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
    shader: PUDDLE_SHADER,
  });
  const reflection = mirror.material as ShaderMaterial;
  reflection.uniforms.mask = { value: floor.map };
  // Added to the dark fluid beneath, so the fluid stays dark and only what
  // is lit shines in it.
  reflection.transparent = true;
  reflection.blending = AdditiveBlending;
  reflection.depthWrite = false;
  mirror.raycast = () => {};
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.0015;
  stand.group.add(mirror);
  return () => mirror.dispose();
}

/**
 * Three's reflector shader, masked to a puddle: the reflection, tinted the
 * fluid's brown, only where the mask's canvas has fluid.
 */
const PUDDLE_SHADER = {
  name: 'PuddleShader',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    mask: { value: null },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vMaskUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vMaskUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D mask;
    varying vec4 vUv;
    varying vec2 vMaskUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      float wet = texture2D(mask, vMaskUv).a;
      vec3 seen = texture2DProj(tDiffuse, vUv).rgb;
      // Dark oil mirrors only what is bright: the dim room hardly shows.
      vec3 bright = seen * seen * 1.6;
      gl_FragColor = vec4(bright * vec3(0.8, 0.62, 0.42) * wet, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/**
 * A stand in `condition`, `seed` laying out its wear. Returns the stand
 * (dev9's, with `mount` for its button), `update`, which keeps a new
 * stand's aura breathing, and `dispose`, which frees what the kit does not
 * (a leak's reflection).
 */
export function createStandInCondition(
  kit: PanelKit,
  condition: StandCondition,
  seed: number,
) {
  const r = rng(seed);
  const chrome = condition.finish === 'chrome';
  const stand = createMobileStand(kit, { chrome });
  const c = condition;
  const worn =
    c.scratches + c.grime + c.rust + c.graffiti + c.soot + c.scorch > 0;

  // The post: two lengths, each painted with its share of the wear.
  if (worn) {
    const postPaint = (bottom: number, metres: number) =>
      canvasMaterial(
        kit,
        256,
        Math.round((256 * metres) / (2 * Math.PI * 0.03)),
        (ctx, w, h) => weather(ctx, w, h, c, r, '#a4abae', { bottom, metres }),
        { roughness: 0.6, metalness: 0.45 },
      );
    stand.lowerPost.material = postPaint(0.115, STAND_BEND_Y - 0.115);
    stand.upperPost.material = postPaint(STAND_BEND_Y, 1.035 - STAND_BEND_Y);
    stand.mountingPlate.material = canvasMaterial(
      kit,
      128,
      128,
      (ctx, w, h) =>
        weather(ctx, w, h, { ...c, graffiti: 0 }, r, '#a4abae', {
          bottom: 0.985,
          metres: 0.1,
        }),
      { roughness: 0.6, metalness: 0.45 },
    );
    // The base: scraped paint, its top tagged and dirtied.
    stand.plate.material = canvasMaterial(
      kit,
      512,
      512,
      (ctx, w, h) =>
        weather(ctx, w, h, { ...c, soot: c.soot * 0.6 }, r, '#3a3f42', {
          bottom: 0,
          metres: 0.1,
        }),
      { roughness: 0.7, metalness: 0.25 },
    );
    const skirt = createPs1Material({
      color: new Color('#3a3f42')
        .lerp(new Color('#2a241e'), c.grime * 0.5)
        .lerp(new Color('#6b3a1e'), c.rust * 0.4)
        .lerp(new Color('#121010'), c.soot * 0.6),
      roughness: 0.75,
      metalness: 0.2,
    });
    kit.materials.push(skirt);
    for (const s of stand.skirts) s.material = skirt;
  }

  // The control station: its plastic yellowed, grimed and, burnt, charred
  // and sagging; its case cracked.
  const station = stand.station;
  const body = station.body.material as MeshStandardMaterial;
  const lid = station.lid.material as MeshStandardMaterial;
  if (!chrome) {
    body.color
      .lerp(new Color('#b8b29a'), c.grime * 0.6)
      .lerp(new Color('#3b2a1f'), c.scorch * 0.75)
      .lerp(new Color('#161311'), c.soot * 0.35);
    lid.color
      .lerp(new Color('#3a3630'), c.grime * 0.4)
      .lerp(new Color('#1a1512'), c.scorch * 0.6);
    body.roughness = Math.min(1, body.roughness + c.scorch * 0.3);
  }
  if (c.scorch > 0) {
    // Heat softened the case: it slumps, its lid askew.
    station.body.scale.set(1 + 0.04 * c.scorch, 1 - 0.06 * c.scorch, 1);
    station.lid.rotation.z = 0.05 * c.scorch;
    station.lid.position.y = -0.0015 * c.scorch;
  }
  const decal = (
    w: number,
    h: number,
    paint: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ) => {
    const material = canvasMaterial(
      kit,
      256,
      Math.round((256 * h) / w),
      paint,
      {
        roughness: 0.6,
        transparent: true,
      },
    );
    const mesh = new Mesh(new PlaneGeometry(w, h), material);
    // Marks on the case take no clicks: they go to the button.
    mesh.raycast = () => {};
    return mesh;
  };
  // The case's outer faces: its rounded body is 69 mm across and 41 mm
  // deep, its back at z = 0.
  const half = 0.0346 + 0.0003;
  const depth = 0.041;
  const across = 0.062;
  if (c.cracks > 0 || c.soot > 0) {
    // On each side and over the top, cracks and soot.
    // x, y, turn about y, turn about x, width, height of each face.
    const faces: [number, number, number, number, number, number][] = [
      [half, 0, Math.PI / 2, 0, depth, across],
      [-half, 0, -Math.PI / 2, 0, depth, across],
      [0, half, 0, -Math.PI / 2, across, depth],
      [0, -half, 0, Math.PI / 2, across, depth],
    ];
    for (const [x, y, turnY, turnX, fw, fh] of faces) {
      const mark = decal(fw, fh, (ctx, w, h) => {
        if (c.soot > 0) {
          const g = ctx.createLinearGradient(0, h, 0, 0);
          g.addColorStop(0, `rgba(14,11,9,${0.7 * c.soot})`);
          g.addColorStop(1, `rgba(14,11,9,${0.2 * c.soot})`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
        cracks(ctx, w, h, c.cracks, r);
      });
      mark.position.set(x, y, depth / 2);
      mark.rotation.set(turnX, turnY, 0, 'YXZ');
      station.group.add(mark);
    }
  }
  if (c.cracks > 0 || c.graffiti > 0 || c.soot > 0) {
    // The lid's face, round the button: cracks, soot and a marker scrawl.
    const face = decal(0.06, 0.06, (ctx, w, h) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(w / 2, h / 2 - h * 0.06, w * 0.24, 0, Math.PI * 2, true);
      ctx.clip();
      if (c.soot > 0) {
        ctx.fillStyle = `rgba(14,11,9,${0.5 * c.soot})`;
        ctx.fillRect(0, 0, w, h);
      }
      cracks(ctx, w, h, c.cracks, r);
      if (c.graffiti > 0) {
        ctx.font = `italic 900 ${h * 0.2}px "Marker Felt", Impact, sans-serif`;
        ctx.fillStyle = '#f2f2f2';
        ctx.rotate(-0.25);
        ctx.fillText(TAGS[Math.floor(r() * TAGS.length)], w * 0.02, h * 0.95);
      }
      ctx.restore();
    });
    face.position.set(0, 0, 0.0532);
    station.group.add(face);
  }
  if (c.graffiti > 0) {
    // A sticker slapped on the side of the box.
    const sticker = decal(0.032, 0.022, (ctx, w, h) => {
      ctx.fillStyle = '#f5e23a';
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, h * 0.2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.font = `900 ${h * 0.45}px Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DON’T', w / 2, h / 2);
    });
    sticker.position.set(half + 0.0004, -0.01, 0.025);
    sticker.rotation.set(0, Math.PI / 2, 0.3);
    station.group.add(sticker);
  }

  // The post bent at its bend, to one side and a little back, as a knock
  // from in front would; torn, it hangs.
  const bend = (c.bend * Math.PI) / 180;
  const side = r() < 0.5 ? -1 : 1;
  stand.head.rotation.set(-bend * 0.3, 0, side * bend * 0.95);
  const steel = stand.lowerPost.material as Material;
  if (c.bend > 0) {
    // Where it bends, the tube creases: a squashed collar of its own steel.
    const crease = new Mesh(new SphereGeometry(0.032, 20, 10), steel);
    crease.scale.set(1.05, 0.55 + Math.min(0.4, bend), 1.05);
    crease.position.y = STAND_BEND_Y;
    stand.group.add(crease);
  }
  if (c.severed) {
    // Torn most of the way through: jagged teeth round the tear, the
    // wiring inside pulled out and dangling across it.
    const torn = createPs1Material({
      color: '#5d5f5c',
      roughness: 0.5,
      metalness: 0.6,
    });
    kit.materials.push(torn);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + between(r, -0.2, 0.2);
      const tooth = new Mesh(
        new ConeGeometry(0.008, between(r, 0.015, 0.035), 4),
        torn,
      );
      tooth.position.set(
        Math.cos(a) * 0.027,
        STAND_BEND_Y + 0.008,
        Math.sin(a) * 0.027,
      );
      tooth.rotation.set(between(r, -0.4, 0.4), 0, between(r, -0.4, 0.4));
      stand.group.add(tooth);
    }
    const ends = new Vector3(0, 0.02, 0.025);
    stand.head.updateMatrix();
    const far = ends.clone().applyMatrix4(stand.head.matrix);
    for (const [colour, dx] of [
      ['#7a4a25', -0.006],
      ['#2950a8', 0],
      ['#3f9a3a', 0.006],
    ] as const) {
      const wire = new CatmullRomCurve3([
        new Vector3(dx, STAND_BEND_Y - 0.01, 0),
        new Vector3(dx * 2, STAND_BEND_Y - 0.06, 0.04),
        far.clone().add(new Vector3(dx, -0.03, 0)),
        far.clone().add(new Vector3(dx, 0, 0)),
      ]);
      const material = createPs1Material({ color: colour, roughness: 0.6 });
      kit.materials.push(material);
      stand.group.add(
        new Mesh(new TubeGeometry(wire, 24, 0.0016, 6, false), material),
      );
    }
  }
  if (c.scorch > 0) {
    // The lead melted and drooping, its sheath swollen and blistered: its
    // loop sags lower and further out, but its ends stay in the gland on
    // the box and the grommet in the post.
    const lead = stand.cable.geometry as TubeGeometry;
    const path = lead.parameters.path as CatmullRomCurve3;
    const points = path.points.map((p, i, all) =>
      i === 0 || i === all.length - 1
        ? p.clone()
        : p
            .clone()
            .add(new Vector3(0.008, -0.012, 0.006).multiplyScalar(c.scorch)),
    );
    stand.cable.geometry = new TubeGeometry(
      new CatmullRomCurve3(points),
      32,
      0.003 * (1 + 0.25 * c.scorch),
      8,
      false,
    );
    lead.dispose();
    (stand.cable.material as MeshStandardMaterial).roughness = 1;
  }
  for (let i = 0; i < c.castorsMissing; i++) {
    // A castor broken off: its wheel gone, its fork bent outwards.
    const castor = stand.castors[stand.castors.length - 1 - i];
    castor.wheel.visible = false;
    castor.swivel.rotation.set(0.5, 0.8, 0.2);
  }

  // It leaks to the side its head hangs over.
  const dispose = c.leak > 0 ? leaking(kit, stand, c.leak, -side, r) : () => {};

  // New: an aura, breathing gently round the box and the whole stand.
  let update = (time: number) => void time;
  if (chrome) {
    const halo = glowSprite(kit, '#ffe9c4', 0.34);
    halo.sprite.position.set(0, 1.035 - STAND_BEND_Y, 0.08);
    stand.head.add(halo.sprite);
    const aura = glowSprite(kit, '#ffd9a0', 1.5);
    aura.sprite.position.set(0, 0.62, 0);
    stand.group.add(aura.sprite);
    update = (time) => {
      const breath = 0.5 + 0.5 * Math.sin(time * 1.6);
      halo.material.opacity = 0.55 + 0.35 * breath;
      aura.material.opacity = 0.16 + 0.1 * breath;
      halo.sprite.scale.setScalar(0.32 + 0.04 * breath);
    };
  }
  return { ...stand, update, dispose };
}
