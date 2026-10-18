import { Scene } from 'three';
import type { Mesh } from 'three';
import { computed, effect, signal } from '@preact/signals-core';
import type { createDetailCuller } from './detail-culling';
import {
  createArchitecturalServices,
  createWarehouseFire,
} from '../toolkit/components/architectural/logic/warehouse-services';
import { voiceAlarm } from '../toolkit/components/fire/parts/fire-parts';
import {
  LEVEL0_CHAIRS,
  LEVEL0_MACHINE,
  LEVEL0_MACHINE_HEADS,
  LEVEL0_SCENARIOS,
} from '../game/level0-room-plan';
import { createMachineSideCulling } from '../scene/machine-side-culling';
import { createWarehouseTrainingRoom } from '../scene/warehouse-training-room';
import {
  kitPaint,
  type PanelKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createChairStack } from '../toolkit/components/site-dressing/views/chair-stack';
import { createLevel0Machine } from './level0-machine';
import { createLevel0Symptoms } from './level0-symptoms';
import { createLevel0Failures } from './level0-failures';
import { createLevel0Scenarios } from './level0-scenarios';
import { createScenarioSimulator } from './scenario-simulator';
import { addMachineWorkstation } from './machine-workstation';
import { addWarehouseLighting } from './warehouse-lighting';

/**
 * How small merged detail may look before it is not drawn: its radius over
 * its distance, at the room's own view (about 0.17°, some 7 pixels across
 * on a 1080-line screen; a 30 mm bezel goes at about 5 m, a meter's face
 * at about 12 m, further when zoomed in). Coarser, it starts taking away
 * what a door is recognised by from where the player starts: meters,
 * gauges, bezels (compared against `?merge=off`, the owner's eye the judge).
 */
export const LEVEL0_DETAIL = 0.003;
/**
 * The same for a control's own meshes (`userData.control`): a door is
 * recognised by its buttons and lamps, so they stay to about 7 m (a
 * 30 mm button some 4 pixels across).
 */
export const LEVEL0_CONTROLS = 0.002;

/** Cull a scene's merged detail as Level 0 does. */
export function cullLevel0Detail(
  culler: ReturnType<typeof createDetailCuller>,
  detail: readonly Mesh[],
) {
  for (const mesh of detail)
    culler.add(mesh, {
      minSize: mesh.userData.control ? LEVEL0_CONTROLS : LEVEL0_DETAIL,
    });
}

/**
 * Everything Level 0 draws when it opens: the warehouse and its fire
 * system, its lighting, the machine and what its failures look like, the
 * workstation, the scenario simulator and the stack of chairs. The room
 * adds the player, the skip and the culling of `detail`; the draw budget
 * test builds this alone.
 */
export function createLevel0Scene(kit: PanelKit, m: number) {
  const scene = new Scene();
  const building = createArchitecturalServices();
  const diagnosticsAvailable = signal(false);
  const machine = createLevel0Machine(kit, { diagnosticsAvailable });
  // The building's fire alarm: the plant's fire system, heard from a
  // ceiling speaker over the middle of the floor and the wall sounders,
  // and every fire fitting in the warehouse working on it together.
  const { fire } = machine.plant;
  const voice = voiceAlarm(kit, {
    voice: fire.voice,
    announcement: fire.announcement,
  });
  voice.object.scale.setScalar(m);
  voice.object.position.set(0, 6.4 * m, 0);
  scene.add(voice.object);
  // The simulator's SYMPTOMS: a failure's effects without its cause. Its
  // SPRINKLER shows on the heads over the machine, for show only.
  const symptoms = createLevel0Symptoms(machine);
  const shownHeads = Object.assign(
    computed(() =>
      fire.heads.value.map((head, i) =>
        symptoms.raining.value && LEVEL0_MACHINE_HEADS.includes(i)
          ? { burst: true, spraying: true }
          : head,
      ),
    ),
    { id: 'sprinkler.heads.shown' },
  );
  const room = createWarehouseTrainingRoom(kit, false, {
    lighting: building,
    fire: createWarehouseFire(
      { ...fire, heads: shownHeads },
      voice.evacuationTone,
    ),
  });
  room.parts.add(voice);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  const lighting = addWarehouseLighting(scene, room.lights, m, {
    daylight: 0.5,
    circuit: building.model.lighting.roomLight,
  });
  const { mcc } = machine;
  mcc.group.scale.setScalar(m);
  mcc.group.position.set(LEVEL0_MACHINE.x * m, 0, LEVEL0_MACHINE.z * m);
  scene.add(mcc.group);
  // Only the side of the machine in view is drawn.
  const machineSides = createMachineSideCulling(mcc.group);
  const workstation = addMachineWorkstation(
    kit,
    LEVEL0_MACHINE,
    m,
    mcc.rear.dataPort,
    machine.diagnostics,
  );
  const stopDiagnosticLink = effect(() => {
    diagnosticsAvailable.value = workstation.diagnosticsAvailable.value;
  });
  scene.add(workstation.group);
  const chairs = createChairStack(8, {
    fabric: kitPaint(kit, '#2c4775'),
    shell: kitPaint(kit, '#1d1f22'),
    chrome: kitPaint(kit, '#c9cccc', 0.9),
  });
  chairs.scale.setScalar(m);
  chairs.position.set(LEVEL0_CHAIRS.x * m, 0, LEVEL0_CHAIRS.z * m);
  chairs.rotation.y = 0.12;
  scene.add(chairs);
  // What the machine's failures look and sound like: the oil spill, worn
  // bearings grinding, the seizure, the fire's smoke and soot, the water.
  const failures = createLevel0Failures(kit, machine);
  // The Hyperplasc Scenario Simulator: a rack of testing scenarios.
  const scenarios = createLevel0Scenarios(machine, Math.random, symptoms, () =>
    failures.clean(),
  );
  const simulator = createScenarioSimulator(kit, scenarios);
  simulator.group.scale.setScalar(m);
  simulator.group.position.set(
    LEVEL0_SCENARIOS.x * m,
    0,
    LEVEL0_SCENARIOS.z * m,
  );
  simulator.group.rotation.y = LEVEL0_SCENARIOS.yaw;
  scene.add(simulator.group);
  // What is merged may be hidden when too small to see (`createDetailCuller`).
  const detail = [
    ...mcc.batches,
    ...room.batches,
    ...workstation.batches,
    ...simulator.batches,
  ];
  return {
    scene,
    machine,
    symptoms,
    room,
    lighting,
    machineSides,
    workstation,
    stopDiagnosticLink,
    chairs,
    failures,
    scenarios,
    simulator,
    detail,
  };
}
