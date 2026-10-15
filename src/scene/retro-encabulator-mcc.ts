import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from './eighties-controls';
import { createMicroLabel, kitPaint } from './eighties-controls';
import {
  createNameplate,
  createPilotLamp,
  createPushButton,
  createLeverSelector,
} from './industrial-controls';
import {
  createContactorView,
  createFuseHolderView,
  createOverloadRelayView,
} from './industrial-devices';
import { createPanelMeter } from './panel-instruments';
import { createRackUnit } from './rack-equipment';

/** CENTERLINE 2100 envelope: 90 in high, 20 in standard width, 20 in deep. */
export const MCC_HEIGHT = 2.286;
export const MCC_DEPTH = 0.508;
const WIREWAY = 0.1524;
const SPACE = (MCC_HEIGHT - 2 * WIREWAY) / 12;
export const BAY_WIDTHS = [0.635, 0.508, 0.508, 0.508, 0.762, 0.635, 0.508];
export const MCC_WIDTH = BAY_WIDTHS.reduce((sum, width) => sum + width, 0);

type Bucket = {
  spaces: number;
  label: string;
  kind: 'main' | 'starter' | 'small' | 'control' | 'plc' | 'drive' | 'aux';
};
const BAYS: Bucket[][] = [
  [
    { spaces: 2, label: 'MAIN INCOMING\n480 VAC 3 PH', kind: 'main' },
    { spaces: 5, label: 'MAIN DISCONNECT\n800 A', kind: 'main' },
    { spaces: 5, label: 'DISTRIBUTION\nBUS ENERGIZED', kind: 'main' },
  ],
  [
    { spaces: 4, label: 'MAIN DRIVE MOTOR\nM-101', kind: 'starter' },
    { spaces: 4, label: 'FEED MOTOR\nM-102', kind: 'starter' },
    { spaces: 4, label: 'AUXILIARY MOTOR\nM-103', kind: 'starter' },
  ],
  [
    'LUBE OIL PUMP',
    'COOLING FAN',
    'HYDRAULIC PUMP',
    'AUXILIARY DRIVE',
    'VENTILATION FAN',
    'TRANSFER PUMP',
  ].map((label, i) => ({
    spaces: 2,
    label: `${label}\nM-${201 + i}`,
    kind: 'small' as const,
  })),
  [
    { spaces: 3, label: 'ENCABULATOR\nCONTROL', kind: 'control' },
    { spaces: 3, label: 'MODIAL\nINTERACTION', kind: 'control' },
    { spaces: 3, label: 'PHASE\nREFERENCE', kind: 'control' },
    { spaces: 3, label: 'PANENDERMIC\nMONITOR', kind: 'control' },
  ],
  [
    { spaces: 8, label: 'PLC-5 / 1771\nAUTOMATION CONTROL', kind: 'plc' },
    { spaces: 4, label: 'FIELD TERMINATIONS\n24 VDC I/O', kind: 'plc' },
  ],
  [
    { spaces: 8, label: 'MAIN ENCABULATOR\nDRIVE VFD-601', kind: 'drive' },
    { spaces: 4, label: 'DRIVE ISOLATOR\n480 VAC', kind: 'drive' },
  ],
  [
    { spaces: 3, label: 'RECIPROCATING\nDINGLE ARM', kind: 'aux' },
    { spaces: 3, label: 'HYDROCOPTIC\nPUMP', kind: 'aux' },
    { spaces: 3, label: 'PANENDERMIC\nFAN', kind: 'aux' },
    { spaces: 3, label: 'CARDINAL\nGRAMMETER', kind: 'aux' },
  ],
];

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
  parent.add(mesh);
  return mesh;
};
const rod = (
  parent: Object3D,
  material: Material,
  radius: number,
  length: number,
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, length, 8),
    material,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
};

export interface MccView {
  group: Group;
  doors: Map<Object3D, () => void>;
  update(delta: number): void;
  openAll(open: boolean): void;
}

/** Seven adjoining MCC structures. Front faces +z; dimensions are metres. */
export function createRetroEncabulatorMcc(kit: PanelKit): MccView {
  const group = new Group();
  group.name = 'Allen-Bradley CENTERLINE-style Retro Encabulator MCC';
  const doors = new Map<Object3D, () => void>();
  const hinges: { group: Group; target: number }[] = [];
  const paint = kitPaint(kit, '#b6b7ae', 0.1);
  const trim = kitPaint(kit, '#8d928e', 0.25);
  const liner = kitPaint(kit, '#d0d0c7');
  const dark = kitPaint(kit, '#242529');
  const copper = kitPaint(kit, '#a87644', 0.68);
  const brass = kitPaint(kit, '#ad8c50', 0.6);
  const wire = kitPaint(kit, '#32363a');
  const total = MCC_WIDTH;
  // Continuous structure and three-phase bus behind removable units.
  box(group, liner, total, MCC_HEIGHT, 0.012, 0, MCC_HEIGHT / 2, -MCC_DEPTH);
  for (const y of [0.025, MCC_HEIGHT - 0.025])
    box(group, trim, total, 0.05, MCC_DEPTH, 0, y, -MCC_DEPTH / 2);
  for (let phase = 0; phase < 3; phase++) {
    const y = MCC_HEIGHT - 0.24 - phase * 0.042;
    box(group, copper, total - 0.05, 0.018, 0.012, 0, y, -0.43);
  }
  box(group, copper, total - 0.05, 0.012, 0.015, 0, 0.09, -0.44);

  let left = -total / 2;
  BAY_WIDTHS.forEach((width, bayIndex) => {
    const bay = new Group();
    bay.position.x = left + width / 2;
    group.add(bay);
    left += width;
    const channel = 0.105;
    const faceW = width - channel - 0.02;
    const faceX = -channel / 2;
    // Folded steel sides, partition, wireway covers and joining flanges.
    for (const side of [-1, 1])
      box(
        bay,
        paint,
        0.012,
        MCC_HEIGHT,
        MCC_DEPTH,
        side * (width / 2 - 0.006),
        MCC_HEIGHT / 2,
        -MCC_DEPTH / 2,
      );
    box(
      bay,
      liner,
      0.012,
      MCC_HEIGHT - 2 * WIREWAY,
      MCC_DEPTH - 0.03,
      width / 2 - channel,
      MCC_HEIGHT / 2,
      -MCC_DEPTH / 2,
    );
    for (const y of [WIREWAY / 2, MCC_HEIGHT - WIREWAY / 2]) {
      box(bay, paint, width - 0.025, WIREWAY - 0.01, 0.012, 0, y, 0);
      for (const x of [-width / 2 + 0.035, width / 2 - 0.035])
        rod(bay, dark, 0.004, 0.006, x, y, 0.01);
    }
    const wireway = box(
      bay,
      paint,
      channel - 0.012,
      MCC_HEIGHT - 2 * WIREWAY - 0.01,
      0.012,
      width / 2 - channel / 2 - 0.006,
      MCC_HEIGHT / 2,
      0,
    );
    wireway.name = `Section ${bayIndex + 1} vertical wireway`;
    for (let phase = 0; phase < 3; phase++)
      box(
        bay,
        copper,
        0.012,
        MCC_HEIGHT - 2 * WIREWAY - 0.07,
        0.012,
        -width / 2 + 0.04 + phase * 0.025,
        MCC_HEIGHT / 2,
        -0.4,
      );
    if (bayIndex === 0) {
      const brand = createMicroLabel(kit, 'ALLEN-BRADLEY\nCENTERLINE', {
        height: 0.009,
        ink: '#a52a22',
        plate: '#b6b7ae',
      });
      brand.position.set(-0.04, MCC_HEIGHT - 0.075, 0.008);
      bay.add(brand);
    }
    let top = MCC_HEIGHT - WIREWAY;
    for (const [bucketIndex, spec] of BAYS[bayIndex].entries()) {
      const h = spec.spaces * SPACE;
      const cy = top - h / 2;
      top -= h;
      // Unit pan, enclosed back and wired interior, all visible when opened.
      box(
        bay,
        trim,
        faceW + 0.004,
        0.008,
        MCC_DEPTH - 0.06,
        faceX,
        cy - h / 2,
        -MCC_DEPTH / 2,
      );
      box(bay, liner, faceW - 0.018, h - 0.02, 0.006, faceX, cy, -0.375);
      populateInterior(kit, bay, spec, faceX, cy, h, faceW, {
        liner,
        dark,
        brass,
        copper,
        wire,
      });
      const hinge = new Group();
      hinge.position.set(faceX - faceW / 2, cy, 0.009);
      bay.add(hinge);
      const leaf = box(
        hinge,
        paint,
        faceW - 0.006,
        h - 0.006,
        0.012,
        faceW / 2,
        0,
        0,
      );
      leaf.name = `Section ${bayIndex + 1} ${spec.label.replace('\n', ' ')} door`;
      for (const y of [-h / 2 + 0.035, h / 2 - 0.035]) {
        box(hinge, trim, 0.012, 0.025, 0.018, 0, y, -0.004);
        rod(hinge, dark, 0.007, 0.009, faceW - 0.035, y, 0.012);
      }
      const plate = createNameplate(kit, spec.label, {
        width: Math.min(0.205, faceW * 0.57),
        height: h < 0.35 ? 0.035 : 0.046,
      });
      plate.position.set(faceW * 0.43, h / 2 - 0.052, 0.009);
      hinge.add(plate);
      dressDoor(kit, hinge, spec, faceW, h);
      const state = { group: hinge, target: 0 };
      hinges.push(state);
      doors.set(hinge, () => {
        state.target = state.target ? 0 : -1.75;
      });
      // Numbered section and bucket tags remain legible at close range.
      const tag = createMicroLabel(
        kit,
        `${bayIndex + 1}${String.fromCharCode(65 + bucketIndex)}`,
        { height: 0.005, ink: '#242529', plate: '#d0d0c7' },
      );
      tag.position.set(faceX - faceW / 2 + 0.035, cy + h / 2 - 0.025, 0.018);
      bay.add(tag);
    }
  });
  return {
    group,
    doors,
    update(delta) {
      for (const hinge of hinges)
        hinge.group.rotation.y +=
          (hinge.target - hinge.group.rotation.y) * Math.min(1, delta * 8);
    },
    openAll(open) {
      for (const hinge of hinges) hinge.target = open ? -1.75 : 0;
    },
  };
}

function dressDoor(
  kit: PanelKit,
  hinge: Group,
  spec: Bucket,
  width: number,
  height: number,
) {
  const center = width / 2;
  const put = (part: Object3D, x: number, y: number, scale = 1) => {
    part.position.set(x, y, 0.012);
    part.scale.setScalar(scale);
    hinge.add(part);
  };
  if (
    spec.kind === 'main' ||
    spec.kind === 'starter' ||
    spec.kind === 'small' ||
    spec.kind === 'drive' ||
    spec.kind === 'aux'
  ) {
    // Flange-mounted disconnect handle over the bucket breaker.
    const black = kitPaint(kit, '#242529');
    box(hinge, black, 0.075, 0.13, 0.012, center + width * 0.28, 0.01, 0.015);
    box(hinge, black, 0.018, 0.082, 0.028, center + width * 0.28, 0.01, 0.035);
    const legend = createMicroLabel(kit, 'ON\nOFF', {
      height: 0.005,
      ink: '#ece9e1',
    });
    legend.position.set(center + width * 0.16, 0.01, 0.025);
    hinge.add(legend);
  }
  if (height > 0.3) {
    put(
      createPushButton(kit, 'green').group,
      center - width * 0.18,
      -height * 0.17,
    );
    put(
      createPushButton(kit, 'red').group,
      center + width * 0.03,
      -height * 0.17,
    );
    put(
      createPilotLamp(kit, 'green').group,
      center - width * 0.18,
      -height * 0.31,
    );
    put(
      createPilotLamp(kit, 'red').group,
      center + width * 0.03,
      -height * 0.31,
    );
    for (const [text, x, y] of [
      ['START', center - width * 0.18, -height * 0.105],
      ['STOP', center + width * 0.03, -height * 0.105],
      ['RUN', center - width * 0.18, -height * 0.38],
      ['FAULT', center + width * 0.03, -height * 0.38],
    ] as const) {
      const legend = createMicroLabel(kit, text, {
        height: 0.004,
        ink: '#232526',
      });
      legend.position.set(x, y, 0.015);
      hinge.add(legend);
    }
  } else {
    put(
      createPilotLamp(kit, 'green').group,
      center - width * 0.2,
      -height * 0.25,
      0.8,
    );
    put(
      createPilotLamp(kit, 'red').group,
      center + width * 0.05,
      -height * 0.25,
      0.8,
    );
  }
  if (spec.kind === 'control' || spec.kind === 'main') {
    const meter = createPanelMeter(kit, spec.kind === 'main' ? 'V AC' : 'REF', {
      width: 0.075,
    });
    meter.set(spec.kind === 'main' ? 0.7 : 0.42);
    put(meter.group, center - width * 0.18, height * 0.08);
    if (height > 0.4) {
      const meter2 = createPanelMeter(kit, 'A AC', { width: 0.075 });
      meter2.set(0.38);
      put(meter2.group, center + width * 0.08, height * 0.08);
    }
  }
  if (spec.kind === 'plc' || spec.kind === 'control' || spec.kind === 'drive')
    put(
      createLeverSelector(kit, 3).group,
      center + width * 0.24,
      -height * 0.18,
    );
}

function populateInterior(
  kit: PanelKit,
  bay: Group,
  spec: Bucket,
  x: number,
  y: number,
  h: number,
  w: number,
  mat: {
    liner: Material;
    dark: Material;
    brass: Material;
    copper: Material;
    wire: Material;
  },
) {
  const mount = (
    part: Object3D,
    px: number,
    py: number,
    pz = -0.27,
    scale = 1,
  ) => {
    part.position.set(x + px, y + py, pz);
    part.scale.setScalar(scale);
    bay.add(part);
  };
  if (spec.kind === 'plc' && h > 0.8) {
    // A vertical 1771 I/O chassis above the reused rack-unit equipment.
    box(bay, mat.dark, w - 0.055, 0.34, 0.026, x, y + 0.27, -0.32);
    const modules = ['P/S', 'CPU', 'DI', 'DI', 'DO', 'DO', 'AI', 'COM'];
    const moduleW = (w - 0.085) / modules.length;
    modules.forEach((name, i) => {
      const px = x - ((modules.length - 1) * moduleW) / 2 + i * moduleW;
      box(bay, mat.liner, moduleW - 0.004, 0.295, 0.055, px, y + 0.27, -0.27);
      box(bay, mat.dark, moduleW - 0.011, 0.025, 0.004, px, y + 0.38, -0.24);
      const label = createMicroLabel(kit, name, {
        height: 0.0037,
        ink: '#222426',
      });
      label.position.set(px, y + 0.19, -0.239);
      bay.add(label);
      box(bay, mat.brass, 0.007, 0.006, 0.004, px, y + 0.3, -0.238);
    });
    const rack = new Group();
    rack.position.set(x, y - h / 2 + 0.11, -0.18);
    rack.scale.setScalar(Math.min(1, (w - 0.035) / 0.4826));
    bay.add(rack);
    let at = 0;
    for (const [label, style, u] of [
      ['1771-P4 POWER', 'vented', 2],
      ['PLC-5/40 CPU', 'display', 3],
      ['1771-IBD INPUT', 'controls', 2],
      ['1771-OBD OUTPUT', 'controls', 2],
      ['1771-IFE ANALOG', 'handles', 2],
      ['1771-KE COMM', 'handles', 2],
    ] as const) {
      const unit = createRackUnit(kit, {
        u,
        style,
        label,
        colour: 'putty',
        depth: 0.18,
      });
      unit.group.position.y = at;
      rack.add(unit.group);
      at += u * 0.04445;
    }
  } else if (spec.kind === 'drive' && h > 0.6) {
    const unit = createRackUnit(kit, {
      u: 5,
      style: 'vented',
      label: 'POWER ELECTRONICS',
      colour: 'grey',
      depth: 0.25,
    });
    unit.group.scale.setScalar(Math.min(1, (w - 0.04) / 0.4826));
    unit.group.position.set(x, y - 0.25, -0.13);
    bay.add(unit.group);
    for (const dx of [-0.11, 0, 0.11])
      box(bay, mat.dark, 0.055, 0.17, 0.075, x + dx, y + 0.16, -0.28);
  } else if (spec.kind !== 'control') {
    // Molded-case breaker on the bucket backplate, operated by the
    // door-mounted disconnect handle.
    box(
      bay,
      mat.dark,
      Math.min(0.12, w * 0.28),
      Math.min(0.18, h * 0.42),
      0.075,
      x + w * 0.19,
      y + h * 0.11,
      -0.31,
    );
    box(
      bay,
      mat.liner,
      0.022,
      0.045,
      0.018,
      x + w * 0.19,
      y + h * 0.11,
      -0.262,
    );
    const contactor = createContactorView(kit);
    mount(contactor.group, -w * 0.2, -h * 0.16, -0.24, 1.25);
    const overload = createOverloadRelayView(kit);
    mount(overload.group, w * 0.11, -h * 0.2, -0.24, 1.05);
    if (h > 0.45)
      mount(createFuseHolderView(kit).group, -w * 0.22, h * 0.2, -0.24);
  } else {
    // Control relay and terminal strip, with numbered markers.
    for (const dx of [-0.11, 0, 0.11])
      box(bay, mat.dark, 0.045, 0.085, 0.038, x + dx, y + 0.05, -0.31);
  }
  // DIN rail, control wiring duct and terminal strip along each bucket floor.
  box(bay, mat.brass, w - 0.055, 0.008, 0.018, x, y - h / 2 + 0.045, -0.3);
  box(bay, mat.wire, w - 0.05, 0.025, 0.03, x, y - h / 2 + 0.026, -0.26);
  for (let i = 0; i < Math.max(3, Math.floor(w / 0.045)); i++) {
    const px = x - w / 2 + 0.045 + i * 0.04;
    box(bay, mat.liner, 0.027, 0.02, 0.025, px, y - h / 2 + 0.068, -0.27);
    rod(bay, mat.copper, 0.0025, 0.004, px, y - h / 2 + 0.07, -0.25);
  }
}
