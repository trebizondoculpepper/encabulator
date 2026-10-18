import { effect } from '@preact/signals-core';
import type { BbcDiagnosticLink } from '../logic/bbc-micro';
import { Vector3 } from 'three';
import { beginPart } from '../../core/parts/parts';
import { partAudio, recording, click } from '../../core/audio/part-audio';
import { createMicroLabel } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBbcComputer } from '../logic/bbc-micro';
import { createBbcWorkstation } from '../views/bbc-workstation';

const BOOT = recording(
  new URL('../../core/audio/assets/bbc-model-b-boot.wav', import.meta.url),
  0.35,
);

/** Reusable workstation, including its own power control, boot and positional cue. */
export function bbcWorkstation(
  kit: PanelKit,
  importedConnectors = false,
  link?: BbcDiagnosticLink,
) {
  const a = beginPart(kit, 'BBC Micro Model B');
  const view = createBbcWorkstation(kit, importedConnectors);
  const model = createBbcComputer(link);
  a.object.add(view.group);
  let seat = (_pose: {
    x: number;
    z: number;
    yaw: number;
    pitch: number;
    y: number;
  }) => {};
  a.uses.set(view.chair.group, () => {
    const eye = view.chair.group.localToWorld(new Vector3(0, 1.18, 0));
    const target = view.group.localToWorld(
      view.cub.group.position.clone().add(new Vector3(0, 0.16, 0.17)),
    );
    const direction = target.sub(eye);
    seat({
      x: eye.x,
      z: eye.z,
      y: eye.y,
      yaw: Math.atan2(direction.x, -direction.z),
      pitch: Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
    });
  });
  a.uses.set(view.bbc.powerSwitch, model.power.flip);
  a.uses.set(view.bbc.group, model.power.flip);
  const label = createMicroLabel(kit, 'POWER  I / O', {
    height: 0.0025,
    ink: '#292b28',
    maxWidth: 0.07,
  });
  label.position.set(-0.17, 0.065, -0.176);
  label.rotation.y = Math.PI;
  view.bbc.group.add(label);
  let stopSound = () => {};
  let audible = true;
  const stopEvent = model.power.onEvent((event) => {
    stopSound();
    if (event === 'on' && audible)
      stopSound = partAudio.play(BOOT, view.bbc.group);
  });
  a.voice(
    model.power,
    {
      on: click({ band: 1200, q: 1, decay: 0.025, level: 0.15 }),
      off: click({ band: 900, q: 1, decay: 0.025, level: 0.15 }),
    },
    view.bbc.group,
  );
  // Original synthesis: paired seek steps, with gaps as the head settles.
  const seek = {
    sequence: [
      0, 0.045, 0.13, 0.19, 0.37, 0.42, 0.69, 0.75, 1.04, 1.1, 1.3,
    ].map((at) => ({
      at,
      click: {
        band: 640,
        q: 0.7,
        decay: 0.028,
        level: 0.09,
        thump: [130, 0.025] as [number, number],
      },
    })),
  };
  let stopRead = () => {};
  let wasReading = false;
  const sound = effect(() => {
    const reading = model.reading.value;
    if (!reading) stopRead();
    else if (!wasReading && audible)
      stopRead = partAudio.play(seek, view.disk.group);
    wasReading = reading;
  });
  let clock = 0;
  const update = (delta: number) => {
    clock += delta;
    model.step(delta);
    const on = model.power.state.value;
    view.bbc.powerSwitch.rotation.x = on ? -0.18 : 0.18;
    view.cub.update(
      clock,
      model.lines.value,
      on && model.phase.value !== 'loading',
    );
    view.cub.power(on);
    view.disk.update(model.reading.value ? 1.4 + (clock % 1.5) : 0);
  };
  a.updates.push(update);
  update(0);
  a.disposers.push(
    sound,
    () => stopRead(),
    stopEvent,
    () => stopSound(),
    model.dispose,
    view.bbc.dispose,
    view.cub.dispose,
    view.disk.dispose,
    view.chair.dispose,
  );
  const part = a.part();
  return {
    ...part,
    model,
    view,
    onSit(callback: typeof seat) {
      seat = callback;
    },
    setAudible(on: boolean) {
      audible = on;
      part.setAudible(on);
      if (!on) {
        stopSound();
        stopRead();
      }
    },
  };
}
