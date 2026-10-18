import { signal } from '@preact/signals-core';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { Mesh } from 'three';
import type { MeshStandardMaterial } from 'three';
import { createPanelKit } from '../views/eighties-controls';
import {
  STUDIO_CAP_COLOURS,
  STUDIO_LED_COLOURS,
  createStudioSwitch,
} from '../../industrial-control/views/studio-controls';
import { studioSwitch } from './parts';

beforeEach(() => {
  // Label canvases are made, but nothing is drawn.
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
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

const press = (part: ReturnType<typeof studioSwitch>) =>
  [...part.uses.values()][0]();

it('acts on each momentary press, its LED showing the press a moment', () => {
  let pressed = 0;
  const part = studioSwitch(createPanelKit(), {
    legend: 'FULL ON',
    action: () => pressed++,
  });
  expect(part.lit.value).toBe(false);
  press(part);
  expect(pressed).toBe(1);
  expect(part.lit.value).toBe(true);
  part.update(0.5);
  expect(part.lit.value).toBe(false);
});

it('shows a separately driven LED instead, when given one', () => {
  const lamp = signal(false);
  const part = studioSwitch(createPanelKit(), { legend: 'SYNC', lamp });
  press(part);
  expect(part.lit.value).toBe(false);
  lamp.value = true;
  expect(part.lit.value).toBe(true);
});

it('latches on and off, lit while on, and does nothing without power', () => {
  const power = signal(true);
  const part = studioSwitch(createPanelKit(), {
    legend: 'MUTE',
    mode: 'latching',
    power,
  });
  press(part);
  expect(part.lit.value).toBe(true);
  press(part);
  expect(part.lit.value).toBe(false);
  power.value = false;
  press(part);
  expect(part.lit.value).toBe(false);
});

it('takes its cap colour and its LED colour independently', () => {
  const view = createStudioSwitch(createPanelKit(), {
    legend: 'RESET',
    cap: 'white',
    led: 'red',
  });
  const capColour = (view.cap.material as MeshStandardMaterial).color;
  expect(`#${capColour.getHexString()}`).toBe(STUDIO_CAP_COLOURS.white.cap);
  view.setLit(true);
  let led: Mesh | undefined;
  view.group.traverse((o) => {
    if (o instanceof Mesh && o !== view.cap && o.parent === view.cap.parent)
      led ??= o;
  });
  const glow = (led!.material as MeshStandardMaterial).color;
  expect(`#${glow.getHexString()}`).toBe(STUDIO_LED_COLOURS.red);
});
