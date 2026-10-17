/**
 * Adapted from ArtBIT/circuitboard-painter js/generator.js (MIT),
 * https://github.com/ArtBIT/circuitboard-painter, Copyright (c) 2025 ArtBIT.
 * Full notice: circuitboard-painter.LICENSE. No UI, flow field or global RNG;
 * local deterministic seeds and board-edge clearances for static game textures.
 */
export function circuitTraces(cols: number, rows: number, seed: number) {
  let state = seed | 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dirs = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const available = new Uint8Array(cols * rows);
  const order: number[] = [];
  for (let y = 3; y < rows - 3; y++)
    for (let x = 3; x < cols - 3; x++) {
      available[y * cols + x] = 1;
      order.push(y * cols + x);
    }
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const free = (x: number, y: number) =>
    x >= 3 &&
    x < cols - 3 &&
    y >= 3 &&
    y < rows - 3 &&
    available[y * cols + x] === 1;
  const wires: number[][] = [];
  for (const start of order) {
    if (!available[start] || random() > 0.12) continue;
    let x = start % cols,
      y = Math.floor(start / cols);
    available[start] = 0;
    let direction = Math.floor(random() * 8);
    const wire = [x, y];
    while (wire.length < 100) {
      const turns = random() > 0.5 ? [0, 1, -1] : [0, -1, 1];
      let advanced = false;
      for (const turn of turns) {
        const next = (direction + turn + 8) % 8;
        const [dx, dy] = dirs[next];
        const nx = x + dx,
          ny = y + dy;
        if (!free(nx, ny)) continue;
        if (dx && dy && !free(nx, y) && !free(x, ny)) continue;
        available[ny * cols + nx] = 0;
        wire.push(nx, ny);
        x = nx;
        y = ny;
        direction = next;
        advanced = true;
        break;
      }
      if (!advanced) break;
    }
    if (wire.length >= 10) wires.push(wire);
  }
  return wires;
}
