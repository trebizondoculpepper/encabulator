import { signal } from '@preact/signals-core';
import { Group } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import type { PortableObject } from '../../../controls/input/object-handling';
import { createPanelKit } from '../../core/views/eighties-controls';
import { machineComponent } from './machine-components';
import type { MachineDevice } from './machine-components';

beforeEach(() => {
  // Label canvases are made, but nothing is drawn.
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const portable = (card: MachineDevice) =>
  (card.object.userData.portable as PortableObject).component;

/** What the shared pickup does to a card it takes out of its slot. */
function pull(card: MachineDevice, room: Group) {
  portable(card).pickUp();
  (card.object.userData.portable as PortableObject).detach();
  room.attach(card.object);
}

function rack() {
  const room = new Group();
  const power = signal(true);
  const assembly = machineComponent(createPanelKit(), 'backplane', {
    power,
  });
  room.add(assembly.object);
  const card = (kind: string) =>
    assembly.cards!.find((device) => device.kind === kind)!;
  return { room, power, assembly, card };
}

it('runs the rack from whichever cards are seated in its slots', () => {
  const { room, assembly, card } = rack();
  assembly.update(0);
  expect(assembly.active.value).toBe(true);
  expect(card('plc-analog').active.value).toBe(true);
  pull(card('plc-power'), room);
  assembly.update(0);
  // The power card feeds the rest of the rack.
  expect(assembly.slots![0].occupant.value).toBeNull();
  expect(card('plc-analog').active.value).toBe(false);
  expect(assembly.active.value).toBe(false);
  expect(assembly.insert!(card('plc-power'), 0)).toBe(true);
  assembly.update(0);
  expect(card('plc-power').object.parent).toBe(assembly.object);
  expect(portable(card('plc-power')).phase.value).toBe('installed');
  expect(card('plc-analog').active.value).toBe(true);
  expect(assembly.active.value).toBe(true);
});

it('keeps a failed card failed when it is put back, and a spare restores the slot', () => {
  const { room, assembly, card } = rack();
  card('plc-cpu').test();
  assembly.update(0);
  expect(assembly.active.value).toBe(false);
  expect(assembly.faulted.value).toBe(true);
  pull(card('plc-cpu'), room);
  assembly.update(0);
  assembly.insert!(card('plc-cpu'), 1);
  assembly.update(0);
  expect(assembly.active.value).toBe(false);
  pull(card('plc-cpu'), room);
  assembly.update(0);
  const spare = assembly.spare!('plc-cpu');
  room.add(spare.object);
  // A spare on the shelf is healthy but does nothing.
  expect(spare.faulted.value).toBe(false);
  expect(spare.active.value).toBe(false);
  pull(spare, room);
  expect(assembly.insert!(spare, 1)).toBe(true);
  spare.update(0);
  assembly.update(0);
  expect(spare.active.value).toBe(true);
  expect(assembly.active.value).toBe(true);
  expect(assembly.faulted.value).toBe(false);
  // The processor enables the output card through its slot.
  expect(card('plc-output').active.value).toBe(true);
});

it('refuses a card in the wrong slot or a slot already taken', () => {
  const { room, assembly, card } = rack();
  const spare = assembly.spare!('plc-input');
  room.add(spare.object);
  pull(spare, room);
  expect(assembly.insert!(spare, 2)).toBe(false);
  expect(assembly.insert!(spare, 3)).toBe(false);
  pull(card('plc-input'), room);
  assembly.update(0);
  expect(assembly.insert!(spare, 2)).toBe(true);
});

it('takes a seated card out of its slot when it is no longer installed there', () => {
  const { room, assembly, card } = rack();
  const output = card('plc-output');
  pull(output, room);
  assembly.update(0);
  expect(assembly.slots![3].occupant.value).toBeNull();
  expect(output.active.value).toBe(false);
});
