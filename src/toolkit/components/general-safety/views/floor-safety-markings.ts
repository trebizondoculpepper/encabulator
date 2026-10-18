import { Mesh, PlaneGeometry } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Floor safety markings as a tidy UK workplace lays them, in vinyl floor
 * tape and painted zones (after BS ISO 3864 colours and the HSE's
 * workplace guidance): red and white hatching to keep fire exits and
 * firefighting equipment clear, solid yellow tape for walkways, and yellow
 * and black hazard tape along an edge to take care at. Each is a flat
 * mesh lying on the floor at y = 0, its long side along x, metres.
 */

/** A painted texture laid flat, `w` × `d` metres, a hair above the floor. */
function laid(
  kit: PanelKit,
  w: number,
  d: number,
  pixels: number,
  draw: (c: CanvasRenderingContext2D, pw: number, ph: number) => void,
  lift: number,
) {
  const pw = Math.max(16, Math.round(w * pixels));
  const ph = Math.max(16, Math.round(d * pixels));
  const art = createCanvasTexture(pw, ph);
  draw(art.context, pw, ph);
  art.texture.needsUpdate = true;
  kit.textures.push(art.texture);
  const material = createPs1Material({
    map: art.texture,
    transparent: true,
    depthWrite: false,
    roughness: 0.55,
  });
  kit.materials.push(material);
  const mesh = new Mesh(new PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = lift;
  return mesh;
}

const RED = '#c8161d';
const WHITE = '#f1efe8';
const YELLOW = '#f2c014';
const BLACK = '#161616';

/**
 * A keep-clear zone in red and white hatching, bordered in red, with its
 * legend (one or two lines) in a white panel across the middle: in front
 * of a fire exit, or under an extinguisher point.
 */
export function createFireKeepClear(
  kit: PanelKit,
  w: number,
  d: number,
  legend: readonly string[] = ['KEEP CLEAR'],
) {
  const mesh = laid(
    kit,
    w,
    d,
    256,
    (c, pw, ph) => {
      const metre = pw / w;
      const band = 0.1 * metre;
      c.save();
      c.fillStyle = WHITE;
      c.fillRect(0, 0, pw, ph);
      c.fillStyle = RED;
      for (let x = -ph; x < pw + ph; x += band * 2) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + band, 0);
        c.lineTo(x + band + ph, ph);
        c.lineTo(x + ph, ph);
        c.closePath();
        c.fill();
      }
      c.restore();
      const edge = 0.05 * metre;
      c.strokeStyle = RED;
      c.lineWidth = edge;
      c.strokeRect(edge / 2, edge / 2, pw - edge, ph - edge);
      if (legend.length) {
        const size = Math.min(0.16 * metre, (ph * 0.5) / legend.length);
        c.font = `bold ${size}px Arial, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        const width = Math.max(...legend.map((l) => c.measureText(l).width));
        const boxW = Math.min(pw - edge * 3, width + size);
        const boxH = size * (legend.length + 0.4);
        c.fillStyle = WHITE;
        c.fillRect((pw - boxW) / 2, (ph - boxH) / 2, boxW, boxH);
        c.fillStyle = RED;
        legend.forEach((line, i) =>
          c.fillText(
            line,
            pw / 2,
            ph / 2 + (i - (legend.length - 1) / 2) * size,
            boxW - size * 0.3,
          ),
        );
      }
    },
    0.004,
  );
  mesh.name = 'Fire keep-clear zone';
  return mesh;
}

/** A run of solid yellow 50 mm floor tape, `length` metres along x. */
export function createWalkwayTape(kit: PanelKit, length: number) {
  const mesh = laid(
    kit,
    length,
    0.05,
    64,
    (c, pw, ph) => {
      c.fillStyle = YELLOW;
      c.fillRect(0, 0, pw, ph);
      // Worn a little where feet cross it.
      c.fillStyle = 'rgba(80,70,40,0.18)';
      for (let x = 0; x < pw; x += 37) c.fillRect(x, 0, 6, ph);
    },
    0.005,
  );
  mesh.name = 'Walkway tape';
  return mesh;
}

/** Yellow and black hazard tape, 75 mm wide, `length` metres along x. */
export function createHazardTape(kit: PanelKit, length: number) {
  const mesh = laid(
    kit,
    length,
    0.075,
    256,
    (c, pw, ph) => {
      c.fillStyle = YELLOW;
      c.fillRect(0, 0, pw, ph);
      c.fillStyle = BLACK;
      const band = ph;
      for (let x = -ph; x < pw + ph; x += band * 2) {
        c.beginPath();
        c.moveTo(x, ph);
        c.lineTo(x + band, ph);
        c.lineTo(x + band + ph, 0);
        c.lineTo(x + ph, 0);
        c.closePath();
        c.fill();
      }
    },
    0.005,
  );
  mesh.name = 'Hazard tape';
  return mesh;
}
