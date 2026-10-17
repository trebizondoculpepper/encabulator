import { makeBoardPortable } from './portable-board';
import { createPcbBackplane } from '../scene/pcb-backplane';
import { computed, signal } from '@preact/signals-core';
import {
  MACHINE_COMPONENTS,
  BETAFORM_BOARD,
  EXPANSION_CARD_KINDS,
  cardDesignation,
  createCircuitBreaker,
  createServiceComponent,
} from '../game/machine-components';
import type {
  MachineComponentKind,
  ServiceKind,
} from '../game/machine-components';
import {
  createOperatingHandle,
  createContactor,
} from '../game/world/components';
import type { Readable } from '../game/world/components';
import { createMachineDeviceView } from '../scene/machine-components';
import type { RackUnitOptions } from '../scene/rack-equipment';
import type { PanelKit } from '../scene/eighties-controls';
import {
  beginPart,
  createPartSet,
  capacitorBoard,
  contactor,
  fuse,
  motor,
  motorControlUnit,
  overloadRelay,
  rackUnit,
} from './parts';
import type { Part } from './parts';
import { MACHINE_REFERENCES } from '../game/machine-references';
import { click } from '../audio/part-audio';

export interface MachineDevice extends Part {
  kind: MachineComponentKind;
  active: Readable<boolean>;
  faulted: Readable<boolean>;
  value: Readable<number>;
  testLabel: string;
  test(): void;
  repair(): void;
  cards?: readonly MachineDevice[];
  service?: ReturnType<typeof createServiceComponent>;
  handle?: ReturnType<typeof createOperatingHandle>;
  breaker?: ReturnType<typeof createCircuitBreaker>;
}

/** Same component, view, operator actions and sound in the MCC and gallery. */
export function machineComponent(
  kit: PanelKit,
  kind: MachineComponentKind,
  props: {
    name?: string;
    rack?: Pick<RackUnitOptions, 'u' | 'style' | 'depth' | 'label'>;
    breaker?: ReturnType<typeof createCircuitBreaker>;
    power?: Readable<boolean>;
    running?: Readable<boolean>;
    current?: Readable<number>;
    voltage?: Readable<number>;
    input?: Readable<number>;
  } = {},
): MachineDevice {
  const label = MACHINE_COMPONENTS.find(([key]) => key === kind)![1];
  const name = props.name ?? label;
  const physicallyConnected = signal(true);
  const power = computed(
    () => physicallyConnected.value && (props.power?.value ?? true),
  );
  const running = computed(() => power.value && (props.running?.value ?? true));
  const stress = signal(false);
  const current = computed(() =>
    power.value ? (stress.value ? 12 : (props.current?.value ?? 1)) : 0,
  );
  let part: Part;
  let cards: MachineDevice[] | undefined;
  let service: ReturnType<typeof createServiceComponent> | undefined;
  let active: Readable<boolean> = running;
  let faulted: Readable<boolean> = stress;
  let value: Readable<number> = computed(() => (active.value ? 1 : 0));
  let testLabel = 'FAULT';
  let test = () => {
    stress.value = true;
  };
  let repair = () => {
    stress.value = false;
  };
  let handle: ReturnType<typeof createOperatingHandle> | undefined;
  let breaker: ReturnType<typeof createCircuitBreaker> | undefined;
  switch (kind) {
    case 'backplane': {
      const a = beginPart(kit, name);
      const children = createPartSet();
      const board = createPcbBackplane(kit, 0.48, 0.42, 1771, 'PCB BACKPLANE');
      a.object.add(board);
      const bus = createServiceComponent('backplane', { power });
      service = bus;
      a.voice(bus.connected, {
        on: click({ band: 2400, q: 2, decay: 0.025, level: 0.15 }),
        off: click({ band: 1600, q: 2, decay: 0.035, level: 0.15 }),
      });
      board.traverse((o) => {
        if (o.name === 'Backplane supply connector')
          a.uses.set(o, bus.connected.flip);
      });
      const portable = makeBoardPortable(
        a,
        () => {
          if (bus.connected.state.value) bus.connected.flip();
        },
        'face',
      );
      a.disposers.push(bus.dispose);
      let feed: Readable<boolean> = bus.running;
      let processor: Readable<boolean> = signal(false);
      let slot = 0;
      const slotCount = EXPANSION_CARD_KINDS.reduce(
        (sum, kind) => sum + (kind === 'plc-cpu' ? 2 : 1),
        0,
      );
      cards = EXPANSION_CARD_KINDS.map((cardKind, index) => {
        const slots = cardKind === 'plc-cpu' ? 2 : 1;
        const centre = (slot + slots / 2 - slotCount / 2) * 0.03175;
        slot += slots;
        const card = children.add(
          machineComponent(kit, cardKind, {
            name: `${name}: card ${index + 1} ${cardDesignation(cardKind)!.name}`,
            power: feed,
            running: cardKind === 'plc-output' ? processor : props.running,
            input: props.input,
          }),
        );
        card.object.position.set(centre + 0.04, 0, 0.012);
        a.object.add(card.object);
        if (cardKind === 'plc-power') feed = card.active;
        if (cardKind === 'plc-cpu') processor = card.active;
        return card;
      });
      children.add(a.part());
      part = { object: a.object, ...children };
      active = computed(() => bus.running.value && processor.value);
      faulted = computed(
        () =>
          bus.failed.value ||
          !bus.connected.state.value ||
          cards!.some((card) => card.faulted.value),
      );
      value = bus.output;
      test = bus.fail;
      repair = () => {
        bus.repair();
        if (portable.phase.value === 'installed' && !bus.connected.state.value)
          bus.connected.flip();
      };
      testLabel = 'BUS FAULT';
      break;
    }
    case 'breaker': {
      breaker = props.breaker ?? createCircuitBreaker();
      handle = createOperatingHandle({ bound: breaker.position });
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      a.object.add(view.group);
      a.voice(handle, {
        on: click({ band: 900, q: 1, decay: 0.06, level: 0.3 }),
        off: click({ band: 1200, q: 1, decay: 0.04, level: 0.3 }),
        trip: click({ band: 1700, q: 2, decay: 0.1, level: 0.4 }),
      });
      a.uses.set(view.service, handle.operate);
      a.updates.push(() =>
        view.set(handle!.on.value, breaker!.position.value === 'tripped', true),
      );
      a.disposers.push(handle.dispose);
      part = a.part();
      active = computed(() => power.value && breaker!.closed.value);
      faulted = computed(() => breaker!.position.value === 'tripped');
      test = breaker.trip;
      repair = () => {
        if (breaker!.position.value === 'tripped') breaker!.operate();
      };
      testLabel = 'TRIP';
      break;
    }
    case 'contactor': {
      const device = contactor(kit, { name, coil: running });
      part = device;
      active = device.component.closed;
      faulted = device.component.welded;
      test = device.component.weld;
      repair = device.component.repair;
      testLabel = 'WELD';
      break;
    }
    case 'relay': {
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      const device = createContactor({ coil: running });
      a.object.add(view.group);
      a.voice(device, {
        'pull-in': click({ band: 2200, q: 2, decay: 0.02, level: 0.12 }),
        'drop-out': click({ band: 2600, q: 2, decay: 0.015, level: 0.1 }),
      });
      a.updates.push(() =>
        view.set(device.closed.value, device.welded.value, true),
      );
      a.disposers.push(device.dispose);
      part = a.part();
      active = device.closed;
      faulted = device.welded;
      test = device.weld;
      repair = device.repair;
      testLabel = 'WELD';
      break;
    }
    case 'overload': {
      const device = overloadRelay(kit, {
        name,
        current,
        settings: [2.5, 2.75, 3, 3.25, 3.5, 3.75, 4],
      });
      part = device;
      active = computed(
        () => power.value && device.component.contactClosed.value,
      );
      faulted = device.component.tripped;
      value = device.component.heat;
      test = device.component.test;
      repair = () => {
        device.component.reset();
      };
      testLabel = 'TRIP';
      break;
    }
    case 'fuse': {
      const device = fuse(kit, { name, current, rating: 2 });
      part = device;
      active = computed(() => power.value && device.component.whole.value);
      faulted = device.component.blown;
      test = () => {
        stress.value = true;
        device.component.step(0.1);
        stress.value = false;
      };
      repair = () => {
        device.component.replace();
      };
      testLabel = 'OVERLOAD';
      break;
    }
    case 'capacitors': {
      const voltage = computed(() =>
        power.value ? (stress.value ? 800 : (props.voltage?.value ?? 325)) : 0,
      );
      const device = capacitorBoard(kit, { name, voltage, rated: 400 });
      const a = beginPart(kit, name);
      a.object.add(device.object);
      const children = createPartSet();
      children.add(device);
      makeBoardPortable(
        a,
        () => {
          physicallyConnected.value = false;
        },
        'face',
      );
      children.add(a.part());
      part = { object: a.object, ...children };
      active = computed(
        () => power.value && device.capacitors.every((c) => c.working.value),
      );
      faulted = computed(() =>
        device.capacitors.some((c) => c.health.value !== 'good'),
      );
      value = voltage;
      test = () => {
        stress.value = true;
        device.capacitors.forEach((c) => c.step(1));
        stress.value = false;
      };
      repair = () => {
        device.capacitors.forEach((c) => c.replace());
      };
      testLabel = 'OVERVOLT';
      break;
    }
    case 'rack-unit': {
      const device = rackUnit(kit, {
        name,
        label: 'SERVICE CHASSIS',
        u: 2,
        style: 'vented',
        depth: 0.3302,
        ...props.rack,
      });
      part = device;
      active = computed(() => !device.pulled.value);
      faulted = device.pulled;
      const operate = [...device.uses.values()][0];
      test = () => {
        if (!device.pulled.value) operate();
      };
      repair = () => {
        if (device.pulled.value) operate();
      };
      testLabel = 'WITHDRAW';
      break;
    }
    case 'motor-unit': {
      const device = motorControlUnit(kit, { name });
      part = device;
      active = device.on;
      test = () => {
        stress.value = true;
        device.trip();
      };
      repair = () => {
        stress.value = false;
      };
      testLabel = 'TRIP';
      break;
    }
    case 'motor': {
      part = motor(kit, {
        name,
        running: computed(() => running.value && !stress.value),
        speed: computed(() => (props.input?.value ?? 1) * 1750),
      });
      active = computed(() => running.value && !stress.value);
      testLabel = 'STOP';
      break;
    }
    default: {
      const module = createServiceComponent(kind as ServiceKind, {
        power,
        enabled: props.running,
        input: props.input,
      });
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      a.object.add(view.group);
      a.voice(module.connected, {
        on: click({ band: 2400, q: 2, decay: 0.025, level: 0.15 }),
        off: click({ band: 1600, q: 2, decay: 0.035, level: 0.15 }),
      });
      service = module;
      const portable = kind.startsWith('plc-')
        ? makeBoardPortable(a, () => {
            if (module.connected.state.value) module.connected.flip();
          })
        : null;
      a.uses.set(view.group, () => {
        if (!portable || portable.phase.value === 'installed')
          module.connected.flip();
      });
      a.updates.push((dt) => {
        module.tick(dt);
        view.set(
          module.running.value,
          module.failed.value,
          module.connected.state.value,
          module.channels.value,
          dt,
          portable != null && portable.phase.value !== 'installed',
        );
      });
      a.disposers.push(module.dispose);
      part = a.part();
      active = module.running;
      faulted = computed(
        () => module.failed.value || !module.connected.state.value,
      );
      value = module.output;
      test = module.fail;
      repair = () => {
        module.repair();
        if (
          (!portable || portable.phase.value === 'installed') &&
          !module.connected.state.value
        )
          module.connected.flip();
      };
      break;
    }
  }
  if (kind.startsWith('plc-'))
    part.object.userData.boardDesignation = {
      ...BETAFORM_BOARD,
      type: cardDesignation(kind)!.name,
    };
  part.object.userData.machineComponentKind = kind;
  part.object.userData.machineReference = MACHINE_REFERENCES[kind];
  return {
    ...part,
    kind,
    active,
    faulted,
    value,
    testLabel,
    test,
    repair,
    handle,
    breaker,
    cards,
    service,
  };
}
