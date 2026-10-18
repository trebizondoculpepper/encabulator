import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createMicroLabel } from '../toolkit/components/core/views/eighties-controls';
import type { PartSet } from '../toolkit/components/core/parts/parts';
import { cabinetServiceDoor } from '../toolkit/components/industrial-control/parts/cabinet-service-door';
import {
  cabinetRearPaint,
  createCabinetDuct,
  createCabinetEntryPlate,
  createCabinetFilter,
  createCabinetRearPanel,
} from '../toolkit/components/industrial-control/views/cabinet-rear-fittings';
import { mergeStatic } from '../toolkit/components/core/views/merge-static';

export interface RearBucket {
  id: string;
  section: number;
  centre: number;
  height: number;
}
export interface RearRoute {
  id: string;
  purpose: string;
  section: number;
  points: readonly number[][];
}

/** Rear service space is 133 mm deep; original mounting plates remain opaque. */
export function createEncabulatorRear(
  kit: PanelKit,
  props: {
    widths: readonly number[];
    height: number;
    depth: number;
    parts: PartSet;
    paint(width: number, height: number, seed: number): Material;
    buckets: readonly RearBucket[];
  },
) {
  const group = new Group();
  group.name = 'Encabulator rear enclosure';
  const doors: {
    section: number;
    low: number;
    high: number;
    part: ReturnType<typeof cabinetServiceDoor>;
    interior: Group;
  }[] = [];
  const routes: RearRoute[] = [];
  const dataPort = new Group();
  dataPort.name = 'Section 1 low rear data entry';
  const keep = new Set<Object3D>();
  const plate = cabinetRearPaint(kit, '#b9bfb6');
  const dark = cabinetRearPaint(kit, '#333e3a');
  const cover = (
    parent: Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = plate,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  let left = -props.widths.reduce((sum, w) => sum + w, 0) / 2;
  props.widths.forEach((width, index) => {
    const section = index + 1;
    const bay = new Group();
    bay.name = `Section ${section} rear enclosure`;
    bay.position.set(left + width / 2, 0, -props.depth - 0.001);
    bay.rotation.y = Math.PI;
    group.add(bay);
    left += width;
    const w = width - 0.018;
    const paint = props.paint(w, props.height, 700 + index);
    const fixed = (low: number, high: number, name: string) => {
      const panel = createCabinetRearPanel(kit, w, high - low - 0.004, paint);
      panel.name = `Section ${section} ${name}`;
      panel.position.y = (low + high) / 2;
      bay.add(panel);
      return panel;
    };
    // Covered horizontal and vertical busways, independent of door state.
    const busGuard = cover(
      bay,
      w - 0.008,
      0.37,
      0.008,
      0,
      props.height - 0.185,
      -0.035,
      dark,
    );
    busGuard.name = `Section ${section} horizontal bus guard`;
    const verticalGuard = cover(
      bay,
      0.135,
      props.height - 0.43,
      0.008,
      width / 2 - 0.078,
      props.height / 2 - 0.025,
      -0.045,
      dark,
    );
    verticalGuard.name = `Section ${section} vertical bus guard`;
    cover(bay, w - 0.008, 0.13, 0.008, 0, 0.072, -0.035, dark);
    fixed(props.height - 0.365, props.height, 'fixed upper bus cover');
    const lower = fixed(0, 0.1524, 'fixed lower entry cover');
    const entry = createCabinetEntryPlate(
      kit,
      Math.min(w - 0.08, 0.32),
      section === 1
        ? 'CONTROL / DATA ENTRY'
        : section === 3
          ? 'PUMPS / SPARE BLANKED'
          : `SECTION ${section} CABLE ENTRY`,
    );
    entry.position.z = 0.004;
    lower.add(entry);
    if (section === 1) {
      entry.getObjectByName('Right entry blank')?.removeFromParent();
      dataPort.position.set(Math.min(w - 0.08, 0.32) * 0.3, 0.006, 0.003);
      const collar = new Mesh(
        new CylinderGeometry(0.011, 0.011, 0.012, 16),
        cabinetRearPaint(kit, '#969f98'),
      );
      collar.rotation.x = Math.PI / 2;
      dataPort.add(collar);
      const throat = new Mesh(
        new CylinderGeometry(0.0055, 0.0055, 0.013, 12),
        dark,
      );
      throat.rotation.x = Math.PI / 2;
      dataPort.add(throat);
      const dataLabel = createMicroLabel(kit, 'DATA', {
        height: 0.0035,
        ink: '#202a28',
        maxWidth: 0.04,
      });
      dataLabel.position.set(0, 0.021, 0.008);
      dataPort.add(dataLabel);
      entry.add(dataPort);
      keep.add(dataPort);
    }

    const label = createMicroLabel(
      kit,
      `NEUMANN DYNAMIK\nSECTION ${section} / REAR`,
      { height: 0.008, ink: '#182c32', maxWidth: w - 0.06 },
    );
    label.position.set(0, props.height - 0.14, 0.004);
    bay.add(label);
    const low = 0.155;
    const high = props.height - 0.368;
    if (section !== 4 && section !== 5) {
      const cuts =
        section === 2
          ? [low, low + (high - low) / 3, low + (2 * (high - low)) / 3, high]
          : [low, (low + high) / 2, high];
      for (let i = 1; i < cuts.length; i++)
        fixed(cuts[i - 1], cuts[i], 'bolted equipment cover');
      if (section === 6)
        for (const y of [0.36, high - 0.18]) {
          const fan = createCabinetFilter(kit);
          fan.position.set(-0.07, y, 0.004);
          bay.add(fan);
        }
      return;
    }
    // Section 5's split follows its actual 8U/4U bucket boundary.
    const split = 0.1524 + (props.height - 2 * 0.1524) / 3;
    const spans =
      section === 5
        ? [
            [low, split],
            [split, high],
          ]
        : [[low, high]];
    for (const [bottom, top] of spans) {
      const height = top - bottom - 0.004;
      const centre = (bottom + top) / 2;
      const part = props.parts.add(
        cabinetServiceDoor(kit, {
          width: w - 0.004,
          height,
          material: paint,
          name: `Section ${section} rear ${section === 5 ? (bottom === low ? 'terminations' : 'automation') : 'instrument'} service door`,
          handed: section === 4 ? 'right' : 'left',
        }),
      );
      part.object.position.set(0, centre, 0.002);
      bay.add(part.object);
      keep.add(part.object);
      const interior = new Group();
      interior.name = `${part.object.name} wiring`;
      interior.visible = false;
      interior.raycast = () => (interior.visible ? undefined : false);
      bay.add(interior);
      keep.add(interior);
      doors.push({ section, low: bottom, high: top, part, interior });
      const duct = createCabinetDuct(kit, height - 0.09);
      duct.position.set(-width / 2 + 0.06, centre, -0.105);
      interior.add(duct);
      // Supported tails terminate on the back of each genuine mounting plate;
      // opaque plates remain, rather than revealing duplicated PCB fronts.
      for (const bucket of props.buckets.filter(
        (b) =>
          b.section === section && b.centre > bottom && b.centre < top + 0.15,
      )) {
        const y = bucket.centre;
        const terminalX = -0.035;
        const terminal = cover(
          interior,
          0.065,
          0.026,
          0.018,
          terminalX,
          y,
          -0.12,
          dark,
        );
        terminal.name = `${bucket.id} mounting-plate rear connector`;
        const tag = createMicroLabel(kit, bucket.id.toUpperCase(), {
          height: 0.004,
          ink: '#202a28',
          maxWidth: 0.14,
        });
        tag.position.set(terminalX, y + 0.025, -0.11);
        interior.add(tag);
        const points = [
          new Vector3(-width / 2 + 0.085, y - 0.035, -0.072),
          new Vector3(-width / 2 + 0.13, y - 0.035, -0.083),
          new Vector3(terminalX, y, -0.107),
        ];
        const loom = new Mesh(
          new TubeGeometry(new CatmullRomCurve3(points), 8, 0.004, 5, false),
          cabinetRearPaint(kit, '#3c4945'),
        );
        loom.name = `${bucket.id} supported control loom`;
        interior.add(loom);
        routes.push({
          id: bucket.id,
          purpose:
            section === 5
              ? 'automation / field I/O mounting-plate feed'
              : 'instrument mounting-plate control feed',
          section,
          points: points.map((p) => p.toArray()),
        });
        for (const point of points.slice(0, 2))
          cover(
            interior,
            0.012,
            0.014,
            0.012,
            point.x,
            point.y,
            point.z - 0.004,
          );
      }
      const labels = new Set<Object3D>();
      interior.traverse((object) => {
        if (object instanceof Mesh && object.raycast !== Mesh.prototype.raycast)
          labels.add(object);
      });
      mergeStatic(interior, Infinity, labels);
    }
  });
  group.traverse((object) => {
    if (object instanceof Mesh && object.raycast !== Mesh.prototype.raycast)
      keep.add(object);
  });
  mergeStatic(group, Infinity, keep);
  return {
    group,
    dataPort,
    doors,
    routes,
    /** A bucket is rendered for either genuine access, including door motion. */
    access(section: number, centre: number) {
      return doors.some(
        (door) =>
          door.section === section &&
          centre >= door.low - 0.15 &&
          centre <= door.high + 0.15 &&
          door.part.visibleInside,
      );
    },
    update() {
      for (const door of doors) door.interior.visible = door.part.visibleInside;
    },
  };
}
