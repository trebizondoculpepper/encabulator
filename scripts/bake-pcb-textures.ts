import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { circuitTraces } from '../src/scene/vendor/circuit-traces.ts';

const output = new URL(
  '../src/toolkit/components/industrial-control/assets/pcb/',
  import.meta.url,
);
mkdirSync(output, { recursive: true });
const variants = [
  {
    name: 'backplane',
    width: 1024,
    height: 896,
    cols: 120,
    rows: 105,
    seed: 1771,
  },
  { name: 'cabinet', width: 1024, height: 1024, cols: 90, rows: 90, seed: 613 },
  { name: 'drive', width: 768, height: 1024, cols: 75, rows: 112, seed: 650 },
  { name: 'power', width: 1024, height: 768, cols: 50, rows: 38, seed: 713 },
  ...['power', 'cpu', 'input', 'output', 'analog', 'comms'].map((kind, i) => ({
    name: `plc-${kind}`,
    width: 512,
    height: 768,
    cols: 35,
    rows: 45,
    seed: 3100 + i * 137,
  })),
];
for (const spec of variants) {
  const canvas = createCanvas(spec.width, spec.height);
  const c = canvas.getContext('2d');
  const sx = spec.width / spec.cols,
    sy = spec.height / spec.rows;
  c.fillStyle = '#145c3d';
  c.fillRect(0, 0, spec.width, spec.height);
  const traces = circuitTraces(spec.cols, spec.rows, spec.seed);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [colour, thickness] of [
    ['#0c422d', 0.38],
    ['#39865a', 0.21],
  ] as const) {
    c.strokeStyle = colour;
    c.lineWidth = sx * thickness;
    c.beginPath();
    for (const wire of traces) {
      c.moveTo(wire[0] * sx, wire[1] * sy);
      for (let i = 2; i < wire.length; i += 2)
        c.lineTo(wire[i] * sx, wire[i + 1] * sy);
    }
    c.stroke();
  }
  for (const wire of traces)
    for (const i of [0, wire.length - 2]) {
      c.beginPath();
      c.arc(wire[i] * sx, wire[i + 1] * sy, sx * 0.3, 0, Math.PI * 2);
      c.fillStyle = '#b9b287';
      c.fill();
      c.beginPath();
      c.arc(wire[i] * sx, wire[i + 1] * sy, sx * 0.12, 0, Math.PI * 2);
      c.fillStyle = '#092c20';
      c.fill();
    }
  c.strokeStyle = '#c8dac7';
  c.lineWidth = 1.5;
  c.strokeRect(sx * 2, sy * 2, spec.width - sx * 4, spec.height - sy * 4);
  c.fillStyle = '#dce4cb';
  c.font = '16px monospace';
  c.fillText(`${spec.name.toUpperCase()}  REV C`, sx * 3, sy * 2.8);
  c.font = '12px monospace';
  c.fillText('FR4 94V-0 · PEPPERDYNE', sx * 3, spec.height - sy * 1.2);
  writeFileSync(
    new URL(`${spec.name}.png`, output),
    canvas.toBuffer('image/png'),
  );
}
writeFileSync(
  new URL('manifest.json', output),
  JSON.stringify(variants, null, 2) + '\n',
);
console.log(
  `Baked ${variants.length} PCB textures into ${fileURLToPath(output)}`,
);
