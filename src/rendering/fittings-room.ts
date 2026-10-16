import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { computed } from '@preact/signals-core';
import { partAudio } from '../audio/part-audio';
import {
  FIRE_SEAT,
  HVAC_MODES,
  SPRINKLER_HEADS,
  createBuildingServices,
} from '../game/building-services';
import { devPortals, devWalls } from '../game/dev-room-links';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import { createCaption, createSectionBoard } from '../scene/building-fittings';
import type { ExtinguisherKind } from '../scene/building-fittings';
import {
  createPanelKit,
  disposeKit,
  kitGlow,
  kitPaint,
} from '../scene/eighties-controls';
import { createPortals } from '../scene/portals';
import { knobDirection } from '../scene/rotary-knob';
import {
  accessDoor,
  burningBin,
  fireBell,
  voiceAlarm,
  acCassette,
  acController,
  callPoint,
  dimmer,
  distributionBoard,
  emergencyLight,
  exitSign,
  extinguisher,
  extractorFan,
  firePanel,
  floorBox,
  fusedSpur,
  heldFireDoor,
  intercom,
  keyPlate,
  lightSwitch,
  occupancySensor,
  overDoorLight,
  pullCordSwitch,
  radiator,
  smokeDetector,
  sounderBeacon,
  sprinklerHead,
  thermostat,
  toiletAlarmCord,
  toiletAlarmReset,
  twinSocket,
  valveSet,
  windowWithVent,
} from './building-parts';
import { createFirstPerson } from './first-person';
import { createPartSet, pushButton } from './parts';
import type { Part } from './parts';
import { ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** The room's plan, metres: walls on these lines, the ceiling this high. */
const BOUNDS = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
const CEILING = 2.7;
/** The walls' inner faces, and a few millimetres off them for what hangs there. */
const FACE = 0.15 + 0.004;

type Wall = 'north' | 'south' | 'east' | 'west';

/**
 * Dev8, Building Fittings: the fittings of a present-day English office
 * building, each a working part, all wired to one world model of the
 * room's building services (`src/game/building-services.ts`), so that
 * they do what they would in a real building. Lighting on the north wall
 * (two-way switching, a dimmer, the emergency lighting test key, the exit
 * sign) with the accessible WC beside it (its pull-cord light and
 * extractor, and its emergency alarm); fire on the east wall (the panel,
 * a call point, a sounder-beacon, a smoke detector and its TEST SMOKE
 * button, the pre-action sprinklers and their valve set, extinguishers,
 * a fire door on its holder); power and climate on the south wall (the
 * distribution board, sockets, a fused spur and a floor box, the air
 * conditioning, a thermostat, a radiator, a window with its vent and
 * blinds, and the far-end light switch); access on the west wall (a card
 * reader, push-to-exit, an emergency door release and an intercom). The
 * room's own lights are the model's: switch them off and it is dark but
 * for the exit sign and whatever else is lit.
 */
export function startFittingsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.12);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  const ambient = new AmbientLight('#e9ece9', 0.05);
  const sky = new HemisphereLight('#dfe4ea', '#4a4a44', 0.05);
  scene.add(ambient, sky);
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const model = createBuildingServices();
  const parts = createPartSet();

  // ---- The room --------------------------------------------------------
  const W = BOUNDS.maxX - BOUNDS.minX;
  const D = BOUNDS.maxZ - BOUNDS.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#7f888b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e9e7df'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const wallPaint = kitPaint(kit, '#e6e2d6');
  const bounds: Footprint = {
    minX: BOUNDS.minX * m,
    maxX: BOUNDS.maxX * m,
    minZ: BOUNDS.minZ * m,
    maxZ: BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  // The ceiling lights: glowing panels, and point lights, both as bright
  // as the model says.
  const panel = kitGlow(kit, '#f4f6ef');
  const panels: { x: number; z: number }[] = [];
  for (const x of [-7.5, -2.5, 2.5, 7.5])
    for (const z of [-3.5, 0.5, 4.5]) {
      panels.push({ x, z });
      const mesh = new Mesh(new PlaneGeometry(0.6, 0.6), panel);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, CEILING - 0.004, z);
      room.add(mesh);
    }
  const lights = panels
    .filter((_, i) => i % 2 === 0)
    .map(({ x, z }) => {
      const light = new PointLight('#f3f5ee', 0, 12 * m);
      light.position.set(x * m, (CEILING - 0.3) * m, z * m);
      scene.add(light);
      return light;
    });
  const emergencyLamps = [
    [-6, 0],
    [6, 0],
  ].map(([x, z]) => {
    const light = new PointLight('#ffffff', 0, 9 * m);
    light.position.set(x * m, (CEILING - 0.2) * m, z * m);
    scene.add(light);
    return { x, z, light };
  });
  const wcLamp = new PointLight('#fff4e0', 0, 5 * m);
  wcLamp.position.set(3 * m, (CEILING - 0.3) * m, -6.5 * m);
  scene.add(wcLamp);
  const wcPanel = new Mesh(
    new PlaneGeometry(0.4, 0.4),
    kitGlow(kit, '#fff4e0') as MeshBasicMaterial,
  );
  wcPanel.rotation.x = Math.PI / 2;
  wcPanel.position.set(3, CEILING - 0.004, -6.5);
  room.add(wcPanel);

  // ---- Placing parts ---------------------------------------------------
  const wallAt = (wall: Wall, along: number, y: number) => {
    if (wall === 'north') return { x: along, y, z: BOUNDS.minZ + FACE, yaw: 0 };
    if (wall === 'south')
      return { x: along, y, z: BOUNDS.maxZ - FACE, yaw: Math.PI };
    if (wall === 'east')
      return { x: BOUNDS.maxX - FACE, y, z: along, yaw: -Math.PI / 2 };
    return { x: BOUNDS.minX + FACE, y, z: along, yaw: Math.PI / 2 };
  };
  const onWall = (object: Object3D, wall: Wall, along: number, y: number) => {
    const at = wallAt(wall, along, y);
    object.position.set(at.x, at.y, at.z);
    object.rotation.y = at.yaw;
    room.add(object);
    return object;
  };
  /** A part on a wall, with a caption under it. */
  const fit = <P extends Part>(
    part: P,
    wall: Wall,
    along: number,
    y: number,
    caption?: string,
    below = 0.1,
  ): P => {
    onWall(part.object, wall, along, y);
    parts.add(part);
    if (caption) onWall(createCaption(kit, caption), wall, along, y - below);
    // The caption's group is not the part: give it a nudge off the wall.
    return part;
  };
  const onCeiling = <P extends Part>(part: P, x: number, z: number): P => {
    part.object.position.set(x, CEILING, z);
    room.add(part.object);
    return parts.add(part);
  };
  const board = (title: string, wall: Wall, along: number, width: number) =>
    onWall(createSectionBoard(kit, title, width), wall, along, 2.45);

  // ---- North wall: lighting, and the accessible WC ---------------------
  const L = model.lighting;
  board('LIGHTING', 'north', -6.5, 4);
  fit(
    lightSwitch(kit, {
      name: 'light switch by the door',
      gangs: [L.switchDoor],
    }),
    'north',
    -9.5,
    1.2,
    'LIGHTS, TWO-WAY',
  );
  fit(dimmer(kit, { bound: L.dimmer }), 'north', -8.6, 1.2, 'DIMMER');
  fit(
    keyPlate(kit, {
      legend: 'EMERGENCY LIGHTING TEST',
      bound: L.emergencyTest,
    }),
    'north',
    -7.7,
    1.2,
    'TEST KEY SWITCH',
  );
  fit(exitSign(kit, { level: L.exitSign }), 'north', -5.2, 2.15);
  onCeiling(occupancySensor(kit, { occupied: L.occupied }), 0, -1);
  for (const { x, z } of emergencyLamps)
    onCeiling(
      emergencyLight(kit, { lit: L.emergencyLit, charging: L.charging }),
      x,
      z,
    );
  board('ACCESSIBLE WC', 'north', 5.5, 4.4);
  onCeiling(pullCordSwitch(kit, { bound: L.wcCord }), 2.2, -7.5);
  fit(
    extractorFan(kit, { running: model.fan.running }),
    'north',
    3.4,
    2.15,
    'EXTRACTOR, RUN-ON',
  );
  onCeiling(
    toiletAlarmCord(kit, { pull: model.welfare.pullWcAlarm }),
    5.2,
    -7.5,
  );
  fit(
    toiletAlarmReset(kit, {
      on: model.welfare.wcAlarmOn,
      reset: model.welfare.resetWcAlarm,
    }),
    'north',
    6.2,
    1.0,
    'ALARM RESET',
  );
  fit(
    overDoorLight(kit, { on: model.welfare.wcAlarmOn }),
    'north',
    7.6,
    2.2,
    'OVER-DOOR LIGHT',
  );

  // ---- East wall: fire -------------------------------------------------
  const F = model.fire;
  board('FIRE', 'east', -3.5, 3);
  fit(
    firePanel(kit, {
      lamps: F.panelLamps,
      key: F.panelKey,
      silence: F.silence,
      reset: F.reset,
      evacuate: F.evacuate,
    }),
    'east',
    -6.2,
    1.5,
    'FIRE ALARM PANEL',
    0.24,
  );
  fit(
    callPoint(kit, {
      latched: F.callPoint,
      press: F.pressCallPoint,
      reset: F.resetCallPoint,
    }),
    'east',
    -4.8,
    1.4,
    'CALL POINT (KEY TO RESET)',
  );
  // The voice alarm does the talking; the sounder-beacons only flash.
  fit(
    sounderBeacon(kit, { sounding: F.sounding, voice: false }),
    'east',
    -4.0,
    2.2,
  );
  onCeiling(
    voiceAlarm(kit, { voice: F.voice, announcement: F.announcement }),
    6.5,
    -2,
  );
  // The joke: a waste-paper bin under the smoke detector, and a button on
  // a pedestal beside it that sets it alight.
  const bin = burningBin(kit, { size: F.flames, smoke: F.smokeShown });
  bin.object.position.set(FIRE_SEAT.x, 0, FIRE_SEAT.z);
  room.add(bin.object);
  parts.add(bin);
  onCeiling(
    smokeDetector(kit, { alarm: F.detector }),
    FIRE_SEAT.x,
    FIRE_SEAT.z,
  );
  const pedestal = new Mesh(
    new BoxGeometry(0.3, 1.0, 0.3),
    kitPaint(kit, '#5d625f'),
  );
  pedestal.position.set(FIRE_SEAT.x - 0.4, 0.5, FIRE_SEAT.z + 1.4);
  room.add(pedestal);
  const light = pushButton(kit, {
    colour: 'red',
    legend: 'LIGHT THE BIN',
    name: 'LIGHT THE BIN push button',
    action: F.startFire,
  });
  light.object.scale.setScalar(2.2);
  light.object.position.set(FIRE_SEAT.x - 0.4, 1.0, FIRE_SEAT.z + 1.4);
  light.object.rotation.x = -Math.PI / 2;
  room.add(light.object);
  parts.add(light);
  const glow = new PointLight('#ff8a3a', 0, 6 * m);
  glow.position.set(FIRE_SEAT.x * m, 0.8 * m, FIRE_SEAT.z * m);
  scene.add(glow);
  fit(
    valveSet(kit, {
      main: F.riserValve,
      tripped: computed(() => F.heads.value.some((h) => h.burst)),
      reset: F.resetSprinklers,
    }),
    'east',
    -1.6,
    0,
  );
  onWall(createCaption(kit, 'SPRINKLER VALVE SET'), 'east', -1.6, 0.35);
  fit(fireBell(kit, { ringing: F.discharging }), 'east', -2.6, 2.2);
  onWall(createCaption(kit, 'SPRINKLER ALARM BELL'), 'east', -2.6, 2.03);
  SPRINKLER_HEADS.forEach(({ x, z }, i) =>
    onCeiling(
      sprinklerHead(kit, {
        head: computed(() => F.heads.value[i]),
        voice: i === 0,
      }),
      x,
      z,
    ),
  );
  (['water', 'foam', 'co2', 'powder'] as ExtinguisherKind[]).forEach(
    (kind, i) => fit(extinguisher(kit, { kind }), 'east', 0.2 + i * 0.6, 0),
  );
  fit(heldFireDoor(kit, { held: F.doorsHeld }), 'east', 4.2, 0);
  onWall(createCaption(kit, 'FIRE DOOR ON HOLDER'), 'east', 4.2, 2.3);
  // A second sounder-beacon, silent, on the west wall.
  fit(
    sounderBeacon(kit, { sounding: F.sounding, voice: false }),
    'west',
    2.5,
    2.2,
  );

  // ---- South wall: power and climate -----------------------------------
  const P = model.power;
  const C = model.climate;
  const S = model.sockets;
  board('POWER', 'south', -7.5, 3);
  fit(
    distributionBoard(kit, {
      main: P.main,
      circuits: [
        ['LIGHTS', P.lightingBreaker],
        ['SOCKETS', P.socketsBreaker],
        ['HVAC', P.hvacBreaker],
      ],
    }),
    'south',
    -9.2,
    1.7,
    'DISTRIBUTION BOARD',
    0.22,
  );
  fit(
    twinSocket(kit, {
      left: S.socketLeft,
      right: S.socketRight,
      live: S.socketsLive,
    }),
    'south',
    -7.6,
    0.45,
    'TWIN SOCKET, TESTERS IN',
  );
  fit(
    fusedSpur(kit, { bound: S.spur, live: S.spurLive }),
    'south',
    -6.8,
    0.45,
    'FUSED SPUR',
  );
  const box = floorBox(kit);
  box.object.position.set(-7.2, 0, 6.3);
  room.add(box.object);
  parts.add(box);
  fit(
    lightSwitch(kit, {
      name: 'light switch at the far end',
      gangs: [L.switchFar],
    }),
    'south',
    -5.4,
    1.2,
    'LIGHTS, TWO-WAY',
  );
  board('CLIMATE', 'south', 1.5, 3.4);
  fit(
    acController(kit, {
      power: C.acPower,
      mode: C.acMode,
      setpoint: C.acSetpoint,
      modes: HVAC_MODES,
      temperature: C.temperature,
      running: C.acRunning,
    }),
    'south',
    -3.6,
    1.5,
    'AIR CONDITIONING',
  );
  onCeiling(acCassette(kit, { running: C.acRunning }), -3, 5);
  fit(
    thermostat(kit, { bound: C.thermostat, calling: C.calling }),
    'south',
    -2.6,
    1.5,
    'THERMOSTAT',
  );
  fit(radiator(kit, { valve: C.valve, heat: C.radiatorHot }), 'south', -0.4, 0);
  onWall(createCaption(kit, 'RADIATOR AND VALVE'), 'south', -0.4, 0.9);
  fit(
    windowWithVent(kit, { vent: C.vent, blinds: C.blindsOpen }),
    'south',
    3.6,
    0.9,
  );
  onWall(createCaption(kit, 'WINDOW VENT AND BLINDS'), 'south', 3.6, 0.8);

  // ---- West wall: access -----------------------------------------------
  const A = model.access;
  board('ACCESS', 'west', -2, 3);
  fit(
    accessDoor(kit, {
      locked: A.locked,
      open: A.doorOpen,
      broken: A.breakGlass,
      card: A.presentCard,
      exit: A.pushToExit,
      breakGlass: A.breakDoorRelease,
      resetGlass: A.resetDoorRelease,
      work: A.workDoor,
    }),
    'west',
    -2.2,
    0,
  );
  fit(intercom(kit), 'west', -0.6, 1.4, 'INTERCOM');

  // ---- Walking and working ---------------------------------------------
  const portals = createPortals('dev8', devPortals('dev8', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([room, portals.group], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    overview: { x: 0, z: 5 * m, yaw: 0, pitch: 0.05 },
    lighting: { x: -2 * m, z: -4.5 * m, yaw: 0, pitch: 0.05 },
    fire: { x: 8 * m, z: -2.5 * m, yaw: Math.PI / 2, pitch: 0.05 },
    power: { x: -5 * m, z: 4.5 * m, yaw: Math.PI, pitch: 0 },
    access: { x: -8.5 * m, z: -1.5 * m, yaw: -Math.PI / 2, pitch: 0 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.overview,
    solids: () => outer,
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
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
  (window as unknown as { devFittings: unknown }).devFittings = {
    model,
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    parts: () => [...parts.uses.keys()].map((o) => o.name).filter(Boolean),
  };

  // ---- Each frame --------------------------------------------------------
  let last = 0;
  let seen = { x: NaN, z: NaN, yaw: NaN };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    // The occupancy sensor sees anyone who moves or turns.
    const { x, z, yaw } = walk.walker;
    if (x !== seen.x || z !== seen.z || yaw !== seen.yaw) {
      L.motion();
      seen = { x, z, yaw };
    }
    model.tick(delta);
    parts.update(delta);
    const level = L.roomLight.value;
    panel.color.setScalar(0.12 + 0.88 * level);
    for (const light of lights) light.intensity = level * 1.6 * m * m;
    ambient.intensity = 0.04 + level * 0.5;
    sky.intensity = 0.04 + level * 0.6;
    for (const { light } of emergencyLamps)
      light.intensity = L.emergencyLit.value ? 0.8 * m * m : 0;
    wcLamp.intensity = L.wcLight.value ? 0.6 * m * m : 0;
    glow.intensity =
      F.flames.value > 0
        ? (0.4 + F.flames.value * 2) * m * m * (0.85 + Math.random() * 0.3)
        : 0;
    (wcPanel.material as MeshBasicMaterial).color.setScalar(
      L.wcLight.value ? 1 : 0.15,
    );
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devFittings?: unknown }).devFittings;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
