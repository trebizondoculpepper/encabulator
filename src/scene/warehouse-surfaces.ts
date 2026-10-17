import { RepeatWrapping } from 'three';
import type { MeshStandardMaterialParameters } from 'three';
import type { PanelKit } from './eighties-controls';
import { createPs1Material } from '../rendering/ps1-material';
import { createCanvasTexture } from './screens';
import { seeded } from './worn-paint';

/** Original, deterministic material artwork, at the scale of real building finishes. */
export function warehouseSurfaces(kit: PanelKit) {
  const random = seeded(1992);
  const texture = (
    size: number,
    draw: (c: CanvasRenderingContext2D, size: number) => void,
    repeat = false,
  ) => {
    const art = createCanvasTexture(size, size);
    draw(art.context, size);
    art.texture.needsUpdate = true;
    if (repeat) art.texture.wrapS = art.texture.wrapT = RepeatWrapping;
    kit.textures.push(art.texture);
    return art.texture;
  };
  const paint = (options: MeshStandardMaterialParameters) => {
    const material = createPs1Material(options);
    kit.materials.push(material);
    return material;
  };
  const concrete = texture(2048, (c, n) => {
    c.fillStyle = '#96968f';
    c.fillRect(0, 0, n, n);
    // Broad variations in the float finish, with fine pores close to the eye.
    for (let i = 0; i < 130; i++) {
      const x = random() * n,
        y = random() * n,
        radius = 50 + random() * 280;
      const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(
        0,
        i % 2 ? 'rgba(211,207,190,0.12)' : 'rgba(66,70,66,0.09)',
      );
      gradient.addColorStop(1, 'rgba(128,128,128,0)');
      c.fillStyle = gradient;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (let i = 0; i < 80000; i++) {
      c.fillStyle = i % 2 ? 'rgba(35,37,33,0.045)' : 'rgba(235,231,215,0.06)';
      c.fillRect(random() * n, random() * n, 1, 1);
    }
    for (let i = 0; i < 180; i++) {
      c.strokeStyle = 'rgba(210,207,193,0.09)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(random() * n, random() * n, 18 + random() * 55, 0, Math.PI * 1.4);
      c.stroke();
    }
    // Six-metre slab joints: a narrow sealed saw cut, with a pale worked edge.
    for (let i = 1; i < 5; i++) {
      const at = (i * n) / 5;
      c.fillStyle = '#686b65';
      c.fillRect(at, 0, 1.5, n);
      c.fillRect(0, at, n, 1.5);
      c.fillStyle = '#b0afa4';
      c.fillRect(at + 2, 0, 0.8, n);
      c.fillRect(0, at + 2, n, 0.8);
    }
    // Faint wheel rubs near the loading entrance; the centre stays tidy.
    c.strokeStyle = 'rgba(53,56,53,0.07)';
    c.lineWidth = 5;
    for (const y of [n * 0.48, n * 0.53]) {
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(150, y, 250, y + 30, 370, y + 10);
      c.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = ((1 + Math.floor(random() * 4)) * n) / 5;
      const y = random() * n;
      c.fillStyle = 'rgba(119,120,112,0.6)';
      c.fillRect(x - 3, y, 6, 7 + random() * 12);
    }
  });
  const blocks = texture(
    512,
    (c, n) => {
      c.fillStyle = '#dcdad0';
      c.fillRect(0, 0, n, n);
      for (let row = 0; row < 4; row++)
        for (let col = -1; col < 3; col++) {
          const x = col * 256 + (row % 2) * 128,
            y = row * 128;
          c.fillStyle = '#c4c3b9';
          c.fillRect(x, y, 256, 3);
          c.fillRect(x, y, 3, 128);
          c.fillStyle = 'rgba(255,255,245,0.2)';
          c.fillRect(x + 3, y + 3, 253, 1);
        }
      for (let i = 0; i < 13000; i++) {
        c.fillStyle = i % 2 ? 'rgba(60,60,50,0.04)' : 'rgba(255,255,245,0.12)';
        c.fillRect(random() * n, random() * n, 1, 1);
      }
    },
    true,
  );
  const zinc = texture(
    256,
    (c, n) => {
      c.fillStyle = '#aeb6b7';
      c.fillRect(0, 0, n, n);
      for (let i = 0; i < 800; i++) {
        const x = random() * n,
          y = random() * n,
          r = 2 + random() * 12,
          tone = 145 + Math.floor(random() * 55);
        c.fillStyle = `rgba(${tone},${tone + 5},${tone + 7},0.35)`;
        c.beginPath();
        c.moveTo(x - r, y);
        c.lineTo(x + r * 0.3, y - r);
        c.lineTo(x + r, y + r * 0.25);
        c.lineTo(x, y + r);
        c.closePath();
        c.fill();
      }
    },
    true,
  );
  zinc.repeat.set(3, 10);
  return {
    floor: paint({ map: concrete, roughness: 0.62, metalness: 0.02 }),
    blocks: paint({
      map: blocks,
      roughness: 0.88,
      bumpMap: blocks,
      bumpScale: 0.0018,
    }),
    band: paint({ color: '#777e7b', roughness: 0.7 }),
    cladding: paint({ color: '#d1d4d0', roughness: 0.62, metalness: 0.18 }),
    steel: paint({ color: '#b9c1c0', roughness: 0.57, metalness: 0.3 }),
    zinc: paint({ map: zinc, roughness: 0.48, metalness: 0.65 }),
    dark: paint({ color: '#454e50', roughness: 0.72 }),
    door: paint({ color: '#727f88', roughness: 0.6, metalness: 0.25 }),
    roof: paint({ color: '#dedfd7', roughness: 0.76, metalness: 0.08 }),
  };
}
