import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  SRGBColorSpace,
} from 'three';
import { createPs1Material } from '../rendering/ps1-material';
import { createMicroLabel, kitPaint } from './eighties-controls';
import type { PanelKit } from './eighties-controls';
import { circuitTraces } from './vendor/circuit-traces';

/** Passive FR4 backplane, front at z=0; mounted equipment remains separate working parts. */
export function createPcbBackplane(
  kit: PanelKit,
  width: number,
  height: number,
  seed: number,
  legend: string,
) {
  const group = new Group();
  group.name = `${legend} PCB backplane`;
  group.userData.pcbBackplane = { width, height, seed };
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const c = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  c.fillStyle = '#145c3d';
  c.fillRect(0, 0, w, h);
  const pitch = 0.004;
  const cols = Math.floor(width / pitch),
    rows = Math.floor(height / pitch);
  const sx = w / cols,
    sy = h / rows;
  const traces = circuitTraces(cols, rows, seed);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Copper is visible as a subdued ridge under the solder mask.
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
  // Plated through-holes and white assembly/silkscreen markings.
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
  c.strokeRect(sx * 2, sy * 2, w - sx * 4, h - sy * 4);
  c.fillStyle = '#dce4cb';
  c.font = '18px monospace';
  c.fillText(`${legend}  REV C`, sx * 4, sy * 5);
  c.fillText('PEPPERDYNE   FR4 94V-0   COMPONENT SIDE', sx * 4, h - sy * 4);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  kit.textures.push(texture);
  const face = createPs1Material({ map: texture, roughness: 0.7 });
  kit.materials.push(face);
  const edge = kitPaint(kit, '#a49754');
  const reverse = kitPaint(kit, '#145c3d');
  const board = new Mesh(new BoxGeometry(width, height, 0.0024), [
    edge,
    edge,
    edge,
    edge,
    face,
    reverse,
  ]);
  board.position.z = -0.0012;
  group.add(board);
  const brass = kitPaint(kit, '#b2a471', 0.65);
  const silver = kitPaint(kit, '#aeb9ba', 0.7);
  // Insulated standoffs and fixing screws keep the board clear of the steel pan.
  for (const x of [-width / 2 + 0.012, width / 2 - 0.012])
    for (const y of [-height / 2 + 0.012, height / 2 - 0.012]) {
      const post = new Mesh(
        new CylinderGeometry(0.004, 0.004, 0.012, 8),
        brass,
      );
      post.rotation.x = Math.PI / 2;
      post.position.set(x, y, -0.0084);
      group.add(post);
      const screw = new Mesh(
        new CylinderGeometry(0.003, 0.003, 0.0015, 12),
        silver,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, y, 0.00075);
      group.add(screw);
    }
  // Headers stay clear of the equipment in the middle of the board.
  const plastic = kitPaint(kit, '#232929');
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.026);
    const header = new Mesh(
      new BoxGeometry(0.012, height * 0.52, 0.009),
      plastic,
    );
    header.name =
      side < 0 ? 'Backplane supply connector' : 'Backplane expansion connector';
    header.position.set(x, 0, 0.0045);
    group.add(header);
    const count = Math.floor((height * 0.52) / 0.00508);
    for (let i = 0; i < count; i++) {
      const pin = new Mesh(new BoxGeometry(0.001, 0.001, 0.004), brass);
      pin.position.set(x, (i - (count - 1) / 2) * 0.00508, 0.011);
      group.add(pin);
    }
    const mark = createMicroLabel(kit, side < 0 ? 'J1' : 'J2', {
      height: 0.005,
      ink: '#e4ead6',
    });
    mark.position.set(x, height * 0.29, 0.001);
    group.add(mark);
  }
  return group;
}
