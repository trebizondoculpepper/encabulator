import { computed } from '@preact/signals-core';
import type { Part } from './parts';
import { beginPart } from './parts';
import { click } from '../audio/part-audio';
import { WATER_SPRAY } from '../audio/part-loops';
import { architecturalComponent } from '../game/architectural-fittings';
import type { ArchitecturalKind } from '../game/architectural-fittings';
import type { ArchitecturalServices } from '../game/warehouse-services';
import { createArchitecturalServices } from '../game/warehouse-services';
import { createSwitch } from '../game/world/components';
import { createArchitecturalFixture } from '../scene/architectural-fixtures';
import type { PanelKit } from '../scene/eighties-controls';
import * as fittings from './building-parts';

/** One factory for all installed and exhibited architectural fittings. */
export function architecturalPart(
  kit: PanelKit,
  kind: ArchitecturalKind,
  services: ArchitecturalServices = createArchitecturalServices(),
  options: {
    index?: number;
    legend?: string;
    testers?: boolean;
    fallDistance?: number;
    length?: number;
  } = {},
) {
  const m = services.model,
    f = m.fire;
  let part: Part;
  const i = options.index ?? 0;
  switch (kind) {
    case 'distribution':
      part = fittings.distributionBoard(kit, {
        main: m.power.main,
        circuits: [
          ['LIGHTS', m.power.lightingBreaker],
          ['SOCKETS', m.power.socketsBreaker],
          ['HEAT / VENT', m.power.hvacBreaker],
        ],
      });
      break;
    case 'socket': {
      const id = services.id();
      const left = m.g.input(`${id}.left`, true),
        right = m.g.input(`${id}.right`, true);
      part = fittings.twinSocket(kit, {
        left,
        right,
        metalclad: true,
        testers: options.testers ?? false,
        live: computed(() => ({
          left:
            m.power.main.value && m.power.socketsBreaker.value && left.value,
          right:
            m.power.main.value && m.power.socketsBreaker.value && right.value,
        })),
      });
      break;
    }
    case 'switch':
      part = fittings.lightSwitch(kit, { gangs: [m.lighting.switchDoor] });
      break;
    case 'emergency':
      part = fittings.emergencyLight(kit, {
        lit: m.lighting.emergencyLit,
        charging: m.lighting.charging,
      });
      break;
    case 'exit':
      part = fittings.exitSign(kit, { level: m.lighting.exitSign });
      break;
    case 'callpoint':
      part = fittings.callPoint(kit, {
        latched: services.callPoints[i],
        press: () => services.press(i),
        reset: () => services.reset(i),
      });
      break;
    case 'sounder':
      part = fittings.sounderBeacon(kit, { sounding: f.sounding });
      break;
    case 'detector':
      part = fittings.smokeDetector(kit, { alarm: f.detector });
      break;
    case 'firepanel':
      part = fittings.firePanel(kit, {
        lamps: f.panelLamps,
        key: f.panelKey,
        silence: f.silence,
        reset: f.reset,
        evacuate: f.evacuate,
      });
      break;
    case 'sprinkler':
      part = fittings.sprinklerHead(kit, {
        head: computed(() => f.heads.value[i]),
        voice: true,
        fallDistance: options.fallDistance,
      });
      break;
    case 'valves':
      part = fittings.valveSet(kit, {
        main: f.riserValve,
        tripped: f.discharging,
        reset: f.resetSprinklers,
      });
      break;
    case 'bell':
      part = fittings.fireBell(kit, { ringing: f.discharging });
      break;
    case 'water':
    case 'co2':
      part = fittings.extinguisher(kit, { kind });
      break;
    default: {
      const a = beginPart(kit, architecturalComponent(kind).title);
      const view = createArchitecturalFixture(
        kit,
        kind,
        options.legend,
        options.length,
      );
      a.object.add(view.group);
      if (kind === 'testvalve' && view.actuator) {
        const valve = createSwitch({ bound: services.testDrain });
        a.uses.set(view.actuator, valve.flip);
        a.holdWhile(
          computed(() => services.testDrain.value && f.riserValve.value),
          WATER_SPRAY,
        );
        a.voice(valve, {
          on: click({ band: 900, q: 1, decay: 0.04, level: 0.1 }),
          off: click({ band: 1100, q: 1, decay: 0.04, level: 0.1 }),
        });
        a.disposers.push(valve.dispose);
        a.updates.push(() => view.set(services.testDrain.value));
      }
      if (kind === 'luminaire')
        a.updates.push(() => view.set(m.lighting.roomLight.value > 0));
      part = a.part();
    }
  }
  const component = architecturalComponent(kind);
  part.object.name = component.title;
  part.object.userData.architectural = component;
  return { ...part, component };
}
