import { pcbMaterials } from './pcb-textures';
import type { PcbTexture } from './pcb-textures';
import { BoxGeometry, Group, Mesh, CylinderGeometry } from 'three';
import type { Material } from 'three';
import type { MachineComponentKind } from '../game/machine-components';
import { BETAFORM_BOARD, cardDesignation } from '../game/machine-components';
import { createMicroLabel, kitGlow, kitPaint } from './eighties-controls';
import type { PanelKit } from './eighties-controls';

/** True-size envelopes; sources and dimensional derivations in doc/research/machine-components.md. */
export const MACHINE_ENVELOPES = {
  breaker: [0.105, 0.161, 0.086],
  relay: [0.029, 0.025, 0.0124],
  terminal: [0.0062, 0.0425, 0.047],
  plc: [0.03175, 0.254, 0.178],
  'drive-power': [0.094, 0.034, 0.0305],
} as const;

/** Device face at +z; only the service lever/screw takes a use action. */
export function createMachineDeviceView(
  kit: PanelKit,
  kind: MachineComponentKind,
  label: string,
) {
  const envelope = kind.startsWith('plc-')
    ? MACHINE_ENVELOPES.plc
    : MACHINE_ENVELOPES[kind as keyof typeof MACHINE_ENVELOPES];
  const [slotWidth, height, depth] = envelope;
  const width = kind === 'plc-cpu' ? slotWidth * 2 : slotWidth;
  const group = new Group();
  const body = new Group();
  body.name = kind.startsWith('plc-') ? 'Withdrawable card' : 'Device body';
  group.add(body);
  const plastic = kitPaint(kit, kind === 'terminal' ? '#b7b6a8' : '#41464a');
  const dark = kitPaint(kit, '#1b1d1e');
  const metal = kitPaint(kit, '#a5aaa9', 0.6);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: Material = plastic,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  };
  if (kind.startsWith('plc-')) {
    // The withdrawn module exposes its card, not a solid plastic brick.
    box(width, height, 0.024, 0, 0, depth - 0.012);
    const pcb = new Mesh(
      new BoxGeometry(0.0016, height * 0.88, depth - 0.024),
      pcbMaterials(kit, kind as PcbTexture, 'x'),
    );
    pcb.name = 'Textured green daughterboard';
    pcb.position.set(0, 0, (depth - 0.024) / 2);
    body.add(pcb);
    const gold = kitPaint(kit, '#bda85c', 0.6);
    for (const side of [-1, 1])
      for (let i = 0; i < 32; i++) {
        const finger = box(
          0.0002,
          0.0022,
          0.012,
          side * 0.0009,
          (i - 15.5) * 0.00508,
          0.007,
          gold,
        );
        finger.name = 'Gold card edge contact';
      }
    for (const y of [-0.06, 0, 0.06])
      for (const z of [0.045, 0.105]) {
        box(0.004, 0.024, 0.016, 0.003, y, z, dark);
        for (const side of [-1, 1])
          for (let i = 0; i < 6; i++)
            box(
              0.001,
              0.001,
              0.002,
              0.003,
              y - 0.009 + i * 0.0036,
              z + side * 0.009,
              metal,
            );
      }
  } else box(width, height, depth, 0, 0, depth / 2);
  const face = depth + 0.001;
  if (kind === 'breaker' || kind === 'drive-power') {
    const poles = 3;
    for (const sy of [-1, 1])
      for (let i = 0; i < poles; i++) {
        const x = ((i - (poles - 1) / 2) * width) / (poles + 1);
        box(
          (width / (poles + 1)) * 0.65,
          0.012,
          0.008,
          x,
          sy * (height / 2 - 0.008),
          face,
          metal,
        );
        box(
          0.001,
          0.006,
          0.001,
          x,
          sy * (height / 2 - 0.008),
          face + 0.005,
          dark,
        );
      }
  }

  const service = new Group();
  service.position.set(0, -height * 0.35, face);
  body.add(service);
  const handle = new Mesh(
    new BoxGeometry(
      Math.min(0.018, width * 0.7),
      kind === 'breaker' ? 0.028 : 0.008,
      0.006,
    ),
    dark,
  );
  handle.position.z = 0.003;
  service.add(handle);
  if (kind === 'terminal') {
    for (const y of [-0.012, 0.012]) {
      const screw = new Mesh(
        new CylinderGeometry(0.002, 0.002, 0.002, 12),
        metal,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, y, face);
      service.add(screw);
    }
    service.position.y = 0;
  } else {
    const mark = createMicroLabel(
      kit,
      kind.startsWith('plc-')
        ? `${cardDesignation(kind)!.face}\n${BETAFORM_BOARD.family}`
        : label,
      {
        height:
          kind === 'relay' ? 0.0012 : kind.startsWith('plc-') ? 0.0016 : 0.0025,
        maxWidth: width * 0.8,
        ink: '#e8e5d9',
      },
    );
    mark.position.set(0, height * 0.25, face);
    if (kind.startsWith('plc-')) {
      const maker = createMicroLabel(kit, BETAFORM_BOARD.maker, {
        height: 0.0013,
        maxWidth: width * 0.8,
        ink: '#e1d8ba',
      });
      maker.position.set(0, height * 0.37, face);
      body.add(maker);
      const role = createMicroLabel(kit, kind.slice(4).toUpperCase(), {
        height: 0.0013,
        maxWidth: width * 0.8,
        ink: '#b7bfba',
      });
      role.position.set(0, height * 0.2, face);
      body.add(role);
      const boardMark = createMicroLabel(
        kit,
        `${BETAFORM_BOARD.maker}\n${cardDesignation(kind)!.face}\n${BETAFORM_BOARD.family}`,
        { height: 0.002, maxWidth: depth * 0.7, ink: '#e4e8ca' },
      );
      boardMark.rotation.y = Math.PI / 2;
      boardMark.position.set(0.0055, height * 0.33, depth * 0.45);
      body.add(boardMark);
    }
    body.add(mark);
  }
  const green = kitGlow(kit, '#43b66b');
  const red = kitGlow(kit, '#e34331');
  const status = box(
    Math.min(0.008, width * 0.4),
    0.004,
    0.002,
    0,
    height * 0.12,
    face + 0.001,
    dark,
  );
  status.visible = kind.startsWith('plc-') || kind === 'relay';
  const channels = Array.from({ length: 16 }, (_, i) =>
    box(0.004, 0.003, 0.002, 0, height * 0.02 - i * 0.007, face + 0.001, dark),
  );
  if (kind !== 'plc-input' && kind !== 'plc-output')
    for (const channel of channels) channel.visible = false;
  if (kind === 'plc-input' || kind === 'plc-output' || kind === 'plc-analog') {
    // The field wiring arm is distinct from the module's card ejector.
    box(
      width * 0.65,
      height * 0.42,
      0.009,
      0,
      -height * 0.22,
      face + 0.004,
      dark,
    );
    for (let i = 0; i < 18; i++)
      box(
        0.003,
        0.002,
        0.001,
        width * 0.18,
        -height * 0.03 - i * 0.005,
        face + 0.009,
        metal,
      );
  }
  if (kind === 'plc-cpu' || kind === 'plc-comms') {
    for (const y of [-height * 0.05, -height * 0.22]) {
      box(
        Math.min(width * 0.75, 0.026),
        0.012,
        0.004,
        0,
        y,
        face + 0.002,
        metal,
      );
      box(Math.min(width * 0.6, 0.021), 0.007, 0.002, 0, y, face + 0.005, dark);
    }
  }
  if (kind === 'drive-power') {
    box(width, height, 0.003, 0, 0, 0.0015, metal);
    for (const x of [-0.035, 0, 0.035]) {
      const terminal = new Mesh(
        new CylinderGeometry(0.003, 0.003, 0.003, 12),
        metal,
      );
      terminal.rotation.x = Math.PI / 2;
      terminal.position.set(x, 0, face + 0.002);
      body.add(terminal);
    }
  }
  return {
    group,
    service,
    set(
      on: boolean,
      failed: boolean,
      inserted: boolean,
      bits: readonly boolean[] = [],
      dt = 1,
      detached = false,
    ) {
      status.material = failed ? red : on ? green : dark;
      service.rotation.x =
        kind === 'breaker'
          ? failed
            ? 0
            : on
              ? -0.4
              : 0.4
          : inserted
            ? 0
            : -0.4;
      // Pulling an electronics module releases it from its backplane.
      const target =
        kind.startsWith('plc-') && !inserted && !detached ? depth + 0.04 : 0;
      if (detached) body.position.z = 0;
      body.position.z += (target - body.position.z) * Math.min(1, dt * 6);
      channels.forEach((channel, i) => {
        channel.material = on && bits[i] ? green : dark;
      });
    },
  };
}
