import { makeBoardPortable } from '../../core/parts/portable-board';
import { MACHINE_DROP_PROFILES } from '../logic/machine-drop-profiles';
import type { MachineDevice } from './machine-components';
import type { PortableObject } from '../../../controls/input/object-handling';
import { computed, effect, signal } from '@preact/signals-core';
import { BoxGeometry, Mesh } from 'three';
import { beginPart } from '../../core/parts/parts';
import { partAudio, tone } from '../../core/audio/part-audio';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Readable } from '../../core/logic/world/components';
import { createServiceComponent } from '../logic/machine-components';
import { createPcbBackplane, createCardEdgeSlot } from '../views/pcb-backplane';

/** Two Eurocard-format service boards on a fixed diagnostic motherboard. */
export function neumannDiagnostics(
  kit: PanelKit,
  power: Readable<boolean>,
  available: Readable<boolean>,
) {
  const a = beginPart(kit, 'Neumann annunciator diagnostic motherboard');
  a.object.userData.attachment = 'fixed';
  const motherboard = createPcbBackplane(
    kit,
    0.3,
    0.26,
    1985,
    'NEUMANN DIAGNOSTIC BACKPLANE',
    'ND',
  );
  a.object.add(motherboard);
  const seats = [
    signal<MachineDevice | null>(null),
    signal<MachineDevice | null>(null),
  ];
  const cards: MachineDevice[] = [];
  const services = new Map<
    MachineDevice,
    ReturnType<typeof createServiceComponent>
  >();
  const positions = [0.005, 0.07];
  const labels = ['NEUMANN LINK\nCONTROLLER', 'NEUMANN\nDIAGNOSTICS'];
  const kinds = ['plc-comms', 'plc-cpu'] as const;
  const repairKinds = ['neumann-link', 'neumann-diagnostics'] as const;
  const contactLength = 0.09;
  for (let i = 0; i < 2; i++) {
    const socket = createCardEdgeSlot(kit, i, contactLength);
    socket.userData.contactLength = contactLength;
    socket.position.set(positions[i], 0, 0.002);
    motherboard.add(socket);
  }
  const make = (i: number): MachineDevice => {
    const label = labels[i];
    const kind = kinds[i];
    const card = beginPart(kit, label.replace('\n', ' '));
    const feed = computed(
      () => power.value && seats[i].value?.object === card.object,
    );
    const service = createServiceComponent(kind, { power: feed });
    card.object.userData.repairKind = repairKinds[i];
    card.object.userData.machineComponentKind = kind;
    const pcb = createPcbBackplane(
      kit,
      0.16,
      0.1,
      1986 + i,
      label.replace('\n', ' '),
      'ND',
    );
    pcb.rotation.y = Math.PI / 2;
    pcb.position.z = 0.09;
    card.object.add(pcb);
    const edge = new Mesh(
      new BoxGeometry(0.0016, contactLength, 0.015),
      kitPaint(kit, '#b9a35e', 0.65),
    );
    edge.name = 'Neumann card edge connector';
    edge.userData.contactLength = contactLength;
    edge.position.z = 0.009;
    card.object.add(edge);
    const face = new Mesh(
      new BoxGeometry(0.025, 0.11, 0.008),
      kitPaint(kit, '#bfc6be', 0.45),
    );
    face.position.set(0, 0, 0.175);
    card.object.add(face);
    const tag = createMicroLabel(kit, label, {
      height: 0.0027,
      maxWidth: 0.024,
      ink: '#15201b',
    });
    tag.position.set(0, 0.025, 0.1795);
    card.object.add(tag);
    if (i === 0) {
      const material = kitPaint(kit, '#18291b');
      const led = new Mesh(new BoxGeometry(0.005, 0.005, 0.002), material);
      led.name = 'Neumann Link Controller connection LED';
      led.userData.live = true;
      led.position.set(0, -0.018, 0.181);
      card.object.add(led);
      card.updates.push(() => {
        const lit =
          connected.value &&
          seats[0].value?.object === card.object &&
          clock % 1 < 0.5;
        material.color.set(lit ? '#53ff78' : '#18291b');
        led.userData.lit = lit;
      });
    }
    makeBoardPortable(
      card,
      () => {
        if (seats[i].value?.object === card.object) seats[i].value = null;
      },
      'side',
      MACHINE_DROP_PROFILES[kind],
    );
    card.object.userData.manufacturer = 'Neumann Dynamik';
    card.updates.push(service.tick);
    card.disposers.push(service.dispose);
    const device: MachineDevice = {
      ...card.part(),
      kind,
      attachment: 'detachable',
      dropProfile: MACHINE_DROP_PROFILES[kind],
      service,
      active: service.running,
      faulted: service.failed,
      value: computed(() => (service.running.value ? 1 : 0)),
      testLabel: 'FAIL',
      test: service.fail,
      repair: service.repair,
    };
    cards.push(device);
    services.set(device, service);
    return device;
  };
  const accepts = (device: MachineDevice, i: number) =>
    i >= 0 &&
    i < 2 &&
    services.has(device) &&
    device.object.userData.repairKind === repairKinds[i] &&
    !seats[i].value;
  const insert = (device: MachineDevice, i: number) => {
    if (!accepts(device, i)) return false;
    a.object.add(device.object);
    device.object.position.set(positions[i], 0, 0);
    device.object.quaternion.identity();
    device.object.scale.setScalar(1);
    (device.object.userData.portable as PortableObject).component.reset();
    seats[i].value = device;
    return true;
  };
  // Define shared signals before making cards: their updates read these lazily.
  const diagnosticsOnline = computed(
    () => seats[1].value?.active.value ?? false,
  );
  const online = computed(
    () => diagnosticsOnline.value && Boolean(seats[0].value?.active.value),
  );
  const connected = computed(() => online.value && available.value);
  let clock = 0;
  const initial = [make(0), make(1)];
  initial.forEach((device, i) => {
    insert(device, i);
    a.updates.push(device.update);
    a.disposers.push(device.dispose);
  });
  const led = initial[0].object.getObjectByName(
    'Neumann Link Controller connection LED',
  )!;
  let audible = true;
  let previouslyConnected = false;
  let stopBeep = () => {};
  const stop = effect(() => {
    const on = connected.value;
    if (!on) stopBeep();
    else if (!previouslyConnected && audible)
      stopBeep = partAudio.play(
        tone({ hz: 880, seconds: 0.09, level: 0.1 }),
        led,
      );
    previouslyConnected = on;
  });
  a.updates.unshift((dt) => {
    clock += dt;
  });
  a.disposers.push(stop, () => stopBeep());
  const part = a.part();
  return {
    ...part,
    get controller() {
      return (seats[0].value ?? initial[0]).service!;
    },
    get diagnostics() {
      return (seats[1].value ?? initial[1]).service!;
    },
    cards,
    slots: seats.map((occupant, i) => ({
      kind: repairKinds[i],
      occupant,
      x: positions[i],
    })),
    accepts,
    insert,
    spare: (kind: 'neumann-link' | 'neumann-diagnostics') =>
      make(repairKinds.indexOf(kind)),
    diagnosticsOnline,
    online,
    connected,
    setAudible(on: boolean) {
      audible = on;
      part.setAudible(on);
      if (!on) stopBeep();
    },
  };
}
