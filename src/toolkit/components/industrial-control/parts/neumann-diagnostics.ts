import { mergeStatic } from '../../core/views/merge-static';
import { computed, effect } from '@preact/signals-core';
import { BoxGeometry, Mesh } from 'three';
import { beginPart } from '../../core/parts/parts';
import { partAudio, tone, click } from '../../core/audio/part-audio';
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
  const controller = createServiceComponent('plc-comms', { power });
  const diagnostics = createServiceComponent('plc-cpu', { power });
  const online = computed(
    () => controller.running.value && diagnostics.running.value,
  );
  const connected = computed(() => online.value && available.value);
  const ledMaterial = kitPaint(kit, '#18291b');
  const led = new Mesh(new BoxGeometry(0.005, 0.005, 0.002), ledMaterial);
  led.name = 'Neumann Link Controller connection LED';
  // Lit by changing its paint: not merged with the still parts.
  led.userData.live = true;
  for (const [i, label, service] of [
    [0, 'NEUMANN LINK\nCONTROLLER', controller],
    [1, 'NEUMANN\nDIAGNOSTICS', diagnostics],
  ] as const) {
    const card = beginPart(kit, label.replace('\n', ' '));
    card.object.userData.attachment = 'fixed';
    // It slides out when disconnected: not merged with the still parts.
    card.object.userData.live = true;
    const x = i * 0.065 + 0.005;
    const socket = createCardEdgeSlot(kit, i);
    socket.position.set(x, 0, 0.002);
    motherboard.add(socket);
    // A 100 x 160 mm Eurocard stands at right angles to the backplane.
    const pcb = createPcbBackplane(
      kit,
      0.16,
      0.1,
      1986 + i,
      label.replace('\n', ' '),
      'ND',
    );
    mergeStatic(pcb, 10);
    pcb.rotation.y = Math.PI / 2;
    pcb.position.z = 0.09;
    card.object.add(pcb);
    const face = new Mesh(
      new BoxGeometry(0.025, 0.11, 0.008),
      kitPaint(kit, '#bfc6be', 0.45),
    );
    face.position.set(0, 0, 0.175);
    face.name = `${label.replace('\n', ' ')} retention / connection`;
    card.object.add(face);
    const tag = createMicroLabel(kit, label, {
      height: 0.0027,
      maxWidth: 0.024,
      ink: '#15201b',
    });
    tag.position.set(0, 0.025, 0.1795);
    card.object.add(tag);
    if (i === 0) {
      led.position.set(0, -0.018, 0.181);
      card.object.add(led);
    }
    card.uses.set(face, service.connected.flip);
    card.voice(service.connected, {
      on: click({ band: 700, q: 1, decay: 0.025, level: 0.08 }),
      off: click({ band: 500, q: 1, decay: 0.025, level: 0.08 }),
    });
    card.updates.push(() => {
      card.object.position.z = service.connected.state.value ? 0 : 0.02;
    });
    card.disposers.push(service.dispose);
    const part = card.part();
    part.object.position.x = x;
    a.object.add(part.object);
    for (const [object, use] of part.uses) a.uses.set(object, use);
    a.updates.push(part.update);
    a.disposers.push(part.dispose);
  }
  mergeStatic(motherboard, 10);
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
  let clock = 0;
  a.updates.push((dt) => {
    clock += dt;
    controller.tick(dt);
    diagnostics.tick(dt);
    const lit = connected.value && clock % 1 < 0.5;
    ledMaterial.color.set(lit ? '#53ff78' : '#18291b');
    led.userData.lit = lit;
  });
  a.disposers.push(stop, () => stopBeep());
  const part = a.part();
  return {
    ...part,
    controller,
    diagnostics,
    online,
    connected,
    setAudible(on: boolean) {
      audible = on;
      part.setAudible(on);
      if (!on) stopBeep();
    },
  };
}
