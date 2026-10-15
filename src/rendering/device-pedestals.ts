import { computed } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import {
  createCapacitor,
  createContactor,
  createFuse,
  createMomentary,
  createOperatingHandle,
  createOverloadRelay,
  createPilotLight,
  createSelector,
  createSwitch,
} from '../game/world/components';
import type { Readable } from '../game/world/components';
import { createBarGraph, createSevenSegment } from '../scene/eighties-controls';
import type { PanelKit } from '../scene/eighties-controls';
import {
  createLegendPlate,
  createLeverSelector,
  createNameplate,
  createPilotLamp,
  createPotentiometer,
  createPushButton,
} from '../scene/industrial-controls';
import type { OperatorColour } from '../scene/industrial-controls';
import {
  createCapacitorBoardView,
  createContactorView,
  createFuseHolderView,
  createMotorUnit,
  createMotorView,
  createOverloadRelayView,
} from '../scene/industrial-devices';
import { fittingParts } from './test-boards';
import type { TestFitting } from './test-boards';
import { createPs1Material } from './ps1-material';

/** How tall a pedestal stands, and the size of its top, metres. */
export const PEDESTAL_HEIGHT = 0.95;
export const PEDESTAL_WIDTH = 0.7;

/**
 * The pedestals: each of the working parts of a motor control unit on a
 * plinth of its own, facing +z, with a sloping test panel on its front
 * whose controls put it through what it does and a nameplate saying what
 * it is. The parts are components, the same as the boards' controls.
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
    return { group, panel, deck };
  };

  /** Test controls on a panel, at 1.5 times life size. */
  const controls = (panel: Group, parts: ReturnType<typeof fittingParts>) => {
    const { hub, uses, updates } = parts;
    const place = (view: Object3D, legend: string, x: number, y: number) => {
      view.scale.setScalar(1.8);
      view.position.set(x, y, 0);
      panel.add(view);
      const plate = createLegendPlate(kit, legend, {
        width: 0.06,
        height: 0.013,
      });
      plate.scale.setScalar(1.8);
      plate.position.set(x, y + 0.06, 0);
      panel.add(plate);
    };
    return {
      lever(legend: string, x: number, y: number, name: string) {
        const view = createLeverSelector(kit, 2);
        place(view.group, legend, x, y);
        const part = createSelector({ positions: 2 });
        view.group.name = name;
        hub.add(part, view.group, 'selector');
        uses.set(view.knob, (direction = 1) => part.turn(direction));
        updates.push((delta) => {
          view.set(part.position.value);
          view.update(delta);
        });
        return part;
      },
      key(legend: string, x: number, y: number, name: string) {
        const view = createLeverSelector(kit, 2, { key: true });
        place(view.group, legend, x, y);
        const part = createSwitch();
        view.group.name = name;
        hub.add(part, view.group, 'key-switch');
        uses.set(view.knob, () => part.flip());
        updates.push((delta) => {
          view.set(part.state.value ? 1 : 0);
          view.update(delta);
        });
        return part;
      },
      pot(
        legend: string,
        x: number,
        y: number,
        positions: number,
        name: string,
      ) {
        const view = createPotentiometer(kit);
        place(view.group, legend, x, y);
        const part = createSelector({ positions });
        view.group.name = name;
        hub.add(part, view.group, 'knob');
        uses.set(view.knob, (direction = 1) => part.turn(direction));
        updates.push((delta) => {
          view.set(part.share.value);
          view.update(delta);
        });
        return part;
      },
      button(
        legend: string,
        colour: OperatorColour,
        x: number,
        y: number,
        name: string,
        action: () => void,
      ) {
        const view = createPushButton(kit, colour);
        place(view.group, legend, x, y);
        const part = createMomentary({ action });
        view.group.name = name;
        hub.add(part, view.group, 'button', () => view.press());
        uses.set(view.cap, () => part.press());
        updates.push(view.update);
      },
      lamp(
        legend: string,
        colour: OperatorColour,
        x: number,
        y: number,
        name: string,
        drive: Readable<boolean>,
      ) {
        const view = createPilotLamp(kit, colour);
        place(view.group, legend, x, y);
        const part = createPilotLight({ drive });
        view.group.name = name;
        hub.add(part, view.group, 'button', () => view.press());
        uses.set(view.lens, () => part.press());
        updates.push((delta) => {
          part.step(delta);
          view.set(part.lit.value);
          view.update(delta);
        });
      },
      /** A readout on the panel that is not a control. */
      show(view: Object3D, x: number, y: number) {
        view.scale.setScalar(1.5);
        view.position.set(x, y, 0);
        panel.add(view);
      },
    };
  };

  const finish = (
    group: Group,
    parts: ReturnType<typeof fittingParts>,
    extra?: TestFitting['update'],
    dispose?: () => void,
  ) => {
    fittings.push({
      group,
      uses: parts.uses,
      onSound: parts.hub.onSound,
      onHeld: parts.hub.onHeld,
      update(seconds, delta, reducedMotion) {
        for (const step of parts.steps) step(delta);
        for (const update of parts.updates) update(delta);
        extra?.(seconds, delta, reducedMotion);
      },
      dispose() {
        parts.hub.dispose();
        dispose?.();
      },
    });
  };

  // ---- The motor control unit: door, handle and breaker -------------------
  {
    const p = pedestal('MOTOR CONTROL UNIT\nBREAKER AND DOOR');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const padlock = c.key('PADLOCK', -0.15, -0.04, 'PADLOCK key selector');
    const handle = createOperatingHandle({
      latch: padlock.state,
      sounds: { state: (s) => (s.on ? 'mains hum' : null) },
    });
    // The door is interlocked with the handle: it will not open while ON.
    const door = createSwitch({ latch: handle.on });
    c.button('FAULT', 'red', 0.15, -0.04, 'FAULT push button', () =>
      handle.trip(),
    );
    const unit = createMotorUnit(kit);
    unit.group.position.set(0, 0.18, 0.15);
    p.deck.add(unit.group);
    parts.hub.add(handle, unit.handle, 'handle');
    parts.hub.add(door, unit.door, 'door');
    parts.uses.set(unit.handle, () => handle.operate());
    parts.uses.set(unit.door, () => door.flip());
    parts.updates.push((delta) => {
      unit.setHandle(handle.position.value);
      unit.setDoor(door.state.value);
      unit.update(delta);
    });
    finish(p.group, parts);
  }

  // ---- The contactor -----------------------------------------------------
  {
    const p = pedestal('CONTACTOR\n3 POLE, 120 V COIL');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const coil = c.lever('COIL', -0.2, -0.04, 'COIL selector');
    const contactor = createContactor({
      coil: computed(() => coil.position.value === 1),
      sounds: { state: (s) => (s.on ? 'relay hold' : null) },
    });
    c.button('WELD', 'black', -0.05, -0.04, 'WELD push button', () =>
      contactor.weld(),
    );
    c.button('REPAIR', 'blue', 0.08, -0.04, 'REPAIR push button', () =>
      contactor.repair(),
    );
    c.lamp(
      'CLOSED',
      'red',
      0.21,
      -0.04,
      'CLOSED pilot light',
      contactor.closed,
    );
    const view = createContactorView(kit);
    view.group.scale.setScalar(5);
    view.group.position.set(0, 0.2, -0.1);
    p.deck.add(view.group);
    parts.hub.add(contactor, view.body, 'contactor');
    parts.updates.push((delta) => {
      view.set(contactor.closed.value);
      view.update(delta);
    });
    finish(p.group, parts);
  }

  // ---- The overload relay ------------------------------------------------
  {
    const p = pedestal('THERMAL OVERLOAD RELAY\nCLASS 10, 1-5 A');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const amps = c.pot(
      'MOTOR AMPS',
      -0.2,
      -0.04,
      25,
      'MOTOR AMPS potentiometer',
    );
    const relay = createOverloadRelay({
      current: computed(() => amps.position.value),
    });
    c.lamp(
      'TRIPPED',
      'amber',
      0.2,
      -0.04,
      'TRIPPED pilot light',
      relay.tripped,
    );
    const heat = createBarGraph(kit, 10);
    c.show(heat.group, 0.01, -0.03);
    const heatLegend = createLegendPlate(kit, 'HEAT', {
      width: 0.04,
      height: 0.012,
    });
    heatLegend.scale.setScalar(1.5);
    heatLegend.position.set(0.01, 0.02, 0);
    p.panel.add(heatLegend);
    const view = createOverloadRelayView(kit);
    view.group.scale.setScalar(5);
    view.group.position.set(0, 0.125, -0.1);
    p.deck.add(view.group);
    parts.hub.add(relay, view.group, 'overload');
    parts.hub.add(relay.dial, view.dial, 'knob');
    parts.uses.set(view.dial, (direction = 1) => relay.dial.turn(direction));
    parts.uses.set(view.reset, () => {
      view.pressReset();
      relay.reset();
    });
    parts.uses.set(view.test, () => {
      view.pressTest();
      relay.test();
    });
    parts.steps.push(relay.step);
    parts.updates.push((delta) => {
      view.set(relay.dial.share.value, relay.tripped.value);
      heat.set(relay.heat.value / 1.44);
      view.update(delta);
    });
    finish(p.group, parts);
  }

  // ---- The control fuse --------------------------------------------------
  {
    const p = pedestal('CONTROL FUSE\nCLASS CC, 2 A');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const amps = c.pot('AMPS', -0.15, -0.04, 13, 'FUSE AMPS potentiometer');
    const fuse = createFuse({
      current: computed(() => amps.position.value * 0.5),
      rating: 2,
    });
    c.lamp('BLOWN', 'red', 0.15, -0.04, 'BLOWN pilot light', fuse.blown);
    const view = createFuseHolderView(kit);
    view.group.scale.setScalar(4);
    view.group.position.set(0, 0.1, -0.05);
    view.group.rotation.x = -0.5;
    p.deck.add(view.group);
    parts.hub.add(fuse, view.cartridge, 'fuse');
    parts.uses.set(view.cartridge, () => fuse.replace());
    parts.steps.push(fuse.step);
    parts.updates.push((delta) => {
      view.set(fuse.blown.value);
      view.update(delta);
    });
    finish(p.group, parts);
  }

  // ---- The drive's bus capacitors ----------------------------------------
  {
    const p = pedestal('DRIVE POWER BOARD\nDC BUS CAPACITORS');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const bus = c.pot('BUS VOLTS', -0.17, -0.04, 21, 'BUS VOLTS potentiometer');
    // Two capacitors in series share the bus voltage.
    const across = computed(() => (bus.position.value * 50) / 2);
    const capacitors = [0, 1].map(() =>
      createCapacitor({ voltage: across, rated: 400 }),
    );
    const meter = createSevenSegment(kit, 4, { digitHeight: 0.012 });
    c.show(meter.group, 0.14, -0.04);
    const meterLegend = createLegendPlate(kit, 'BUS V', {
      width: 0.04,
      height: 0.012,
    });
    meterLegend.scale.setScalar(1.5);
    meterLegend.position.set(0.14, 0.01, 0);
    p.panel.add(meterLegend);
    const view = createCapacitorBoardView(kit);
    view.group.scale.setScalar(2.8);
    view.group.position.set(0, 0.03, 0);
    p.deck.add(view.group);
    capacitors.forEach((capacitor, i) => {
      parts.hub.add(capacitor, view.cans[i], 'capacitor');
      parts.uses.set(view.cans[i], () => capacitor.replace());
      parts.steps.push(capacitor.step);
    });
    parts.updates.push(() => {
      meter.show(String(bus.position.value * 50));
      capacitors.forEach((capacitor, i) =>
        view.set(i, capacitor.health.value, capacitor.smoke.value),
      );
    });
    finish(
      p.group,
      parts,
      (seconds, delta, reducedMotion) =>
        view.update(seconds, delta, reducedMotion),
      view.dispose,
    );
  }

  // ---- The motor ---------------------------------------------------------
  {
    const p = pedestal('INDUCTION MOTOR\n2 HP, 1750 RPM, TEFC');
    const parts = fittingParts();
    const c = controls(p.panel, parts);
    const run = c.lever('RUN', -0.15, -0.04, 'MOTOR RUN selector');
    const speed = c.pot('SPEED', 0.15, -0.04, 19, 'MOTOR SPEED potentiometer');
    // The run selector holds the motor's hum while it runs.
    const motorRun = createSwitch({
      bound: {
        get value() {
          return run.position.value === 1;
        },
        set: () => {},
      },
      sounds: { state: (s) => (s.on ? 'motor hum' : null) },
    });
    const view = createMotorView(kit);
    view.group.scale.setScalar(1.5);
    p.deck.add(view.group);
    parts.hub.add(motorRun, view.group, 'motor');
    let rpm = 0;
    parts.updates.push((delta) => {
      const target =
        run.position.value === 1 ? speed.position.value * 100 * 0.97 : 0;
      // The motor runs up and coasts down on its own inertia.
      rpm += (target - rpm) * Math.min(1, delta * (target > rpm ? 1.5 : 0.4));
      view.set(rpm);
      view.update(delta);
    });
    finish(p.group, parts);
  }

  return fittings;
}
