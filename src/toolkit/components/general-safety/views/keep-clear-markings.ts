import { Mesh, PlaneGeometry } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/** Restrained painted keep-clear hatching, drawn at metre scale on the concrete. */
export function createKeepClearMarking(
  kit: PanelKit,
  width: number,
  depth: number,
) {
  const art = createCanvasTexture(1024, Math.round((1024 * depth) / width));
  const c = art.context,
    w = art.canvas.width,
    h = art.canvas.height;
  c.strokeStyle = '#d3ad38';
  c.lineWidth = (w * 0.045) / width;
  c.strokeRect(
    c.lineWidth,
    c.lineWidth,
    w - c.lineWidth * 2,
    h - c.lineWidth * 2,
  );
  c.save();
  c.beginPath();
  c.rect(
    c.lineWidth * 2,
    c.lineWidth * 2,
    w - c.lineWidth * 4,
    h - c.lineWidth * 4,
  );
  c.clip();
  for (let x = -h; x < w; x += (w * 0.32) / width) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + h, h);
    c.stroke();
  }
  c.restore();
  const font = Math.min(h * 0.24, w * 0.22);
  c.font = `bold ${font}px Arial`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const textWidth = c.measureText('KEEP CLEAR').width;
  c.clearRect(
    (w - textWidth) / 2 - 15,
    h * 0.5 - font * 0.6,
    textWidth + 30,
    font * 1.2,
  );
  c.fillStyle = '#d3ad38';
  c.fillText('KEEP CLEAR', w / 2, h / 2);
  art.texture.needsUpdate = true;
  kit.textures.push(art.texture);
  const material = createPs1Material({
    map: art.texture,
    transparent: true,
    depthWrite: false,
    roughness: 0.8,
  });
  kit.materials.push(material);
  const mesh = new Mesh(new PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  mesh.name = 'Painted KEEP CLEAR zone';
  return mesh;
}
