import { computed } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import type { Readable } from '../game/world/components';
import { createBarGraph, createSevenSegment } from '../scene/eighties-controls';
import type { PanelKit } from '../scene/eighties-controls';
import {
  createLegendPlate,
  createNameplate,
} from '../scene/industrial-controls';
import type { OperatorColour } from '../scene/industrial-controls';
import {
  capacitorBoard,
  contactor,
  createPartSet,
  fuse,
  motor,
  motorControlUnit,
  overloadRelay,
  pilotLight,
  potentiometer,
  pushButton,
  selector,
} from './parts';
import type { Part, PartSet } from './parts';
import type { TestFitting } from './test-boards';
import { createPs1Material } from './ps1-material';

/** How tall a pedestal stands, and the size of its top, metres. */
export const PEDESTAL_HEIGHT = 0.95;
export const PEDESTAL_WIDTH = 0.7;

/**
 * The pedestals: each of the working parts of a motor control unit on a
 * plinth of its own, facing +z, with a sloping test panel on its front
 * whose controls put it through what it does and a nameplate saying what
 * it is. The device and its test controls are all parts: each makes its
 * own sounds.
 */
export function createPedestals(kit: PanelKit) {
  const fittings: TestFitting[] = [];
  const grey = createPs1Material({ color: '#5d625f' });
  const top = createPs1Material({ color: '#3a3d3c' });
  const panelPaint = createPs1Material({ color: '#c4c6bf' });
  kit.materials.push(grey, top, panelPaint);

  /** A plinth, its test panel and its nameplate; the device goes on top. */
  const pedestal = (title: string) => {
    const group = new Group();
    const column = new Mesh(
      new BoxGeometry(PEDESTAL_WIDTH, PEDESTAL_HEIGHT, PEDESTAL_WIDTH),
      grey,
    );
    column.position.y = PEDESTAL_HEIGHT / 2;
    group.add(column);
    const slab = new Mesh(
      new BoxGeometry(PEDESTAL_WIDTH + 0.04, 0.03, PEDESTAL_WIDTH + 0.04),
      top,
    );
    slab.position.y = PEDESTAL_HEIGHT + 0.015;
    group.add(slab);
    // The test panel, sloping back at 35°, on the plinth's front.
    const panel = new Group();
    panel.position.set(0, PEDESTAL_HEIGHT - 0.2, PEDESTAL_WIDTH / 2 + 0.07);
    panel.rotation.x = -0.6;
    group.add(panel);
    const face = new Mesh(
      new BoxGeometry(PEDESTAL_WIDTH - 0.04, 0.26, 0.012),
      panelPaint,
    );
    face.position.z = -0.006;
    panel.add(face);
    const plate = createNameplate(kit, title, { width: 0.36, height: 0.06 });
    plate.position.set(0, PEDESTAL_HEIGHT * 0.45, PEDESTAL_WIDTH / 2);
    group.add(plate);
    const deck = new Group();
    deck.position.y = PEDESTAL_HEIGHT + 0.03;
    group.add(deck);
    const parts = createPartSet();
    return {
      group,
      panel,
      deck,
      parts,
      /** A test control on the panel, at 1.8 times life size. */
      control<P extends Part>(part: P, x: number, y: number): P {
        part.object.scale.setScalar(1.8);
        part.object.position.set(x, y, 0);
        panel.add(part.object);
        return parts.add(part);
      },
      /** The device itself, on the deck. */
      device<P extends Part>(part: P): P {
        deck.add(part.object);
        return parts.add(part);
      },
      /** A readout on the panel that is not a control. */
      show(view: Object3D, x: number, y: number, legend?: string) {
        view.scale.setScalar(1.5);
        view.position.set(x, y, 0);
        panel.add(view);
        if (!legend) return;
        const plate = createLegendPlate(kit, legend, {
          width: 0.04,
          height: 0.012,
        });
        plate.scale.setScalar(1.5);
        plate.position.set(x, y + 0.05, 0);
        panel.add(plate);
      },
    };
  };

  const finish = (
    p: { group: Group; parts: PartSet },
    extra?: (delta: number) => void,
  ) => {
    fittings.push({
      group: p.group,
      parts: p.parts,
      update(_seconds, delta) {
        p.parts.update(delta);
        extra?.(delta);
      },
      dispose: () => p.parts.dispose(),
    });
  };
  const lever = (legend: string) =>
    selector(kit, { positions: 2, legend, name: `${legend} selector` });
  const button = (legend: string, colour: OperatorColour, action: () => void) =>
    pushButton(kit, { colour, legend, action, name: `${legend} push button` });
  const lamp = (
    legend: string,
    colour: OperatorColour,
    drive: Readable<boolean>,
  ) =>
    pilotLight(kit, { colour, legend, drive, name: `${legend} pilot light` });

  // ---- The motor control unit: door, handle and breaker -------------------
  {
    const p = pedestal('MOTOR CONTROL UNIT\nBREAKER AND DOOR');
    const padlock = p.control(
      selector(kit, {
        positions: 2,
        key: true,
        legend: 'PADLOCK',
        name: 'PADLOCK key selector',
      }),
      -0.15,
      -0.04,
    );
    const unit = p.device(
      motorControlUnit(kit, {
        latch: computed(() => padlock.position.value === 1),
      }),
    );
    unit.object.position.set(0, 0.18, 0.15);
    p.control(
      button('FAULT', 'red', () => unit.trip()),
      0.15,
      -0.04,
    );
    finish(p);
  }

  // ---- The contactor -----------------------------------------------------
  {
    const p = pedestal('CONTACTOR\n3 POLE, 120 V COIL');
    const coil = p.control(lever('COIL'), -0.2, -0.04);
    const device = p.device(
      contactor(kit, { coil: computed(() => coil.position.value === 1) }),
    );
    device.object.scale.setScalar(5);
    device.object.position.set(0, 0.2, -0.1);
    p.control(
      button('WELD', 'black', () => device.component.weld()),
      -0.05,
      -0.04,
    );
    p.control(
      button('REPAIR', 'blue', () => device.component.repair()),
      0.08,
      -0.04,
    );
    p.control(lamp('CLOSED', 'red', device.component.closed), 0.21, -0.04);
    finish(p);
  }

  // ---- The overload relay ------------------------------------------------
  {
    const p = pedestal('THERMAL OVERLOAD RELAY\nCLASS 10, 1-5 A');
    const amps = p.control(
      potentiometer(kit, {
        legend: 'MOTOR AMPS',
        steps: 24,
        name: 'MOTOR AMPS potentiometer',
      }),
      -0.2,
      -0.04,
    );
    const relay = p.device(
      overloadRelay(kit, { current: computed(() => amps.position.value) }),
    );
    relay.object.scale.setScalar(5);
    relay.object.position.set(0, 0.125, -0.1);
    p.control(lamp('TRIPPED', 'amber', relay.component.tripped), 0.2, -0.04);
    const heat = createBarGraph(kit, 10);
    p.show(heat.group, 0.01, -0.03, 'HEAT');
    finish(p, () => heat.set(relay.component.heat.value / 1.44));
  }

  // ---- The control fuse --------------------------------------------------
  {
    const p = pedestal('CONTROL FUSE\nCLASS CC, 2 A');
    const amps = p.control(
      potentiometer(kit, {
        legend: 'AMPS',
        steps: 12,
        name: 'FUSE AMPS potentiometer',
      }),
      -0.15,
      -0.04,
    );
    const device = p.device(
      fuse(kit, {
        current: computed(() => amps.position.value * 0.5),
        rating: 2,
      }),
    );
    device.object.scale.setScalar(4);
    device.object.position.set(0, 0.1, -0.05);
    device.object.rotation.x = -0.5;
    p.control(lamp('BLOWN', 'red', device.component.blown), 0.15, -0.04);
    finish(p);
  }

  // ---- The drive's bus capacitors ----------------------------------------
  {
    const p = pedestal('DRIVE POWER BOARD\nDC BUS CAPACITORS');
    const bus = p.control(
      potentiometer(kit, {
        legend: 'BUS VOLTS',
        steps: 20,
        name: 'BUS VOLTS potentiometer',
      }),
      -0.17,
      -0.04,
    );
    // Two capacitors in series share the bus voltage.
    const board = p.device(
      capacitorBoard(kit, {
        voltage: computed(() => (bus.position.value * 50) / 2),
        rated: 400,
      }),
    );
    board.object.scale.setScalar(2.8);
    board.object.position.set(0, 0.03, 0);
    const meter = createSevenSegment(kit, 4, { digitHeight: 0.012 });
    p.show(meter.group, 0.14, -0.04, 'BUS V');
    finish(p, () => meter.show(String(bus.position.value * 50)));
  }

  // ---- The motor ---------------------------------------------------------
  {
    const p = pedestal('INDUCTION MOTOR\n2 HP, 1750 RPM, TEFC');
    const run = p.control(lever('RUN'), -0.15, -0.04);
    const speed = p.control(
      potentiometer(kit, {
        legend: 'SPEED',
        steps: 18,
        name: 'MOTOR SPEED potentiometer',
      }),
      0.15,
      -0.04,
    );
    const device = p.device(
      motor(kit, {
        running: computed(() => run.position.value === 1),
        speed: computed(() => speed.position.value * 100 * 0.97),
      }),
    );
    device.object.scale.setScalar(1.5);
    finish(p);
  }

  return fittings;
}
