import { createLevel0Spares } from './level0-spares';
import { createSparesWorkbench } from '../toolkit/components/site-dressing/views/spares-workbench';
import { LEVEL0_SPARES } from '../game/level0-room-plan';
import { Scene, Vector3 } from 'three';
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
import { createBuildingSupply } from '../game/building-supply';
import { detects } from '../toolkit/components/architectural/logic/presence-detector';

/**
 * How small merged detail may look before it is not drawn: its radius over
 * its distance, at the room's own view (about 0.17°, some 7 pixels across
 * on a 1080-line screen; a 30 mm bezel goes at about 5 m, a meter's face
 * at about 12 m, further when zoomed in). Coarser, it starts taking away
 * what a door is recognised by from where the player starts: meters,
 * gauges, bezels (compared against `?merge=off`, the owner's eye the judge).
 */
/** How much daylight comes through Level 0's skylights: a dark day. */
export const LEVEL0_DAYLIGHT = 0.2;
/** Level 0's environment light with every light lit (`useEnvironment`). */
export const LEVEL0_ENVIRONMENT = 0.3;
/** A fire this big (0 to 1) has taken hold of the machine's wiring. */
const CATASTROPHIC_FIRE = 0.3;
/** How long the simulator's BROWNOUT symptom lasts, seconds. */
export const LEVEL0_BROWNOUT_SECONDS = 45;
/** Seconds a lighting zone stays on after its detector last saw anyone. */
export const LEVEL0_DETECTOR_TIMEOUT = 120;
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
  // The building's supply, which the machine's load pulls about.
  const supply = createBuildingSupply();
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
    // The sky is the courtyard's sky dome, which the room adds.
    sky: false,
    lighting: building,
    fire: createWarehouseFire(
      { ...fire, heads: shownHeads },
      voice.evacuationTone,
    ),
  });
  room.parts.add(voice);
  room.group.scale.setScalar(m);
  scene.add(room.group);
  // A dark day: little comes in through the skylights, and the room is lit
  // mostly by its own fluorescent battens, which come to life, flicker and
  // fail with the building's supply, and by its emergency lighting.
  const lighting = addWarehouseLighting(scene, room.lights, m, {
    daylight: LEVEL0_DAYLIGHT,
    brightness: 1.2,
    bounce: 0.35,
    environment: LEVEL0_ENVIRONMENT,
    zones: building.model.lighting.zoneLight,
    emergency: building.model.lighting.zoneEmergencyVolts,
  });
  // The presence detectors hold a zone on for two minutes after they last
  // see the player, so the lights noticeably follow them about.
  building.model.lighting.detectorTimeout.set(LEVEL0_DETECTOR_TIMEOUT);
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
  const scenarios = createLevel0Scenarios(
    machine,
    Math.random,
    symptoms,
    () => {
      failures.clean();
      // RESET puts the building's lighting right too.
      supply.clear();
      const power = building.model.power;
      power.lightingBreaker.set(true);
      for (const zone of power.zoneBreakers) zone.set(true);
    },
    {
      fault: () => building.model.power.tripLighting(),
      brownout: () => supply.brownoutFor(LEVEL0_BROWNOUT_SECONDS),
    },
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
  const sparesBench = createSparesWorkbench(kit);
  sparesBench.group.scale.setScalar(m);
  sparesBench.group.position.set(LEVEL0_SPARES.x * m, 0, LEVEL0_SPARES.z * m);
  sparesBench.group.rotation.y = LEVEL0_SPARES.yaw;
  scene.add(sparesBench.group);
  const spares = createLevel0Spares(kit, sparesBench, machine);
  // What is merged may be hidden when too small to see (`createDetailCuller`).
  const detail = [
    ...mcc.batches,
    ...room.batches,
    ...workstation.batches,
    ...simulator.batches,
    ...spares.batches,
  ];
  // The presence detectors over the lighting zones, where they hang, so
  // each can be told whether it sees the player.
  room.group.updateMatrixWorld(true);
  const detectors = room.detectors.map(({ part, zone }) => {
    const at = part.object.getWorldPosition(new Vector3());
    return {
      zone,
      detector: { x: at.x / m, z: at.z / m, height: at.y / m },
    };
  });
  let wasBroken = false;
  let wasBurning = false;
  /**
   * Advance the building's services `delta` seconds, the player at (x, z),
   * metres: the detectors over them see them.
   */
  const presence = (delta: number, x: number, z: number) => {
    for (const { zone, detector } of detectors)
      if (detects(detector, x, z)) building.model.lighting.seen(zone);
    // The machine and the building share a supply: its load pulls the
    // building's lights about (`building-supply.ts`).
    // Its catastrophes (a breakdown, a fire taking hold) surge the lights
    // and trip them; as it nears a breakdown, they turn strange.
    const plant = machine.plant;
    const broken = plant.brokenDown.value;
    const burning = plant.fireSize.value > CATASTROPHIC_FIRE;
    if ((broken && !wasBroken) || (burning && !wasBurning))
      supply.catastrophe();
    wasBroken = broken;
    wasBurning = burning;
    building.model.power.supplyFeed.set(
      supply.step(delta, plant.loadAmps.value, broken ? 0 : plant.strain.value),
    );
    if (supply.trip()) building.model.power.tripLighting();
    building.model.tick(delta);
  };
  return {
    scene,
    machine,
    symptoms,
    room,
    lighting,
    presence,
    building,
    supply,
    machineSides,
    workstation,
    stopDiagnosticLink,
    chairs,
    failures,
    scenarios,
    simulator,
    sparesBench,
    spares,
    detail,
  };
}
