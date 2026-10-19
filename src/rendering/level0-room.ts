import { Group, Mesh, PerspectiveCamera, Raycaster, Vector2 } from 'three';
import type { Object3D } from 'three';
import {
  LEVEL0_CHAIRS,
  LEVEL0_SCENARIOS,
  LEVEL0_MACHINE,
  LEVEL0_START,
} from '../game/level0-room-plan';
import { WAREHOUSE_BOUNDS, WAREHOUSE_ROOF } from '../game/warehouse-room-plan';
import { domeSky, pickWeather, skyLook } from '../game/level0-sky';
import { createSkyDome } from '../scene/sky-dome';
import type { Weather } from '../game/level0-sky';
import { ejectCabinetDrop } from '../game/cabinet-drop';
import {
  MCC_DEPTH,
  MCC_ISOLATOR_X,
  MCC_WIDTH,
} from '../scene/retro-encabulator-mcc';
import { METRE } from '../toolkit/components/core/logic/units';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';
import { ISOLATOR } from '../toolkit/components/industrial-control/views/incoming-isolator';
import { CHAIR_STACK_HALF } from '../toolkit/components/site-dressing/views/chair-stack';
import {
  addSkipGraffiti,
  addSkipLamps,
  createSkip,
} from '../toolkit/components/site-dressing/views/skip';
import { dressSkip } from '../toolkit/components/site-dressing/logic/skip-dressing';
import { createBinTossing } from '../toolkit/components/site-dressing/parts/bin-tossing';
import type { TossBin } from '../toolkit/components/site-dressing/parts/bin-tossing';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { knobDirection } from '../toolkit/controls/input/knob-turning';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { devWalls } from '../toolkit/gallery/logic/dev-room-links';
import { createDetailCuller } from './detail-culling';
import {
  LEVEL0_ENVIRONMENT,
  createLevel0Scene,
  cullLevel0Detail,
} from './level0-scene';
import { createLevel0Strangeness } from './level0-strangeness';
import { simulatorFootprint } from './scenario-simulator';

/**
 * Level 0, the machine sandbox: Level 2's setting and machine with no
 * scenario, wired unit by unit to its own process model, with one random
 * failure at a time and the skip that takes the chairs' place the first
 * time a board comes out of the machine.
 */
export function startLevel0Room(canvas: HTMLCanvasElement) {
  const m = METRE;
  const kit = createPanelKit();
  const {
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
    detail,
  } = createLevel0Scene(kit, m);
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, LEVEL0_ENVIRONMENT);
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(55, 1, 0.05, 100 * m);
  // Merged detail too small to see from where the player stands is not drawn.
  const culler = createDetailCuller(camera);
  cullLevel0Detail(culler, detail);
  const bounds: Footprint = {
    minX: WAREHOUSE_BOUNDS.minX * m,
    maxX: WAREHOUSE_BOUNDS.maxX * m,
    minZ: WAREHOUSE_BOUNDS.minZ * m,
    maxZ: WAREHOUSE_BOUNDS.maxZ * m,
  };
  const walls = devWalls(bounds, m, WAREHOUSE_ROOF * m);
  const roomSolids = room.solids.map((solid) => ({
    minX: solid.minX * m,
    maxX: solid.maxX * m,
    minZ: solid.minZ * m,
    maxZ: solid.maxZ * m,
  }));
  const { mcc } = machine;
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get('view') === 'annunciator-open'
  )
    mcc.door(0);

  // ---- The skip that was always there --------------------------------------
  const tossing = createBinTossing({ camera, metre: m });
  const skipModel = createSkip(kit);
  skipModel.group.scale.setScalar(m);
  let skip: TossBin | null = null;
  let skipLamps: ReturnType<typeof addSkipLamps> | null = null;
  let skipGraffiti: ReturnType<typeof addSkipGraffiti> | null = null;
  /** Once per room: the chairs go and the skip stands in their place. */
  const conjureSkip = () => {
    if (skip) return;
    scene.remove(chairs);
    skipModel.group.position.set(LEVEL0_CHAIRS.x * m, 0, LEVEL0_CHAIRS.z * m);
    scene.add(skipModel.group);
    const dressing = dressSkip();
    skipGraffiti = addSkipGraffiti(kit, skipModel.group, dressing.tags);
    skipLamps = addSkipLamps(kit, skipModel.group, dressing.lamps);
    skip = tossing.add({ name: 'skip', ...skipModel, ...LEVEL0_CHAIRS });
  };
  // The first board actually taken out of the machine, healthy or not,
  // while the player is looking into the cabinet.
  machine.onBoardRemoved(conjureSkip);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [mcc.group, workstation.group, simulator.group, ...room.fittings],
      true,
    )[0];
    if (!hit || hit.distance > 3.2 * m) return null;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    ) {
      const work =
        mcc.parts.uses.get(object) ??
        workstation.parts.uses.get(object) ??
        simulator.parts.uses.get(object) ??
        room.parts.uses.get(object);
      if (work) return () => work(knobDirection(object!, hit.point, camera));
    }
    return null;
  };
  /** What, in the machine, the player is looking at within reach. */
  const aimedInto = (home: Object3D) => {
    raycaster.setFromCamera(pointer.set(0, 0), camera);
    const hit = raycaster.intersectObject(mcc.group, true)[0];
    if (!hit || hit.distance > 3.2 * m) return false;
    for (let o: Object3D | null = hit.object; o; o = o.parent)
      if (o === home) return true;
    return false;
  };
  /**
   * Let go of a board while looking into its own place in the machine and
   * it is seated there, if that cabinet is isolated and the place is empty;
   * otherwise it drops, or goes in the skip, as anything does.
   */
  const reseat = (object: Object3D) => {
    const device = [...machine.assembly.cards!, machine.capacitors].find(
      (board) => board.object === object,
    );
    if (!device) return false;
    const home =
      device === machine.capacitors
        ? machine.capacitorParent
        : machine.assembly.object;
    return aimedInto(home) && machine.reseat(device);
  };
  const footprints: Footprint[] = [
    {
      minX: (LEVEL0_MACHINE.x - MCC_WIDTH / 2 - 0.1) * m,
      maxX: (LEVEL0_MACHINE.x + MCC_WIDTH / 2 + 0.1) * m,
      minZ: (LEVEL0_MACHINE.z - MCC_DEPTH - 0.08) * m,
      maxZ: (LEVEL0_MACHINE.z + 0.08) * m,
    },
    {
      minX: (LEVEL0_MACHINE.x + MCC_ISOLATOR_X - ISOLATOR.width / 2 - 0.05) * m,
      maxX: (LEVEL0_MACHINE.x + MCC_ISOLATOR_X + ISOLATOR.width / 2 + 0.05) * m,
      minZ: (LEVEL0_MACHINE.z + ISOLATOR.back) * m,
      maxZ: (LEVEL0_MACHINE.z + ISOLATOR.front) * m,
    },
  ];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      new URLSearchParams(location.search).get('view') === 'data-cable'
        ? {
            x: (LEVEL0_MACHINE.x - 4.6) * m,
            z: (LEVEL0_MACHINE.z - 2.4) * m,
            yaw: 2.45,
            pitch: -0.58,
          }
        : new URLSearchParams(location.search)
              .get('view')
              ?.startsWith('annunciator')
          ? {
              x: (LEVEL0_MACHINE.x - 1.79) * m,
              z: (LEVEL0_MACHINE.z + 0.8) * m,
              yaw: 0,
              pitch: -0.78,
            }
          : { ...LEVEL0_START, x: LEVEL0_START.x * m, z: LEVEL0_START.z * m },
    solids: () => [
      ...walls,
      ...workstation.solids(),
      ((f) => ({
        minX: f.minX * m,
        maxX: f.maxX * m,
        minZ: f.minZ * m,
        maxZ: f.maxZ * m,
      }))(
        simulatorFootprint(
          LEVEL0_SCENARIOS.x,
          LEVEL0_SCENARIOS.z,
          LEVEL0_SCENARIOS.yaw,
        ),
      ),
      ...roomSolids,
      ...footprints,
      skip
        ? {
            minX: (skip.x - skip.footprint.x / 2 - 0.05) * m,
            maxX: (skip.x + skip.footprint.x / 2 + 0.05) * m,
            minZ: (skip.z - skip.footprint.z / 2 - 0.05) * m,
            maxZ: (skip.z + skip.footprint.z / 2 + 0.05) * m,
          }
        : {
            minX: (LEVEL0_CHAIRS.x - CHAIR_STACK_HALF) * m,
            maxX: (LEVEL0_CHAIRS.x + CHAIR_STACK_HALF) * m,
            minZ: (LEVEL0_CHAIRS.z - CHAIR_STACK_HALF) * m,
            maxZ: (LEVEL0_CHAIRS.z + CHAIR_STACK_HALF) * m,
          },
    ],
    divert: (object, portable) =>
      reseat(object) || tossing.divert(object, portable),
    redirectDrop: (placement) =>
      ejectCabinetDrop(placement, {
        minX: LEVEL0_MACHINE.x - MCC_WIDTH / 2 - 0.05,
        maxX: LEVEL0_MACHINE.x + MCC_WIDTH / 2 + 0.05,
        back: LEVEL0_MACHINE.z - MCC_DEPTH - 0.05,
        front: LEVEL0_MACHINE.z + 0.08,
      }),
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  // As the machine nears breakdown the room grows strange (dev1's and
  // dev2's effects); when it breaks down, normality ensues.
  const strangeness = createLevel0Strangeness({
    renderer,
    scene,
    camera,
    metre: m,
    pose: () => ({
      x: walk.walker.x / m,
      z: walk.walker.z / m,
      yaw: walk.walker.yaw,
      pitch: walk.walker.pitch,
    }),
    // An apparition stands in the warehouse, clear of what stands in it.
    fits: (x, z) =>
      x > WAREHOUSE_BOUNDS.minX + 0.5 &&
      x < WAREHOUSE_BOUNDS.maxX - 0.5 &&
      z > WAREHOUSE_BOUNDS.minZ + 0.5 &&
      z < WAREHOUSE_BOUNDS.maxZ - 0.5 &&
      ![...roomSolids, ...footprints].some(
        (s) =>
          x * m > s.minX - 0.4 * m &&
          x * m < s.maxX + 0.4 * m &&
          z * m > s.minZ - 0.4 * m &&
          z * m < s.maxZ + 0.4 * m,
      ),
  });
  workstation.onSit(({ x, z, yaw, pitch, y }) =>
    walk.place(x, z, yaw, pitch, y),
  );
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  // The sky: overcast, sunny or night, drawn as the game starts (or as
  // `?sky=` asks), turned to hell by the dimensional shift near the end.
  let weather = pickWeather(new URLSearchParams(location.search).get('sky'));
  // Drawn by the courtyard's sky dome, round the camera inside its far
  // plane, so it shows through the skylights and the open doors.
  const dome = createSkyDome(80 * m);
  scene.add(dome.dome);
  let shownSky = '';
  /** Development: the sky held this far into hell (null: as it is). */
  let hellHeld: number | null = null;
  let skySeconds: number | null = null;
  const showSky = (seconds: number, hell: number) => {
    // The clouds drift on whatever happens; in hell they race.
    const dt = seconds - (skySeconds ?? seconds);
    skySeconds = seconds;
    dome.dome.position.copy(camera.position);
    dome.set(domeSky(weather, hell), Math.max(0, dt), seconds);
    // Hell's light breathes and gutters like a furnace.
    const flicker =
      hell > 0
        ? 1 +
          0.12 * hell * Math.sin(seconds * 2.3) +
          0.06 * hell * Math.sin(seconds * 7.9)
        : 1;
    const look = skyLook(weather, hell);
    look.daylight *= flicker;
    const key = `${weather}|${hell.toFixed(3)}|${flicker.toFixed(3)}`;
    if (key === shownSky) return;
    shownSky = key;
    lighting.setSky(look);
  };
  showSky(0, 0);
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    presence(delta, walk.walker.x / m, walk.walker.z / m);
    room.parts.update(delta);
    lighting.update();
    workstation.parts.update(delta);
    simulator.update(delta);
    tossing.update(delta);
    skipLamps?.update(time / 1000);
    machine.update(delta);
    symptoms.update(delta);
    failures.update(delta, symptoms.spill);
    strangeness.update(
      delta,
      Math.max(machine.plant.strain.value, symptoms.strain),
      machine.plant.brokenDown.value,
    );
    showSky(time / 1000, hellHeld ?? strangeness.level.hell);
    partAudio.listen(camera, m);
    machineSides.update(camera);
    culler.update();
    strangeness.render();
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    machine.dispose();
    failures.dispose();
    symptoms.dispose();
    strangeness.dispose();
    mcc.parts.dispose();
    room.parts.dispose();
    stopDiagnosticLink();
    workstation.dispose();
    simulator.dispose();
    skipLamps?.dispose();
    skipGraffiti?.dispose();
    scene.remove(skipModel.group, chairs);
    for (const root of [scene, skipModel.group, chairs])
      disposeKit(kit, root as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    dome.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { level0?: unknown }).level0;
  };
  // Development only: these bind no input.
  (window as unknown as { level0: unknown }).level0 = {
    world: machine.plant.graph,
    plant: machine.plant,
    machine,
    components: () =>
      mcc.components.map((device) => ({
        name: device.object.name,
        kind: device.kind,
        active: device.active.value,
        faulted: device.faulted.value,
      })),
    state: () => ({
      plc: machine.plant.plcStatus.value,
      dimension: machine.plant.achieved.value,
      allowed: machine.plant.allowed.value,
      faults: machine.plant.faults.value.map((f) => `${f.code} ${f.text}`),
      incident: machine.scheduler.incident,
      nextFailure: machine.scheduler.remaining,
      skip: Boolean(skip),
    }),
    /** Fail something now, as the scheduler would (`card:plc-cpu`, ...). */
    inflict: (id: string) => machine.inflict(id),
    view: (x: number, z: number, yaw = 0, pitch = 0) =>
      walk.place(x * m, z * m, yaw, pitch),
    conjureSkip,
    /** The building's services: its lighting zones, supply and emergency lighting. */
    building: building.model,
    /** The view now, as a PNG data URL `width` × `height` (development). */
    shot(width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // The sky as it is now, round where the camera is now.
      showSky(performance.now() / 1000, hellHeld ?? strangeness.level.hell);
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
    /** The building's supply under the machine's load (development). */
    supply: () => ({
      volts: building.model.power.supplyVolts.value,
      amps: machine.plant.loadAmps.value,
      overFor: supply.over,
      brownout: supply.brownout,
    }),
    /** Each batten's light, 0 to 1. */
    lights: () => room.lights.map((l) => Number(l.output().toFixed(2))),
    /** The scenario simulator's actions (development only). */
    scenarios,
    simulator,
    /** The sky: set a starting condition (overcast, sunny or night). */
    sky(next: Weather) {
      weather = next;
      return weather;
    },
    /** Hold the sky this far into hell, 0 to 1 (null lets it be). */
    hell(k: number | null) {
      hellHeld = k;
    },
    /** A frame's draw calls and objects, and how much detail is culled. */
    stats: () => ({
      ...renderer.info.render,
      objects: (() => {
        let count = 0;
        scene.traverse(() => count++);
        return count;
      })(),
      culled: culler.hidden(),
      cullable: culler.count(),
    }),
  };
  return Object.assign(dispose, {
    suspend() {
      // Leaving, the shared materials go back to normal for other rooms.
      strangeness.normal();
      mcc.parts.setAudible(false);
      room.parts.setAudible(false);
      workstation.setAudible(false);
    },
    resume() {
      mcc.parts.setAudible(true);
      room.parts.setAudible(true);
      workstation.setAudible(true);
    },
  });
}
