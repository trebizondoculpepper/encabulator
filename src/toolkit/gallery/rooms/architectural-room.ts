import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { ARCHITECTURAL_FITTINGS } from '../../components/architectural/logic/architectural-fittings';
import type { ArchitecturalKind } from '../../components/architectural/logic/architectural-fittings';
import { createArchitecturalServices } from '../../components/architectural/logic/warehouse-services';
import {
  HVAC_MODES,
  createBuildingServices,
} from '../../components/architectural/logic/building-services';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createCaption,
  createSectionBoard,
} from '../../components/core/views/signage';
import {
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { architecturalPart } from '../../components/architectural/parts/architectural-parts';
import {
  acCassette,
  acController,
  dimmer,
  distributionBoard,
  extractorFan,
  floorBox,
  fusedSpur,
  intercom,
  lightSwitch,
  occupancySensor,
  pullCordSwitch,
  radiator,
  thermostat,
  twinSocket,
  windowWithVent,
} from '../../components/architectural/parts/building-parts';
import {
  overDoorLight,
  toiletAlarmCord,
  toiletAlarmReset,
} from '../../components/general-safety/parts/safety-parts';
import {
  FIRE_KINDS,
  SHARED_KINDS,
  fittingCaption,
  showSpecimens,
} from './catalogue-specimens';
import type { SpecimenPlace } from './catalogue-specimens';
import { createFirstPerson } from '../../controls/input/first-person';
import { createPartSet } from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -12, maxX: 12, minZ: -9, maxZ: 9 };
const CEILING = 7;
/** The full-size doors, along the north wall, and where. */
const DOORS: { kind: ArchitecturalKind; x: number }[] = [
  { kind: 'escapedoor', x: -7.5 },
  { kind: 'loadingdoor', x: 0 },
  { kind: 'utilitydoor', x: 7.5 },
];
const WALL = 0.15;
/**
 * The catalogue specimens' places: two rows along the south wall, left to
 * right as seen, and a tall fitting either side of the doors.
 */
const PLACES: SpecimenPlace[] = [
  { x: -10.5, z: FLOOR.minZ, facing: 0, y: 1.5, tall: true },
  ...[2.3, 1.15].flatMap((y) =>
    [9, 6, 3, 0, -3, -6, -9].map((x) => ({
      x,
      z: FLOOR.maxZ,
      facing: Math.PI,
      y,
    })),
  ),
  { x: 10.5, z: FLOOR.minZ, facing: 0, y: 1.5, tall: true },
];
/**
 * Building fittings: the catalogue less its doors and dev8's active fire
 * safety, but with the emergency light and exit sign, which are lighting.
 */
const SPECIMENS = (
  Object.keys(ARCHITECTURAL_FITTINGS) as ArchitecturalKind[]
).filter(
  (kind) =>
    !DOORS.some((door) => door.kind === kind) &&
    (!FIRE_KINDS.includes(kind) || SHARED_KINDS.includes(kind)),
);
/** Ceiling fittings hang from a lowered raft at a room's usual height. */
const RAFT = 2.9;
const FACE = WALL + 0.004;
type Wall = 'east' | 'west';

/**
 * Dev18, Architectural Fittings: a plain box of a development room (not
 * the warehouse) showing every architectural fitting in the catalogue
 * (`src/toolkit/components/architectural/logic/architectural-fittings.ts`) at true size: the escape,
 * loading and utility doors full size along the north wall, and every
 * other fitting on a numbered board round the other walls at eye level,
 * labelled with its name and the product it copies. Each is the same
 * working part the warehouse installs (`architecturalPart`), on one shared
 * building-services model, so they work here too.
 */
export function startArchitecturalGalleryRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e8e6e0', 0.75));
  scene.add(new HemisphereLight('#f2f1ec', '#3a3a36', 0.8));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5d5f5c'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e6e4de'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  for (const x of [-8, 0, 8])
    for (const z of [-4.5, 4.5]) {
      const lamp = new PointLight('#fff6ea', 14, 14 * m);
      lamp.position.set(x * m, (CEILING - 0.25) * m, z * m);
      scene.add(lamp);
    }
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#efede8');
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
  const sign = createSectionBoard(kit, 'BUILDING FITTINGS', 4.4);
  sign.position.set(0, 3.0, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The catalogue's fittings --------------------------------------------
  const services = createArchitecturalServices();
  const parts = createPartSet();
  // The doors, full size, standing in the north wall.
  const north = new Group();
  north.position.set(0, 0, FLOOR.minZ + WALL);
  room.add(north);
  for (const { kind, x } of DOORS) {
    const part = parts.add(architecturalPart(kit, kind, services));
    part.object.position.set(x, 0, 0.04);
    north.add(part.object);
    fittingCaption(
      kit,
      north,
      kind,
      x,
      kind === 'loadingdoor' ? 5.6 : 2.5,
      kind === 'loadingdoor' ? 4 : 1.8,
    );
  }
  const numbered = showSpecimens(kit, room, parts, services, SPECIMENS, PLACES);

  // ---- The office building's services (from dev8) ---------------------------
  // The working fittings of a present-day English office, bound to their
  // building-services model: lighting, the accessible WC and an intercom
  // on the east wall; power and climate on the west. (The door released
  // in a fire stays in dev8, with the fire system.)
  const model = createBuildingServices();
  const L = model.lighting;
  const P = model.power;
  const C = model.climate;
  const S = model.sockets;
  const onWall = (object: Object3D, wall: Wall, along: number, y: number) => {
    const east = wall === 'east';
    object.position.set(east ? FLOOR.maxX - FACE : FLOOR.minX + FACE, y, along);
    object.rotation.y = east ? -Math.PI / 2 : Math.PI / 2;
    room.add(object);
    return object;
  };
  const fit = <T extends Part>(
    part: T,
    wall: Wall,
    along: number,
    y: number,
    text?: string,
    below = 0.1,
  ): T => {
    onWall(part.object, wall, along, y);
    parts.add(part);
    if (text) onWall(createCaption(kit, text), wall, along, y - below);
    return part;
  };
  const raftPaint = kitPaint(kit, '#ecebe5');
  const onRaft = <T extends Part>(part: T, x: number, z: number): T => {
    const raft = new Mesh(new BoxGeometry(1, 0.04, 1), raftPaint);
    raft.position.set(x, RAFT + 0.02, z);
    room.add(raft);
    part.object.position.set(x, RAFT, z);
    room.add(part.object);
    return parts.add(part);
  };
  const board = (title: string, wall: Wall, along: number, width: number) =>
    onWall(createSectionBoard(kit, title, width), wall, along, 2.45);

  // East wall: lighting, the accessible WC, the intercom.
  board('LIGHTING', 'east', -7.2, 2.6);
  fit(
    lightSwitch(kit, {
      name: 'light switch by the door',
      gangs: [L.switchDoor],
    }),
    'east',
    -8.1,
    1.2,
    'LIGHTS, TWO-WAY',
  );
  fit(dimmer(kit, { bound: L.dimmer }), 'east', -7.2, 1.2, 'DIMMER');
  fit(
    lightSwitch(kit, {
      name: 'light switch at the far end',
      gangs: [L.switchFar],
    }),
    'east',
    -6.3,
    1.2,
    'LIGHTS, OTHER END',
  );
  onRaft(occupancySensor(kit, { occupied: L.occupied }), 9.8, -7.2);
  board('ACCESSIBLE WC', 'east', -1.2, 3.6);
  fit(
    extractorFan(kit, { running: model.fan.running }),
    'east',
    -2.6,
    2.15,
    'EXTRACTOR, RUN-ON',
  );
  fit(
    toiletAlarmReset(kit, {
      on: model.welfare.wcAlarmOn,
      reset: model.welfare.resetWcAlarm,
    }),
    'east',
    -1.0,
    1.0,
    'ALARM RESET',
  );
  fit(
    overDoorLight(kit, { on: model.welfare.wcAlarmOn }),
    'east',
    0.3,
    2.2,
    'OVER-DOOR LIGHT',
  );
  onRaft(pullCordSwitch(kit, { bound: L.wcCord }), 10.6, -2.6);
  onRaft(toiletAlarmCord(kit, { pull: model.welfare.pullWcAlarm }), 10.6, -0.4);
  fit(intercom(kit), 'east', 4.6, 1.4, 'INTERCOM');

  // West wall: power and climate.
  board('POWER', 'west', 6.4, 2.7);
  fit(
    distributionBoard(kit, {
      main: P.main,
      circuits: [
        ['LIGHTS', P.lightingBreaker],
        ['SOCKETS', P.socketsBreaker],
        ['HVAC', P.hvacBreaker],
      ],
    }),
    'west',
    7.6,
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
    'west',
    6.2,
    0.45,
    'TWIN SOCKET, TESTERS IN',
  );
  fit(
    fusedSpur(kit, { bound: S.spur, live: S.spurLive }),
    'west',
    5.4,
    0.45,
    'FUSED SPUR',
  );
  const box = floorBox(kit);
  box.object.position.set(FLOOR.minX + 1.5, 0, 6.6);
  room.add(box.object);
  parts.add(box);
  board('CLIMATE', 'west', -1.4, 3.4);
  fit(
    acController(kit, {
      power: C.acPower,
      mode: C.acMode,
      setpoint: C.acSetpoint,
      modes: HVAC_MODES,
      temperature: C.temperature,
      running: C.acRunning,
    }),
    'west',
    3.0,
    1.5,
    'AIR CONDITIONING',
  );
  onRaft(acCassette(kit, { running: C.acRunning }), FLOOR.minX + 1.5, 2.4);
  fit(
    thermostat(kit, { bound: C.thermostat, calling: C.calling }),
    'west',
    2.0,
    1.5,
    'THERMOSTAT',
  );
  fit(radiator(kit, { valve: C.valve, heat: C.radiatorHot }), 'west', 0, 0);
  onWall(createCaption(kit, 'RADIATOR AND VALVE'), 'west', 0, 0.9);
  fit(
    windowWithVent(kit, { vent: C.vent, blinds: C.blindsOpen }),
    'west',
    -3.6,
    0.9,
  );
  onWall(createCaption(kit, 'WINDOW VENT AND BLINDS'), 'west', -3.6, 0.8);

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev18', devPortals('dev18', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, room], true)[0];
    if (hit && hit.distance > 4 * m) return null;
    if (!hit) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh) ?? parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: 0.12 },
  };
  // Facing each wall's fittings: the doors, the specimens, the office's.
  views.doors = { x: 0, z: 0, yaw: 0, pitch: 0.15 };
  views.specimens = { x: 0, z: 4 * m, yaw: Math.PI, pitch: 0.02 };
  views.office = { x: 7.5 * m, z: -1.5 * m, yaw: Math.PI / 2, pitch: 0.02 };
  views.power = { x: -7.5 * m, z: 2 * m, yaw: -Math.PI / 2, pitch: 0.02 };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => outer,
    use: (x, y) => portalAt(x, y)?.(),
    aimed: () => Boolean(portalAt(0, 0)),
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
  (window as unknown as { devFittingsGallery: unknown }).devFittingsGallery = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    model,
    fittings: () => numbered.map((k, i) => `${i + 1}. ${k}`),
  };

  // ---- Each frame -------------------------------------------------------------
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
    services.model.tick(delta);
    // The occupancy sensor sees anyone who moves or turns.
    const { x, z, yaw } = walk.walker;
    if (x !== seen.x || z !== seen.z || yaw !== seen.yaw) {
      L.motion();
      seen = { x, z, yaw };
    }
    model.tick(delta);
    parts.update(delta);
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
    delete (window as unknown as { devFittingsGallery?: unknown })
      .devFittingsGallery;
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
  });
}
