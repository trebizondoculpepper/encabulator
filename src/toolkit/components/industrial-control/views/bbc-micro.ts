/** Ported from VX3 Simulator; original hardware geometry retained. */
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import { combineUnletteredKeys } from './unlettered-keys';
import type { BufferGeometry, Material, Texture } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import {
  createLabelTexture,
  createCanvasTexture,
} from '../../core/views/screens';

/** Original Model B geometry, 410 × 345 × 75 mm; the front faces +Z. */
export function createBbcMicro(worldUnitsPerMetre: number) {
  const group = new Group();
  group.name = 'BbcMicroModelB';
  group.scale.setScalar(worldUnitsPerMetre);
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const paints = new Map<string, Material>();
  const paint = (color: string) => {
    let value = paints.get(color);
    if (!value) {
      value = createPs1Material({ color, roughness: 0.76 });
      paints.set(color, value);
      materials.push(value);
    }
    return value;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
    parent = group,
  ) => {
    const part = new Mesh(new BoxGeometry(w, h, d), paint(color));
    part.position.set(x, y, z);
    parent.add(part);
    return part;
  };
  const cream = '#ded3b3';
  const profile = new Shape();
  // Extrusion is along X after rotation; its top slopes down to the front lip.
  profile.moveTo(-0.1695, 0.011);
  profile.lineTo(0.1695, 0.011);
  profile.lineTo(0.1695, 0.072);
  profile.lineTo(0.025, 0.072);
  profile.lineTo(-0.1695, 0.031);
  profile.closePath();
  const shell = new Mesh(
    new ExtrudeGeometry(profile, {
      depth: 0.404,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003,
    }),
    paint(cream),
  );
  shell.rotation.y = Math.PI / 2;
  shell.position.x = -0.202;
  group.add(shell);
  box(0.406, 0.002, 0.339, '#aea58b', 0, 0.018, 0);
  for (const x of [-0.16, 0.16])
    for (const z of [-0.13, 0.13])
      box(0.026, 0.008, 0.022, '#272923', x, 0.004, z);

  const keyboard = new Group();
  keyboard.position.set(0, 0.0518, 0.073);
  keyboard.rotation.x = 0.208;
  group.add(keyboard);
  box(0.386, 0.002, 0.19, '#191b18', 0, 0, 0, keyboard);

  const caps: Mesh[] = [];
  const key = (
    _legend: string,
    x: number,
    z: number,
    width = 0.019,
    color = '#292b27',
  ) => {
    const cap = new Mesh(new BoxGeometry(width, 0.008, 0.017), paint(color));
    cap.position.set(x, 0.006, z);
    keyboard.add(cap);
    caps.push(cap);
  };
  for (let i = 0; i < 10; i++)
    key(`f${i}`, -0.11 + i * 0.023, -0.07, 0.019, '#bf382c');
  key('BREAK', 0.151, -0.07, 0.019);
  const rows = [
    [
      'ESCAPE',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      '-',
      '^',
      '\\',
    ],
    ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '@', '[', '_'],
    [
      'CAPS LOCK',
      'CTRL',
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      '; ',
      ':',
    ],
    ['SHIFT LOCK', 'SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
  ];
  rows.forEach((row, r) =>
    row.forEach((legend, i) =>
      key(
        legend.trim(),
        -0.161 + i * 0.0224 + (r === 1 ? 0.002 : 0),
        -0.045 + r * 0.025,
        i === 0 ? 0.021 : 0.019,
      ),
    ),
  );
  // Distinct cursor cluster and wider Return/Shift, as on the original layout.
  key('LEFT', 0.153, -0.045, 0.018, '#5b523c');
  key('RIGHT', 0.176, -0.045, 0.018, '#5b523c');
  key('UP', 0.153, -0.021, 0.018, '#5b523c');
  key('DOWN', 0.176, -0.021, 0.018, '#5b523c');
  key('RETURN', 0.148, 0.004, 0.041);
  key('SHIFT', 0.127, 0.03, 0.039);
  key('DELETE', 0.158, 0.03, 0.019);
  key('COPY', 0.181, 0.03, 0.019, '#5b523c');
  key('', -0.007, 0.065, 0.184);

  const deckLabel = (
    text: string,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    parent = group,
    plate = '#252723',
  ) => {
    const badge = createLabelTexture(text, { ink: '#e7dcc0', plate, size: 14 });
    textures.push(badge.texture);
    const material = createPs1Material({ map: badge.texture }, true);
    materials.push(material);
    const mesh = new Mesh(new PlaneGeometry(width, height), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  };
  deckLabel(
    'BBC MICROCOMPUTER SYSTEM     MODEL B',
    0.266,
    0.014,
    0.008,
    0.0752,
    -0.02,
  );
  // Small procedural owl badge, rather than a borrowed raster image.
  const owl = createCanvasTexture(64, 64);
  textures.push(owl.texture);
  owl.context.fillStyle = '#292b26';
  owl.context.fillRect(0, 0, 64, 64);
  owl.context.strokeStyle = '#e6ddc4';
  owl.context.lineWidth = 3;
  for (const x of [22, 42]) {
    owl.context.beginPath();
    owl.context.arc(x, 25, 9, 0, Math.PI * 2);
    owl.context.stroke();
    owl.context.fillStyle = '#e6ddc4';
    owl.context.fillRect(x - 2, 23, 4, 4);
  }
  owl.context.beginPath();
  owl.context.moveTo(12, 10);
  owl.context.lineTo(16, 44);
  owl.context.lineTo(32, 55);
  owl.context.lineTo(48, 44);
  owl.context.lineTo(52, 10);
  owl.context.stroke();
  owl.texture.needsUpdate = true;
  const owlMaterial = createPs1Material({ map: owl.texture }, true);
  materials.push(owlMaterial);
  const owlBadge = new Mesh(new PlaneGeometry(0.019, 0.017), owlMaterial);
  owlBadge.rotation.x = -Math.PI / 2;
  owlBadge.position.set(0.165, 0.0753, -0.02);
  group.add(owlBadge);
  for (let i = 0; i < 7; i++)
    box(0.002, 0.001, 0.016, '#585748', -0.176 + i * 0.006, 0.0751, -0.019);
  for (let i = 0; i < 30; i++)
    box(0.002, 0.001, 0.026, '#76715f', -0.174 + i * 0.012, 0.0751, -0.151);

  for (const [i, text] of [
    'CASSETTE MOTOR',
    'CAPS LOCK',
    'SHIFT LOCK',
  ].entries()) {
    const x = -0.153 + i * 0.027;
    deckLabel(text, 0.025, 0.01, x, 0.003, 0.069, keyboard);
    const led = new Mesh(
      new CylinderGeometry(0.0018, 0.0018, 0.001, 8),
      paint('#7f2620'),
    );
    led.position.set(x, 0.003, 0.08);
    keyboard.add(led);
  }
  combineUnletteredKeys(keyboard, caps);
  // Rear DIN sockets, RGB connector, moulding seam and rocker switch.
  for (const x of [-0.08, -0.025, 0.03]) {
    const socket = new Mesh(
      new CylinderGeometry(0.009, 0.009, 0.002, 12),
      paint('#292b28'),
    );
    socket.rotation.x = Math.PI / 2;
    socket.position.set(x, 0.045, -0.173);
    group.add(socket);
  }
  box(0.035, 0.016, 0.003, '#333731', 0.09, 0.045, -0.173);
  const powerSwitch = box(0.02, 0.021, 0.004, '#a43a26', -0.17, 0.045, -0.173);
  powerSwitch.name = 'BBC Micro power rocker';
  return {
    group,
    powerSwitch,
    monitorHeight: 0.075 * worldUnitsPerMetre,
    dispose() {
      const geometries = new Set<BufferGeometry>();
      group.traverse((object) => {
        if (object instanceof Mesh) geometries.add(object.geometry);
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
