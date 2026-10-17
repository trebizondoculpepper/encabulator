import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import {
  WAREHOUSE_SKYLIGHTS,
  WAREHOUSE_TRUSSES,
  WAREHOUSE_UTILITIES,
} from '../game/warehouse-room-plan';
import type { Footprint } from '../game/walk-collision';
import type { PanelKit } from './eighties-controls';
import { createMicroLabel, kitGlow } from './eighties-controls';
import {
  createCallPoint,
  createSounderBeacon,
  createExitSign,
  createEmergencyLight,
  createExtinguisher,
  createSmokeDetector,
  createTwinSocket,
  createDistributionBoard,
} from './building-fittings';
import { mergeStatic } from './merge-static';
import { warehouseSurfaces } from './warehouse-surfaces';

/** Empty early-1990s Guildford industrial shell. No Level 2 apparatus or utility interiors. */
export function createWarehouseTrainingRoom(kit: PanelKit) {
  const group = new Group();
  group.name = 'Guildford warehouse training room';
  const p = warehouseSurfaces(kit);
  const solids: Footprint[] = [];
  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const beam = (
    parent: Object3D,
    a: Vector3,
    b: Vector3,
    width: number,
    depth: number,
    material = p.steel,
  ) => {
    const mesh = box(parent, material, width, a.distanceTo(b), depth, 0, 0, 0);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return mesh;
  };
  const label = (
    parent: Object3D,
    text: string,
    w: number,
    height: number,
    x: number,
    y: number,
    z: number,
    ink = '#e7eae5',
    plate?: string,
  ) => {
    const mesh = createMicroLabel(kit, text, {
      height,
      ink,
      plate,
      maxWidth: w,
    });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const floor = new Mesh(new PlaneGeometry(30, 30), p.floor);
  floor.name = 'Power-floated concrete with six-metre joints';
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // North/south walls. Separate UV-scaled masonry from the sheet-metal upper wall.
  const masonry = (
    parent: Object3D,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const face = new Mesh(new PlaneGeometry(width, height), p.blocks);
    const uv = face.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * width) / 1.8, (uv.getY(i) * height) / 0.9);
    face.position.set(x, y, z);
    parent.add(face);
    return face;
  };
  const wall = (x: number, z: number, yaw: number, loading = false) => {
    const g = new Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    group.add(g);
    // Leave a real opening for the loading door in the west wall.
    const spans = loading
      ? [
          { x: -9, w: 12 },
          { x: 9, w: 12 },
        ]
      : [{ x: 0, w: 30 }];
    for (const span of spans) {
      box(g, p.band, span.w, 1.2, 0.2, span.x, 0.6, -0.1);
      masonry(g, span.w, 1.8, span.x, 2.1, 0.002);
      box(g, p.cladding, span.w, 4.2, 0.15, span.x, 5.1, -0.075);
      box(g, p.dark, span.w, 0.045, 0.025, span.x, 0.025, 0.018);
    }
    if (loading) box(g, p.cladding, 6, 2.2, 0.15, 0, 6.1, -0.075);
    for (let at = -14.85; at < 15; at += 0.3) {
      const bottom = loading && Math.abs(at) < 3 ? 5 : 3;
      box(
        g,
        p.cladding,
        0.036,
        7.2 - bottom,
        0.025,
        at,
        (7.2 + bottom) / 2,
        0.008,
      );
    }
    for (const y of [3, 5.1, 7.1])
      box(g, p.steel, 30, 0.055, 0.035, 0, y, 0.025);
    return g;
  };
  const north = wall(0, -15, 0);
  wall(0, 15, Math.PI);
  const west = wall(-15, 0, Math.PI / 2, true);
  wall(15, 0, -Math.PI / 2);

  // An I-section column at each truss bearing, with bolted base plates.
  for (const z of WAREHOUSE_TRUSSES)
    for (const x of [-14.72, 14.72]) {
      box(group, p.steel, 0.22, 6.75, 0.018, x, 3.375, z * 0.979);
      for (const dx of [-0.13, 0.13])
        box(group, p.steel, 0.022, 6.75, 0.23, x + dx, 3.375, z * 0.979);
      box(group, p.steel, 0.5, 0.025, 0.46, x, 0.016, z * 0.979);
      solids.push({
        minX: x - 0.27,
        maxX: x + 0.27,
        minZ: z * 0.979 - 0.25,
        maxZ: z * 0.979 + 0.25,
      });
      for (const dx of [-0.19, 0.19])
        for (const dz of [-0.16, 0.16])
          box(group, p.zinc, 0.028, 0.024, 0.028, x + dx, 0.04, z * 0.979 + dz);
    }
  // Thirty-metre clear-span lattice girders: two chords and alternating diagonals.
  for (const z of WAREHOUSE_TRUSSES) {
    const at = z * 0.985;
    for (const y of [5.95, 6.95]) {
      box(group, p.steel, 29.45, 0.15, 0.18, 0, y, at);
      box(group, p.steel, 29.45, 0.022, 0.3, 0, y + 0.075, at);
    }
    for (let i = 0; i < 12; i++) {
      const x = -14.7 + i * 2.45;
      beam(
        group,
        new Vector3(x, 5.95, at),
        new Vector3(x + 2.45, 6.95, at),
        0.075,
        0.075,
      );
      beam(
        group,
        new Vector3(x, 5.95, at),
        new Vector3(x, 6.95, at),
        0.055,
        0.055,
      );
    }
    for (const x of [-14.5, 14.5])
      box(group, p.steel, 0.2, 1.25, 0.025, x, 6.45, at + 0.12);
  }
  // Light purlins and a nearly flat, profiled roof deck with ten actual apertures.
  for (let x = -13.5; x < 15; x += 3)
    box(group, p.steel, 0.065, 0.16, 30, x, 7.05, 0);
  for (let z = -12; z <= 12; z += 6)
    for (let x = -12; x <= 12; x += 6) {
      const light = WAREHOUSE_SKYLIGHTS.find((s) => s.x === x && s.z === z);
      if (light) {
        box(group, p.roof, 1.9, 0.08, 6, x - 2.05, 7.22, z);
        box(group, p.roof, 1.9, 0.08, 6, x + 2.05, 7.22, z);
        for (const dz of [-2.4, 2.4])
          box(group, p.roof, 2.2, 0.08, 1.2, x, 7.22, z + dz);
        const glazing = kitGlow(kit, '#cbd7dc');
        const pane = box(group, glazing, 2.2, 0.04, 3.6, x, 7.3, z);
        pane.castShadow = false;
        for (const dx of [-1.13, 1.13])
          box(group, p.zinc, 0.06, 0.18, 3.72, x + dx, 7.24, z);
        for (const dz of [-1.83, 0, 1.83])
          box(group, p.zinc, 2.3, 0.07, 0.055, x, 7.25, z + dz);
      } else box(group, p.roof, 6, 0.08, 6, x, 7.22, z);
      // Underside deck ribs, interrupted at skylight openings.
      for (let dx = -2.85; dx < 3; dx += 0.3) {
        if (light && Math.abs(dx) < 1.13) {
          for (const dz of [-2.4, 2.4])
            box(group, p.roof, 0.025, 0.035, 1.2, x + dx, 7.16, z + dz);
        } else box(group, p.roof, 0.025, 0.035, 6, x + dx, 7.16, z);
      }
    }
  // Roof-plane cross bracing in the two outer bays.
  for (const x of [-12, 12])
    for (const z of [-12, 12]) {
      beam(
        group,
        new Vector3(x - 2.8, 7.1, z - 2.8),
        new Vector3(x + 2.8, 7.1, z + 2.8),
        0.018,
        0.018,
      );
      beam(
        group,
        new Vector3(x + 2.8, 7.1, z - 2.8),
        new Vector3(x - 2.8, 7.1, z + 2.8),
        0.018,
        0.018,
      );
    }

  // A 6 × 5 m bi-parting folding door, patterned after galvanised industrial shutters.
  const loading = new Group();
  loading.name = 'Galvanised folding loading door';
  west.add(loading);
  for (const x of [-3.08, 3.08])
    box(loading, p.zinc, 0.16, 5.2, 0.16, x, 2.6, 0.1);
  box(loading, p.zinc, 6.4, 0.2, 0.22, 0, 5.15, 0.15);
  for (let i = 0; i < 4; i++) {
    const x = -2.25 + i * 1.5;
    box(loading, p.zinc, 1.488, 5, 0.055, x, 2.5, 0.09);
    for (const y of [0.08, 2.5, 4.92])
      box(loading, p.zinc, 1.44, 0.065, 0.055, x, y, 0.14);
    for (const dx of [-0.7, 0.7])
      box(loading, p.zinc, 0.055, 4.9, 0.04, x + dx, 2.5, 0.14);
    for (let dx = -0.5; dx <= 0.5; dx += 0.25)
      box(loading, p.zinc, 0.025, 4.8, 0.018, x + dx, 2.5, 0.13);
    for (const y of [0.5, 2.5, 4.5])
      box(loading, p.dark, 0.045, 0.16, 0.055, x - 0.75, y, 0.16);
  }
  for (const x of [-0.17, 0.17]) {
    box(loading, p.dark, 0.025, 0.35, 0.09, x, 1.15, 0.22);
    box(loading, p.zinc, 0.018, 4.65, 0.025, x, 2.45, 0.19);
  }
  label(loading, 'KEEP CLEAR', 1, 0.06, 0, 0.5, 0.125, '#303936');
  // A lower track and threshold, flush with the finished floor.
  box(loading, p.zinc, 6, 0.009, 0.085, 0, 0.005, 0.1);

  // Closed amenity doors: only the faces, never hidden rooms behind them.
  for (const { x, label: text } of WAREHOUSE_UTILITIES) {
    const door = new Group();
    door.name = `Closed ${text} doorway`;
    door.position.set(x, 0, 0.04);
    north.add(door);
    for (const dx of [-0.59, 0.59])
      box(door, p.steel, 0.07, 2.2, 0.11, dx, 1.1, 0.04);
    box(door, p.steel, 1.25, 0.07, 0.11, 0, 2.22, 0.04);
    box(door, p.door, 1.1, 2.13, 0.045, 0, 1.07, 0.055);
    box(door, p.zinc, 1.05, 0.3, 0.012, 0, 0.19, 0.085);
    box(door, p.zinc, 0.035, 0.18, 0.025, 0.43, 1.02, 0.1);
    box(door, p.zinc, 0.14, 0.025, 0.04, 0.38, 1.05, 0.12);
    if (text !== 'BUILDING SERVICES') {
      box(door, p.dark, 0.18, 0.76, 0.012, -0.22, 1.15, 0.084);
      box(door, p.zinc, 0.015, 0.78, 0.02, -0.32, 1.15, 0.09);
    }
    label(door, text, 1, 0.045, 0, 1.75, 0.086, '#ffffff');
    if (text === 'FIRST AID')
      label(door, '+', 0.2, 0.12, 0, 1.48, 0.087, '#ffffff', '#168348');
    if (text === 'BUILDING SERVICES')
      label(
        door,
        'AUTHORISED PERSONNEL ONLY',
        0.85,
        0.025,
        0,
        1.48,
        0.087,
        '#ffffff',
      );
    else label(door, 'KEEP CLOSED', 0.5, 0.02, 0, 0.6, 0.09, '#ffffff');
  }
  label(north, 'NEUMANN DYNAMIK', 5, 0.14, 0, 3.7, 0.08, '#3b474a');
  label(
    north,
    'GUILDFORD  /  TRAINING WORKSHOP',
    5,
    0.065,
    0,
    3.4,
    0.08,
    '#4d5a5a',
  );

  // Suspended linear luminaires, replaced inside their industrial housings.
  const lights: { x: number; y: number; z: number }[] = [];
  const lens = kitGlow(kit, '#e8ede6');
  for (const z of [-10, -2, 6, 12])
    for (const x of [-10, 0, 10]) {
      for (const dx of [-0.45, 0.45])
        box(group, p.zinc, 0.008, 0.55, 0.008, x + dx, 6.38, z);
      box(group, p.steel, 1.55, 0.11, 0.3, x, 6.05, z);
      const glow = box(group, lens, 1.43, 0.018, 0.24, x, 5.985, z);
      glow.castShadow = false;
      lights.push({ x, y: 5.9, z });
    }
  // Cable ladder, rigid conduit and radiant heaters live high on the side walls.
  for (const side of [-1, 1]) {
    for (const offset of [-0.2, 0.2])
      box(group, p.zinc, 0.035, 0.08, 29, side * 14.1 + offset, 5.5, 0);
    for (let z = -14; z <= 14; z += 0.4)
      box(group, p.zinc, 0.43, 0.025, 0.025, side * 14.1, 5.5, z);
    for (const z of [-9, 6, 9]) {
      for (const dz of [-0.8, 0.8]) {
        box(group, p.zinc, 0.7, 0.035, 0.035, side * 14.5, 4.4, z + dz);
        box(group, p.zinc, 0.035, 0.2, 0.035, side * 14.2, 4.3, z + dz);
      }
      box(group, p.dark, 0.5, 0.14, 2.2, side * 14.2, 4.1, z);
      box(group, p.zinc, 0.56, 0.045, 2.25, side * 14.2, 4.2, z);
    }
  }
  for (const x of [-12, 10]) {
    box(north, p.zinc, 0.025, 4.6, 0.025, x, 2.3, 0.09);
    box(north, p.zinc, 2, 0.025, 0.025, x + 1, 2.6, 0.09);
    const socket = createTwinSocket(kit);
    socket.group.position.set(x, 1.1, 0.08);
    north.add(socket.group);
  }
  const distribution = createDistributionBoard(kit, [
    'LIGHTING',
    'SOCKETS',
    'HEATING',
    'VENTILATION',
  ]);
  distribution.group.position.set(10, 1.6, 0.08);
  north.add(distribution.group);
  label(north, 'DB-T2  /  230–400 V', 0.6, 0.025, 10, 2.3, 0.09, '#343d3e');
  for (const x of [-11, 11]) {
    box(north, p.steel, 1.2, 0.65, 0.08, x, 5.5, 0.06);
    for (let i = 0; i < 10; i++)
      box(north, p.dark, 1.1, 0.022, 0.025, x, 5.23 + i * 0.055, 0.12);
  }
  // Existing catalogue-sized UK safety fittings, reused from the fittings room.
  for (const side of [-1, 1]) {
    const station = new Group();
    station.position.set(side * 14.8, 0, 12.5);
    station.rotation.y = (-side * Math.PI) / 2;
    group.add(station);
    const call = createCallPoint(kit);
    call.group.position.set(0, 1.4, 0);
    call.set(false);
    station.add(call.group);
    const sounder = createSounderBeacon(kit);
    sounder.group.position.set(0, 2.7, 0);
    sounder.set(false);
    station.add(sounder.group);
    const exit = createExitSign(kit);
    exit.group.position.set(side * 1.4, 2.6, 0);
    exit.set(1);
    station.add(exit.group);
    label(
      station,
      'FIRE ACTION\nRaise the alarm\nLeave by the nearest exit\nReport to the assembly point',
      0.35,
      0.024,
      0.5,
      1.65,
      0.03,
      '#253b55',
      '#f2f3ea',
    );
    const emergency = createEmergencyLight(kit);
    emergency.group.position.set(0, 3.2, 0.3);
    emergency.set(false, true);
    station.add(emergency.group);
    const extinguisher = createExtinguisher(kit, 'water');
    extinguisher.group.position.set(-side, 0, 0);
    station.add(extinguisher.group);
    const co2 = createExtinguisher(kit, 'co2');
    co2.group.position.set(-side * 1.4, 0, 0);
    station.add(co2.group);
  }
  label(
    north,
    'NO SMOKING',
    0.45,
    0.04,
    -11.6,
    1.7,
    0.09,
    '#a12825',
    '#f4f4ec',
  );
  for (const { x, z } of WAREHOUSE_SKYLIGHTS.filter((_, i) => i % 3 === 0)) {
    const detector = createSmokeDetector(kit);
    detector.group.position.set(x, 7.08, z + 2.2);
    group.add(detector.group);
  }
  // Batch the static shell; only the travelling door portals are separate.
  for (const mesh of mergeStatic(group, 6)) {
    mesh.castShadow = !(mesh.material instanceof MeshBasicMaterial);
    mesh.receiveShadow = true;
  }
  return { group, solids, lights };
}
