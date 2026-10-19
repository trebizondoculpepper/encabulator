import { createKeepClearMarking } from '../toolkit/components/general-safety/views/keep-clear-markings';
import {
  createFireKeepClear,
  createHazardTape,
  createWalkwayTape,
} from '../toolkit/components/general-safety/views/floor-safety-markings';
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
  WAREHOUSE_EMERGENCY,
  WAREHOUSE_UTILITIES,
} from '../game/warehouse-room-plan';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitGlow,
} from '../toolkit/components/core/views/eighties-controls';
import { architecturalPart } from '../toolkit/components/architectural/parts/architectural-parts';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import type { ArchitecturalKind } from '../toolkit/components/architectural/logic/architectural-fittings';
import { ARCHITECTURAL_FITTINGS } from '../toolkit/components/architectural/logic/architectural-fittings';
import { WAREHOUSE_HEADS } from '../toolkit/components/architectural/logic/warehouse-services';
import type {
  ArchitecturalServices,
  WarehouseFire,
} from '../toolkit/components/architectural/logic/warehouse-services';
import {
  mergeStatic,
  mergeTree,
  staticMergeEnabled,
} from '../toolkit/components/core/views/merge-static';
import { warehouseSurfaces } from './warehouse-surfaces';

/** Empty early-1990s Guildford industrial shell. No Level 2 apparatus or utility interiors. */
export function createWarehouseTrainingRoom(
  kit: PanelKit,
  gallery = false,
  options: {
    lighting?: ArchitecturalServices;
    /**
     * The fire alarm system its fire fittings work together on; without
     * one each is a specimen on its own.
     */
    fire?: WarehouseFire;
  } = {},
) {
  const group = new Group();
  group.name = 'Guildford warehouse training room';
  const p = warehouseSurfaces(kit);
  const parts = createPartSet();
  const fitted = new Set<Object3D>();
  const seen = new Set<ArchitecturalKind>();
  const lighting = options.lighting;
  const fire = options.fire;
  const put = (
    kind: ArchitecturalKind,
    parent: Object3D,
    x: number,
    y: number,
    z: number,
    options: Parameters<typeof architecturalPart>[3] = {},
  ) => {
    const services = [
      'switch',
      'gridswitch',
      'presence',
      'luminaire',
      'distribution',
      'emergency',
      'bulkhead',
      'exit',
    ].includes(kind)
      ? lighting
      : undefined;
    const fireKind = [
      'callpoint',
      'sounder',
      'detector',
      'firepanel',
      'sprinkler',
      'valves',
      'bell',
      'testvalve',
    ].includes(kind);
    const part = parts.add(
      architecturalPart(kit, kind, services, {
        ...options,
        fire: fireKind ? fire : undefined,
      }),
    );
    part.object.position.set(x, y, z);
    parent.add(part.object);
    fitted.add(part.object);
    if (gallery && !seen.has(kind)) {
      seen.add(kind);
      const spec = ARCHITECTURAL_FITTINGS[kind];
      const label = createMicroLabel(kit, `${spec.title}\n${spec.reference}`, {
        height: 0.025,
        maxWidth: kind === 'loadingdoor' ? 4 : 1.8,
        ink: '#253a42',
        plate: '#e5e8df',
      });
      label.position.set(
        x,
        y +
          (kind === 'utilitydoor' ? 2.4 : kind === 'loadingdoor' ? 5.5 : -0.2),
        z + 0.24,
      );
      parent.add(label);
    }
    return part;
  };
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
  const east = wall(15, 0, -Math.PI / 2);

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

  // The same factory constructs installed fittings and gallery specimens.
  put('loadingdoor', west, 0, 0, 0);
  put('escapedoor', west, -13.9, 0, 0.04, { legend: 'ENTRANCE' });
  put('escapedoor', east, 13.9, 0, 0.04, { legend: 'FIRE EXIT' });
  // A bulkhead over each personnel door (`WAREHOUSE_EMERGENCY`).
  put('bulkhead', west, -13.9, 2.75, 0.06);
  put('bulkhead', east, 13.9, 2.75, 0.06);
  for (const { x, label: text } of WAREHOUSE_UTILITIES)
    put('utilitydoor', north, x, 0, 0.04, { legend: text });
  // The first aid room's own light, on a plain one-gang switch outside it.
  put('switch', north, -0.45, 1.1, 0.08);
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

  // Suspended linear luminaires, replaced inside their industrial housings,
  // in three lighting zones of four, a row each (x = −10, 0, 10), each a
  // circuit of its own with a presence detector over it
  // (`doc/research/warehouse-lighting-control.md`).
  const zoneOf = (x: number) => (x < -5 ? 1 : x > 5 ? 3 : 2);
  const lights: {
    x: number;
    y: number;
    z: number;
    zone: 1 | 2 | 3;
    /** Its fitting's light, 0 to 1. */
    output: () => number;
  }[] = [];
  for (const z of [-10, -2, 6, 12])
    for (const x of [-10, 0, 10]) {
      for (const dx of [-0.6, 0.6])
        box(group, p.zinc, 0.008, 0.55, 0.008, x + dx, 6.38, z);
      const part = put('luminaire', group, x, 6.05, z, { zone: zoneOf(x) });
      lights.push({
        x,
        y: 5.9,
        z,
        zone: zoneOf(x),
        output: (part as { output?: () => number }).output ?? (() => 1),
      });
    }
  // The emergency downlights on the roof steel, by Thorn's spacing guide
  // (`WAREHOUSE_EMERGENCY`, checked against BS 5266-1 by its test), each
  // fed from the zone it is in.
  for (const f of WAREHOUSE_EMERGENCY)
    if (f.kind === 'downlight' && f.height > 5)
      put('emergency', group, f.x, f.height, f.z, { zone: zoneOf(f.x) });
  const detectors = [-10, 0, 10].map((x) => ({
    part: put('presence', group, x, 6.6, 2, { zone: zoneOf(x) }),
    zone: zoneOf(x),
  }));
  // Cable ladder, rigid conduit and radiant heaters live high on the side walls.
  for (const side of [-1, 1]) {
    for (let z = -12; z <= 12; z += 3)
      put('ladder', group, side * 14.1, 5.5, z);
    for (const z of [-9, 6, 9]) {
      const heater = put('heater', group, side * 14.2, 4.1, z);
      heater.object.rotation.y = Math.PI / 2;
    }
  }
  for (const x of [-12, 10]) {
    for (let y = 0; y < 5; y++) put('conduit', north, x, y, 0.09);
    put('socket', north, x, 1.1, 0.08);
  }
  put('distribution', north, 10, 1.8, 0.08);
  put('firepanel', north, 8.3, 1.7, 0.08);
  for (const x of [-11, 11]) put('grille', north, x, 5.5, 0.06);
  for (const side of [-1, 1]) {
    const station = new Group();
    station.position.set(side * 14.8, 0, 12.5);
    station.rotation.y = (-side * Math.PI) / 2;
    group.add(station);
    put('callpoint', station, 0, 1.4, 0, { index: side > 0 ? 1 : 0 });
    put('sounder', station, 0, 2.7, 0);
    put('exit', station, side * 1.4, 2.6, 0);
    put('emergency', station, 0, 3.2, 0.3);
    put('water', station, -side, 0, 0);
    put('co2', station, -side * 1.4, 0, 0);
    // A bank of zone switches at each exit, two-way, as a large space is
    // switched; the emergency lighting test key on the entrance's.
    put('gridswitch', station, -side * 0.55, 1.15, 0, {
      index: side > 0 ? 1 : 0,
    });
    if (lighting)
      label(
        station,
        'ZONE 1 · 2 · 3, ROW BY ROW',
        0.3,
        0.012,
        -side * 0.55,
        1.07,
        0.004,
      );

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
  }
  put('valves', north, 12.7, 0, 0.04);
  put('testvalve', north, 13.2, 1.2, 0.1);
  put('bell', north, 13.2, 2.9, 0.04);
  const riser = put('pipe', north, 12.7, 4.15, 0.16, { length: 3.5 });
  riser.object.name = 'Sprinkler riser above valve set';
  // Wet-system pipework and pendant heads below the roof girders. No room-wide wiring yet.
  for (let z = -13.5; z <= 13.5; z += 3) {
    for (let x = -13.5; x <= 13.5; x += 3) {
      put('pipe', group, x, 5.85, z).object.rotation.z = Math.PI / 2;
    }
    put('pipe', group, 14.2, 5.85, z).object.rotation.x = Math.PI / 2;
  }
  WAREHOUSE_HEADS.forEach(({ x, z }, index) =>
    put('sprinkler', group, x, 5.82, z, { fallDistance: 5.82, index }),
  );
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
  for (const { x, z } of WAREHOUSE_SKYLIGHTS.filter((_, i) => i % 3 === 0))
    put('detector', group, x, 7.08, z + 2.2);
  if (gallery) {
    // Accessible eye-level specimens of the small roof and fire-system components.
    const samples = new Group();
    samples.position.set(0, 0, 14.8);
    samples.rotation.y = Math.PI;
    group.add(samples);
    label(samples, 'ARCHITECTURAL FITTINGS', 8, 0.15, 0, 3.2, 0.05, '#283f49');
    const kinds: ArchitecturalKind[] = [
      'distribution',
      'socket',
      'callpoint',
      'sounder',
      'detector',
      'sprinkler',
      'emergency',
      'exit',
      'firepanel',
      'testvalve',
      'bell',
      'switch',
      'lever',
      'pull',
      'panic',
      'cableprotector',
    ];
    kinds.forEach((kind, i) => {
      const x = -10.5 + (i % 8) * 3,
        y = i < 8 ? 2.15 : 1.1;
      box(samples, p.band, 2.6, 0.8, 0.035, x, y, 0);
      put(kind, samples, x, y, 0.04, {
        testers: kind === 'socket',
        fallDistance: y,
        length: kind === 'cableprotector' ? 1.8 : undefined,
      });
      label(
        samples,
        ARCHITECTURAL_FITTINGS[kind].title,
        2.5,
        0.045,
        x,
        y - 0.32,
        0.08,
        '#f2f4e9',
      );
    });
  }
  const gateMark = createKeepClearMarking(kit, 6.4, 2);
  gateMark.position.set(-13.85, 0.004, 0);
  gateMark.rotation.z = Math.PI / 2;
  group.add(gateMark);
  fitted.add(gateMark);
  // Floor safety markings, as a tidy UK workplace lays them: red and
  // white hatching keeps both escape doors and the fire points clear,
  // yellow tape marks the walkway joining the two doors along the side,
  // and yellow and black tape the edge of the loading-gate apron.
  const floorMark = (mark: Mesh, x: number, z: number, turn = 0) => {
    mark.position.x = x;
    mark.position.z = z;
    mark.rotation.z = turn;
    group.add(mark);
    fitted.add(mark);
  };
  for (const x of [-13.85, 13.85])
    floorMark(
      createFireKeepClear(
        kit,
        2,
        2,
        x > 0 ? ['FIRE EXIT', 'KEEP CLEAR'] : ['KEEP CLEAR'],
      ),
      x,
      13.85,
      x < 0 ? Math.PI / 2 : -Math.PI / 2,
    );
  // Under each pair of extinguishers, which hang 1 and 1.4 m along the
  // wall from their fire point (at z 12.5), centred between them.
  for (const x of [-14.55, 14.55])
    floorMark(
      createFireKeepClear(kit, 1, 0.8, []),
      x,
      11.3,
      x < 0 ? Math.PI / 2 : -Math.PI / 2,
    );
  for (const z of [12.7, 14.3]) floorMark(createWalkwayTape(kit, 25.7), 0, z);
  floorMark(createHazardTape(kit, 6.4), -12.8, 0, Math.PI / 2);
  // Batch the shell, then the still meshes of the fittings, across
  // fittings, a 6 m cell at a time: each fitting stays a part of its own,
  // bound to the building's services, but only what a click works, what
  // moves or hides (`userData.live`) and meshes carrying data are drawn
  // separately, so a hundred sprinkler heads draw in a few calls.
  for (const mesh of mergeStatic(group, 6, fitted)) {
    mesh.castShadow = !(mesh.material instanceof MeshBasicMaterial);
    mesh.receiveShadow = true;
  }
  const merged: Mesh[] = [];
  const batches: Mesh[] = [];
  if (staticMergeEnabled()) {
    const clickable = new Set<Object3D>(parts.uses.keys());
    const made = mergeTree(
      group,
      (object) =>
        object.name === 'Merged' ||
        clickable.has(object) ||
        !object.visible ||
        Boolean(object.userData.live) ||
        (object instanceof Mesh && Object.keys(object.userData).length > 0),
      6,
      {
        originals: (meshes) => merged.push(...meshes),
        share: true,
        solid: true,
        fine: [0.05, 0.15],
      },
    );
    batches.push(...made);
  }
  // Compass: the loading gate is SOUTH and the opposing escape is NORTH.
  group.rotation.y = Math.PI / 2;
  return {
    group,
    parts,
    fittings: [...fitted],
    /** The fittings' still meshes merged away, for a development check. */
    merged,
    /** The meshes the fittings were merged into, to cull (`detail`). */
    batches,
    solids: solids.map((s) => ({
      minX: s.minZ,
      maxX: s.maxZ,
      minZ: -s.maxX,
      maxZ: -s.minX,
    })),
    lights: lights.map((l) => ({
      x: l.z,
      y: l.y,
      z: -l.x,
      zone: l.zone,
      output: l.output,
    })),
    /** Each zone's presence detector, to be told where the player is. */
    detectors,
  };
}
