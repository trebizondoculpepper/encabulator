import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { NinetiesPattern } from '../game/dream-rooms';

/**
 * Garish abstract wall patterns after the designs of the early 1990s: the
 * paper cup's teal brush swathes and purple squiggles, Memphis confetti,
 * arcade carpet, windbreaker colour blocks and the rest, our own designs
 * in their spirit. Each is drawn on a square canvas that tiles seamlessly
 * (everything near an edge is drawn again across it), laid out from a seed
 * so no two rooms are alike.
 */

/** Pixels across one tile. */
const SIZE = 512;
/** Metres of wall one tile covers. */
export const PATTERN_TILE_METRES = 1.6;

type Ctx = CanvasRenderingContext2D;
type Draw = (ctx: Ctx) => void;

/** A small, fast, seeded random number generator (mulberry32). */
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

interface Tools {
  r: () => number;
  /** A number in [a, b). */
  between: (a: number, b: number) => number;
  pick: <T>(items: readonly T[]) => T;
}

function tools(seed: number): Tools {
  const r = rng(seed);
  return {
    r,
    between: (a, b) => a + (b - a) * r(),
    pick: (items) => items[Math.floor(r() * items.length)],
  };
}

/** A smooth squiggle through `points`, as a path (not stroked). */
function smoothPath(ctx: Ctx, points: readonly [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(...points[points.length - 1]);
}

/** A wave along a line from (x, y) at `angle`: `length` long, `waves` crests. */
function wave(
  x: number,
  y: number,
  angle: number,
  length: number,
  amplitude: number,
  waves: number,
): [number, number][] {
  const points: [number, number][] = [];
  const steps = Math.max(8, Math.round(waves * 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const along = t * length;
    const across = Math.sin(t * waves * Math.PI * 2) * amplitude;
    points.push([
      x + Math.cos(angle) * along - Math.sin(angle) * across,
      y + Math.sin(angle) * along + Math.cos(angle) * across,
    ]);
  }
  return points;
}

/** A looping squiggle (a trochoid), like a pen scribbling along a line. */
function loops(
  x: number,
  y: number,
  angle: number,
  length: number,
  radius: number,
  turns: number,
): [number, number][] {
  const points: [number, number][] = [];
  const steps = Math.round(turns * 14);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const along = t * length + Math.cos(a) * radius * 0.9;
    const across = Math.sin(a) * radius;
    points.push([
      x + Math.cos(angle) * along - Math.sin(angle) * across,
      y + Math.sin(angle) * along + Math.cos(angle) * across,
    ]);
  }
  return points;
}

const stroke = (
  ctx: Ctx,
  points: [number, number][],
  colour: string,
  width: number,
) => {
  smoothPath(ctx, points);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const triangle = (
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  turn: number,
) => {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
};

const zigzag = (
  x: number,
  y: number,
  angle: number,
  teeth: number,
  step: number,
  height: number,
): [number, number][] =>
  Array.from({ length: teeth * 2 + 1 }, (_, i) => {
    const along = i * step;
    const across = i % 2 ? height : 0;
    return [
      x + Math.cos(angle) * along - Math.sin(angle) * across,
      y + Math.sin(angle) * along + Math.cos(angle) * across,
    ];
  });

/** A straight-segment path (smoothPath would round off a zigzag). */
const polyline = (
  ctx: Ctx,
  points: [number, number][],
  colour: string,
  width: number,
) => {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  ctx.stroke();
};

/**
 * Each pattern: its ground, and the shapes over it, laid out by `t`. The
 * shapes are returned as drawings so they can be drawn again across the
 * tile's edges.
 */
const PATTERNS: Record<
  NinetiesPattern,
  (t: Tools) => { ground: string | Draw; shapes: Draw[] }
> = {
  cup({ between, r }) {
    const shapes: Draw[] = [];
    for (let i = 0; i < 2; i++) {
      // A broad teal swathe, painted with a dry brush: many thin strokes
      // side by side, some fainter, so its edges are ragged.
      const x = between(0, SIZE);
      const y = i * (SIZE / 2) + between(40, 200);
      const angle = between(-0.5, 0.3);
      const path = wave(x - 160, y, angle, 380, between(20, 45), 0.7);
      const bristles = Array.from({ length: 26 }, (_, b) => ({
        offset: (b - 13) * 3.4 + between(-1.5, 1.5),
        alpha: between(0.55, 1),
        width: between(2.5, 5),
        cut: between(0, 0.18),
      }));
      shapes.push((ctx) => {
        for (const b of bristles) {
          const n = Math.floor(path.length * (1 - b.cut));
          const shifted = path
            .slice(Math.floor(path.length * b.cut * 0.5), n)
            .map(
              ([px, py]) =>
                [
                  px - Math.sin(angle) * b.offset,
                  py + Math.cos(angle) * b.offset,
                ] as [number, number],
            );
          if (shifted.length < 2) continue;
          ctx.globalAlpha = b.alpha;
          stroke(ctx, shifted, '#1aa7a8', b.width);
        }
        ctx.globalAlpha = 1;
      });
      // The purple squiggle that loops across it.
      const squiggle = loops(
        x - 140 + between(-40, 40),
        y + between(-30, 30),
        angle + between(-0.25, 0.25),
        330,
        between(16, 26),
        between(4, 6),
      );
      shapes.push((ctx) => stroke(ctx, squiggle, '#4b2580', 7));
    }
    // A few small teal flecks.
    for (let i = 0; i < 6; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const a = between(0, Math.PI);
      shapes.push((ctx) =>
        stroke(
          ctx,
          [
            [x, y],
            [x + Math.cos(a) * 30, y + Math.sin(a) * 30],
          ],
          '#1aa7a8',
          5,
        ),
      );
    }
    return { ground: '#f6f3ea', shapes };
  },

  memphis({ between, pick, r }) {
    const colours = ['#ff3ea5', '#ffd400', '#00c2d1', '#7a3cff', '#111111'];
    const shapes: Draw[] = [];
    for (let i = 0; i < 34; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const colour = pick(colours);
      const kind = Math.floor(r() * 5);
      const turn = between(0, Math.PI * 2);
      if (kind === 0) {
        const size = between(16, 34);
        const filled = r() < 0.5;
        shapes.push((ctx) => {
          triangle(ctx, x, y, size, turn);
          if (filled) {
            ctx.fillStyle = colour;
            ctx.fill();
          } else {
            ctx.strokeStyle = colour;
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        });
      } else if (kind === 1) {
        const points = wave(x, y, turn, between(60, 110), 9, 2.5);
        shapes.push((ctx) => stroke(ctx, points, colour, 6));
      } else if (kind === 2) {
        const radius = between(5, 13);
        shapes.push((ctx) => {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = colour;
          ctx.fill();
        });
      } else if (kind === 3) {
        const points = zigzag(x, y, turn, 4, 12, 12);
        shapes.push((ctx) => polyline(ctx, points, colour, 5));
      } else {
        const radius = between(18, 30);
        shapes.push((ctx) => {
          ctx.beginPath();
          ctx.arc(x, y, radius, turn, turn + Math.PI);
          ctx.strokeStyle = colour;
          ctx.lineWidth = 7;
          ctx.stroke();
        });
      }
    }
    return { ground: '#f4f1e6', shapes };
  },

  arcade({ between, pick, r }) {
    const neon = ['#ff2fd0', '#2ff3ff', '#b4ff2f', '#ffea2f', '#ff7a1f'];
    const shapes: Draw[] = [];
    for (let i = 0; i < 70; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const colour = pick(neon);
      shapes.push((ctx) => {
        ctx.fillStyle = colour;
        ctx.fillRect(x, y, 2.5, 2.5);
      });
    }
    for (let i = 0; i < 9; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const radius = between(14, 40);
      const body = pick(neon);
      const ring = pick(neon);
      const tilt = between(-0.6, 0.6);
      const ringed = r() < 0.6;
      shapes.push((ctx) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = body;
        ctx.fill();
        // A dark crescent, for shading.
        ctx.beginPath();
        ctx.arc(x + radius * 0.35, y - radius * 0.2, radius * 0.85, 0, 7);
        ctx.fillStyle = 'rgba(11, 6, 32, 0.45)';
        ctx.fill();
        if (ringed) {
          ctx.beginPath();
          ctx.ellipse(x, y, radius * 1.7, radius * 0.45, tilt, 0, Math.PI * 2);
          ctx.strokeStyle = ring;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });
    }
    for (let i = 0; i < 10; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const size = between(7, 14);
      const colour = pick(neon);
      shapes.push((ctx) => {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const reach = k % 2 ? size * 0.3 : size;
          const px = x + Math.cos(a) * reach;
          const py = y + Math.sin(a) * reach;
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = colour;
        ctx.fill();
      });
    }
    for (let i = 0; i < 5; i++) {
      const points = wave(
        r() * SIZE,
        r() * SIZE,
        between(0, Math.PI * 2),
        between(70, 120),
        8,
        2,
      );
      const colour = pick(neon);
      shapes.push((ctx) => stroke(ctx, points, colour, 4));
    }
    return { ground: '#0b0620', shapes };
  },

  shards({ between, pick, r }) {
    const colours = ['#18c7b6', '#ff2a8a', '#ffe14d', '#121018', '#f4f4f4'];
    const shapes: Draw[] = [];
    for (let i = 0; i < 22; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const points = Array.from({ length: 3 }, () => [
        x + between(-70, 70),
        y + between(-70, 70),
      ]);
      const colour = pick(colours);
      shapes.push((ctx) => {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        ctx.lineTo(points[1][0], points[1][1]);
        ctx.lineTo(points[2][0], points[2][1]);
        ctx.closePath();
        ctx.fillStyle = colour;
        ctx.fill();
        ctx.strokeStyle = '#121018';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
    for (let i = 0; i < 5; i++) {
      const points = zigzag(
        r() * SIZE,
        r() * SIZE,
        between(0, Math.PI * 2),
        5,
        16,
        14,
      );
      shapes.push((ctx) => polyline(ctx, points, '#ffffff', 5));
    }
    return { ground: '#3b1b6e', shapes };
  },

  splatter({ between, pick, r }) {
    const neon = ['#39ff14', '#ff3cac', '#ff9f1c', '#2ec4ff', '#fff01f'];
    const shapes: Draw[] = [];
    for (let i = 0; i < 14; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const colour = pick(neon);
      const blobs = Array.from({ length: 8 }, () => ({
        dx: between(-18, 18),
        dy: between(-18, 18),
        radius: between(8, 20),
      }));
      const drops = Array.from({ length: 12 }, () => {
        const a = between(0, Math.PI * 2);
        const reach = between(28, 80);
        return {
          dx: Math.cos(a) * reach,
          dy: Math.sin(a) * reach,
          radius: between(1.5, 5),
        };
      });
      shapes.push((ctx) => {
        ctx.fillStyle = colour;
        for (const b of [...blobs, ...drops]) {
          ctx.beginPath();
          ctx.arc(x + b.dx, y + b.dy, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    return { ground: '#151515', shapes };
  },

  checks({ between, pick, r }) {
    const pastel = ['#9ff0d0', '#c9a7ff', '#ffb59a', '#fff38a'];
    const cell = SIZE / 8;
    const shapes: Draw[] = [];
    for (let i = 0; i < 5; i++) {
      const points = wave(
        r() * SIZE,
        r() * SIZE,
        between(0, Math.PI * 2),
        between(180, 300),
        between(18, 30),
        between(1.5, 3),
      );
      const colour = pick(pastel);
      shapes.push((ctx) => {
        stroke(ctx, points, '#111111', 30);
        stroke(ctx, points, colour, 20);
      });
    }
    return {
      ground: (ctx) => {
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 8; j++) {
            ctx.fillStyle = (i + j) % 2 ? '#111111' : '#f2f2f2';
            ctx.fillRect(i * cell, j * cell, cell, cell);
          }
      },
      shapes,
    };
  },

  windbreaker({ between, pick, r }) {
    const bands = ['#13b5b1', '#5a2ca0', '#ff3f8e', '#1b2a6b'];
    const shapes: Draw[] = [];
    for (let i = 0; i < 4; i++) {
      const points = zigzag(
        r() * SIZE,
        r() * SIZE,
        between(-0.3, 0.3),
        6,
        18,
        16,
      );
      shapes.push((ctx) => polyline(ctx, points, '#ffffff', 6));
    }
    for (let i = 0; i < 18; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const colour = pick(['#ffe14d', '#ffffff', '#ff3f8e']);
      shapes.push((ctx) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();
      });
    }
    return {
      // Diagonal bands, four to a tile so they meet across its edges.
      ground: (ctx) => {
        const period = SIZE / 4;
        for (let k = -8; k < 8; k++) {
          ctx.beginPath();
          ctx.moveTo(k * period, 0);
          ctx.lineTo((k + 1) * period, 0);
          ctx.lineTo((k + 1) * period + SIZE, SIZE);
          ctx.lineTo(k * period + SIZE, SIZE);
          ctx.closePath();
          ctx.fillStyle = bands[((k % 4) + 4) % 4];
          ctx.fill();
        }
      },
      shapes,
    };
  },

  confetti({ between, pick, r }) {
    const colours = [
      '#ff3ea5',
      '#00c2d1',
      '#ffd400',
      '#7a3cff',
      '#2fd16a',
      '#ff7a1f',
      '#111111',
    ];
    const shapes: Draw[] = [];
    for (let i = 0; i < 160; i++) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      const colour = pick(colours);
      const sides = 3 + Math.floor(r() * 3);
      const size = between(5, 13);
      const turn = between(0, Math.PI * 2);
      const corners = Array.from({ length: sides }, (_, k) => {
        const a = turn + (k * Math.PI * 2) / sides + between(-0.3, 0.3);
        const reach = size * between(0.6, 1.1);
        return [x + Math.cos(a) * reach, y + Math.sin(a) * reach];
      });
      shapes.push((ctx) => {
        ctx.beginPath();
        corners.forEach(([px, py], k) =>
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py),
        );
        ctx.closePath();
        ctx.fillStyle = colour;
        ctx.fill();
      });
    }
    return { ground: '#fbfaf5', shapes };
  },
};

/**
 * Draw `pattern`, laid out by `seed`, onto a tile that repeats seamlessly;
 * returns it as a texture set to repeat.
 */
export function createNinetiesPattern(pattern: NinetiesPattern, seed: number) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const { ground, shapes } = PATTERNS[pattern](tools(seed));
  if (typeof ground === 'string') {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, SIZE, SIZE);
  } else ground(ctx);
  // Each shape again a tile to every side, so what crosses an edge comes
  // back in at the opposite one.
  for (const draw of shapes)
    for (const dx of [-SIZE, 0, SIZE])
      for (const dy of [-SIZE, 0, SIZE]) {
        ctx.save();
        ctx.translate(dx, dy);
        draw(ctx);
        ctx.restore();
      }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
