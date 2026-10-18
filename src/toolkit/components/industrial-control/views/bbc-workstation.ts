import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createWorkstationPowerBox } from '../../architectural/views/workstation-power-box';
import { createOfficeChair } from '../../site-dressing/views/office-chair';
import { createBbcMicro } from './bbc-micro';
import { createCubMonitor } from './cub-monitor';
import { createBbcDiskDrive } from './bbc-disk-drive';

/** Original VX3 bench proportions and hardware placement, normalized to metres. */
export function createBbcWorkstation(kit: PanelKit) {
  const group = new Group();
  group.name = 'BBC Micro workstation';
  const originalMetre = 4.35 / 0.4826;
  const box = (
    w: number,
    h: number,
    d: number,
    colour: string,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), kitPaint(kit, colour));
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const width = (2.85 * 3.7) / originalMetre;
  const depth = (1.4 * 4.5) / originalMetre;
  const top = (1.3775 * 5.7) / originalMetre;
  box(
    (2.8 * 3.7) / originalMetre,
    (0.18 * 5.7) / originalMetre,
    (1.35 * 4.5) / originalMetre,
    '#896e50',
    0,
    (1.24 * 5.7) / originalMetre,
    0,
  );
  box(
    width,
    (0.035 * 5.7) / originalMetre,
    depth,
    '#c3a477',
    0,
    (1.36 * 5.7) / originalMetre,
    0,
  );
  for (const x of [-1.25, 1.25])
    for (const z of [-0.5, 0.5])
      box(
        (0.13 * 3.7) / originalMetre,
        (1.2 * 5.7) / originalMetre,
        (0.13 * 4.5) / originalMetre,
        '#3c453e',
        (x * 3.7) / originalMetre,
        (0.61 * 5.7) / originalMetre,
        (z * 4.5) / originalMetre,
      );
  const bbc = createBbcMicro(1);
  bbc.group.position.set(
    (0.42 * 3.7) / originalMetre,
    top,
    1.15 / originalMetre,
  );
  const cub = createCubMonitor(1);
  cub.group.position
    .copy(bbc.group.position)
    .add(new Vector3(0, bbc.monitorHeight, -0.23));
  const disk = createBbcDiskDrive(1);
  disk.group.position
    .copy(bbc.group.position)
    .add(new Vector3(-0.31, 0, -0.04));
  const chair = createOfficeChair(1);
  chair.group.position.set(
    bbc.group.position.x,
    0,
    (0.7 * 4.5) / originalMetre + 0.42,
  );
  chair.group.rotation.y = 0.12;
  group.add(bbc.group, cub.group, disk.group, chair.group);
  const cable = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(-0.31, 0.025, -0.185),
        new Vector3(-0.31, 0.025, -0.215),
        new Vector3(-0.16, 0.025, -0.215),
        new Vector3(-0.08, 0.042, -0.174),
      ]),
      20,
      0.0035,
      6,
      false,
    ),
    kitPaint(kit, '#333830'),
  );
  cable.position.copy(bbc.group.position);
  group.add(cable);
  const lead = (name: string, points: Vector3[], radius = 0.0035) => {
    const wire = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(points), 24, radius, 6, false),
      kitPaint(kit, '#242622'),
    );
    wire.name = name;
    group.add(wire);
  };
  const bx = bbc.group.position.x;
  const rear = bbc.group.position.z - 0.174;
  // Cords leave the rear connectors, clear the desk edge, then descend.
  lead('BBC mains flex to floor power box', [
    new Vector3(bx - 0.14, top + 0.035, rear),
    new Vector3(bx - 0.14, top + 0.02, -0.28),
    new Vector3(bx - 0.16, top - 0.04, -0.39),
    new Vector3(bx - 0.17, 0.13, -0.4),
    new Vector3(bx - 0.056, 0.071, -0.432),
  ]);
  lead('Cub monitor mains flex', [
    new Vector3(bx + 0.11, top + 0.16, -0.4),
    new Vector3(bx + 0.13, top + 0.04, -0.43),
    new Vector3(bx + 0.12, 0.12, -0.45),
    new Vector3(bx + 0.016, 0.071, -0.432),
  ]);
  lead(
    'Cub RGB signal cable to BBC RGB socket',
    [
      new Vector3(bx - 0.04, top + 0.18, -0.4),
      new Vector3(bx - 0.12, top + 0.08, -0.43),
      new Vector3(bx - 0.16, top + 0.025, -0.23),
      new Vector3(bx + 0.03, top + 0.045, rear),
    ],
    0.003,
  );
  box(0.025, 0.018, 0.018, '#242622', bx + 0.03, top + 0.045, rear - 0.004);
  const powerBox = createWorkstationPowerBox(kit);
  powerBox.position.set(bx - 0.02, 0, -0.46);
  group.add(powerBox);
  return { group, bbc, cub, disk, chair, width, depth, top };
}
