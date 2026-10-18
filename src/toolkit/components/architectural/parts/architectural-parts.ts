import { computed } from '@preact/signals-core';
import type { Part } from '../../core/parts/parts';
import { beginPart } from '../../core/parts/parts';
import { click } from '../../core/audio/part-audio';
import { WATER_SPRAY } from '../../core/audio/part-loops';
import { architecturalComponent } from '../logic/architectural-fittings';
import type { ArchitecturalKind } from '../logic/architectural-fittings';
import type { ArchitecturalServices } from '../logic/warehouse-services';
import { createArchitecturalServices } from '../logic/warehouse-services';
import { createSwitch } from '../../core/logic/world/components';
import { createArchitecturalFixture } from '../views/architectural-fixtures';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  callPoint,
  extinguisher,
  fireBell,
  firePanel,
  smokeDetector,
  sounderBeacon,
  sprinklerHead,
  valveSet,
} from '../../fire/parts/fire-parts';
import { distributionBoard, lightSwitch, twinSocket } from './building-parts';
import {
  emergencyLight,
  exitSign,
} from '../../general-safety/parts/safety-parts';

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
      part = distributionBoard(kit, {
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
      part = twinSocket(kit, {
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
      part = lightSwitch(kit, { gangs: [m.lighting.switchDoor] });
      break;
    case 'emergency':
      part = emergencyLight(kit, {
        lit: m.lighting.emergencyLit,
        charging: m.lighting.charging,
      });
      break;
    case 'exit':
      part = exitSign(kit, { level: m.lighting.exitSign });
      break;
    case 'callpoint':
      part = callPoint(kit, {
        latched: services.callPoints[i],
        press: () => services.press(i),
        reset: () => services.reset(i),
      });
      break;
    case 'sounder':
      part = sounderBeacon(kit, { sounding: f.sounding });
      break;
    case 'detector':
      part = smokeDetector(kit, { alarm: f.detector });
      break;
    case 'firepanel':
      part = firePanel(kit, {
        lamps: f.panelLamps,
        key: f.panelKey,
        silence: f.silence,
        reset: f.reset,
        evacuate: f.evacuate,
      });
      break;
    case 'sprinkler':
      part = sprinklerHead(kit, {
        head: computed(() => f.heads.value[i]),
        voice: true,
        fallDistance: options.fallDistance,
      });
      break;
    case 'valves':
      part = valveSet(kit, {
        main: f.riserValve,
        tripped: f.discharging,
        reset: f.resetSprinklers,
      });
      break;
    case 'bell':
      part = fireBell(kit, { ringing: f.discharging });
      break;
    case 'water':
    case 'co2':
      part = extinguisher(kit, { kind });
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
