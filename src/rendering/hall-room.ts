import { createRenderer } from './render-style';
import {
  Box3,
  Color,
  CubeCamera,
  DirectionalLight,
  Fog,
  Group,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Vector2,
  WebGLCubeRenderTarget,
} from 'three';
import type { Object3D } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { kelvinToRgb } from '../game/colour-temperature';
import { HALL, STATION_ROOMS } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { METRE } from '../game/units';
import { createDoorStation } from '../scene/door-station';
import { createFloorReflection } from '../scene/floor-reflection';
import {
  HALL_LENGTH,
  HALL_WIDTH,
  NAVE_WIDTH,
  createIndustrialHall,
} from '../scene/industrial-hall';
import {
  FINISHES,
  HALL_SURFACES,
  createSurface,
  disposeFinishTextures,
} from '../scene/hall-surfaces';
import type { HallSurface, Surface } from '../scene/hall-surfaces';
import { CONTAINER, createProps } from '../scene/warehouse-props';
import { createFirstPerson } from './first-person';
import { ps1Uniforms } from './ps1-material';
import { createHallConsole, loadHallSettings } from './hall-console';
import type { HallSettings } from './hall-console';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { knobDirection } from '../scene/rotary-knob';

/**
 * Dev4, the Hall: the great enclosed concrete hall the game will take
 * place in (`src/scene/industrial-hall.ts`), to try out the environment.
 * Polished concrete reflects the skylights, windows and lamps (an
 * environment map taken in the hall), overcast daylight blooms white and
 * a haze gives the distance depth. A door station in the middle of the
 * nave leads to the other dev rooms. Around the edges stand the plant's
 * ephemera: shipping containers, palletised cargo, drums and IBC totes,
 * a forklift and the janitor's things. A console desk by the door station
 * sets the building's materials, the floor's shine and the light.
 */
export function startHallRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setClearColor('#d8dadb');
  const fog = new Fog('#d4d7d8', 45 * m, 260 * m);
  scene.fog = fog;
  const camera = new PerspectiveCamera(60, 1, 0.05, 400 * m);
  // Daylight: the overcast sky from above. Lamps: their fill from the
  // ceilings, and a key straight down.
  const daylight = new HemisphereLight('#f4f7fa', '#77756f', 2.2);
  const skyKey = new DirectionalLight('#eef2f6', 0.8);
  skyKey.position.set(-30 * m, 80 * m, 20 * m);
  const lampFill = new HemisphereLight('#ffe7c8', '#4a4740', 0.9);
  const lampKey = new DirectionalLight('#ffe7c8', 0.6);
  lampKey.position.set(10 * m, 60 * m, -5 * m);
  scene.add(daylight, skyKey, lampFill, lampKey);

  const settings = loadHallSettings();
  const surfaces = Object.fromEntries(
    HALL_SURFACES.map((s) => [s, createSurface(s, m)]),
  ) as Record<HallSurface, Surface>;
  const hall = createIndustrialHall(surfaces);
  hall.group.scale.setScalar(m);
  scene.add(hall.group);

  // The polished floor's shine: the hall reflected in it.
  const shine = createFloorReflection(HALL_LENGTH * m, HALL_WIDTH * m);
  shine.mesh.position.y = 0.004 * m;
  scene.add(shine.mesh);
  // The planar reflection gives the floor its shine; the environment map
  // only its soft fill.
  surfaces.floor.material.envMapIntensity = 0.35;

  // The door station in the middle of the nave.
  const station = createDoorStation(HALL, STATION_ROOMS, m);
  scene.add(station.group);

  // ---- The ephemera round the edges, in metres ---------------------------
  const props = createProps();
  const propGroup = new Group();
  propGroup.scale.setScalar(m);
  scene.add(propGroup);
  const propSolids: Footprint[] = [];
  const put = (object: Object3D, x: number, z: number, yaw = 0) => {
    object.position.set(x, 0, z);
    object.rotation.y = yaw;
    propGroup.add(object);
    propGroup.updateMatrixWorld(true);
    const b = new Box3().setFromObject(object);
    propSolids.push({
      minX: b.min.x - 0.1,
      maxX: b.max.x + 0.1,
      minZ: b.min.z - 0.1,
      maxZ: b.max.z + 0.1,
    });
  };
  const northWall = -HALL_WIDTH / 2 + 1.2;
  const southWall = HALL_WIDTH / 2 - 1.2;
  // Containers along the north wall, end to end, doors to the east.
  const containerColours = [
    '#8b3a2b',
    '#2e5d8f',
    '#4f6f3a',
    '#a9a59a',
    '#c47a1f',
  ];
  let cx = -HALL_LENGTH / 2 + 4;
  [CONTAINER.long, CONTAINER.short, CONTAINER.long, CONTAINER.short].forEach(
    (length, i) => {
      put(
        props.container(length, containerColours[i]),
        cx + length,
        northWall + CONTAINER.width / 2,
        Math.PI / 2,
      );
      cx += length + 1.5;
    },
  );
  // One more at the far east end of the south side hall.
  put(
    props.container(CONTAINER.long, containerColours[4]),
    HALL_LENGTH / 2 - 3,
    southWall - 8,
    0,
  );
  // Palletised cargo: shrink-wrapped cartons along the north wall.
  for (let i = 0; i < 10; i++)
    put(
      props.cartons(2 + (i % 3), i + 1),
      4 + (i % 5) * 1.5,
      northWall + 0.7 + Math.floor(i / 5) * 1.3,
    );
  // Drums and IBC totes: a chemical store at the west end of the south hall.
  ['#1f4f8f', '#1a1a1a', '#b52a1d', '#1f4f8f'].forEach((colour, i) =>
    put(
      props.drumPallet(colour),
      -HALL_LENGTH / 2 + 3 + i * 1.5,
      southWall - 0.6,
    ),
  );
  for (let i = 0; i < 6; i++)
    put(
      props.ibc(0.3 + (i % 3) * 0.25),
      -HALL_LENGTH / 2 + 3 + i * 1.35,
      southWall - 2.3,
    );
  ['#1f4f8f', '#3c6e3c', '#1a1a1a', '#1f4f8f', '#d0d0c8'].forEach((colour, i) =>
    put(
      props.drum(colour),
      -HALL_LENGTH / 2 + 10 + (i % 3) * 0.62,
      southWall - 0.6 - Math.floor(i / 3) * 0.62,
    ),
  );
  // More cargo, and the forklift that moves it, in the south hall.
  for (let i = 0; i < 8; i++)
    put(
      props.cartons(1 + (i % 4), i + 20),
      20 + (i % 4) * 1.5,
      southWall - 0.7 - Math.floor(i / 4) * 1.3,
    );
  put(props.forklift(0.1), 16, southWall - 6, Math.PI * 0.85);
  put(props.pallet(), 26, southWall - 4.5);
  // The janitor's things, by columns on either side of the nave.
  put(props.janitorial(), -9, -NAVE_WIDTH / 2 - 2.2, 0.3);
  put(props.janitorial(), 52, NAVE_WIDTH / 2 + 2.2, Math.PI + 0.4);

  // Plant and machinery in the background, round the side halls' walls;
  // the nave's middle is left clear for the game.
  for (let i = 0; i < 3; i++)
    put(props.racking(3, 3, i + 1), 18 + i * 8.6, northWall + 0.35);
  put(props.scissorLift(4.2), 31, northWall + 9, 0.3);
  put(props.boomLift(9.5), 52, northWall + 8, -0.6);
  put(props.switchgear(6), 62, northWall + 0.3);
  put(props.transformer(), 68.6, northWall + 0.4);
  put(props.bollards(5, 1.3), 62, northWall + 2.2);
  put(props.dumpster(), -6, northWall + 0.5);
  put(props.rollingLadder(8), 44, northWall + 3.2, Math.PI);
  for (let i = 0; i < 3; i++)
    put(props.racking(3, 3, i + 7), 34 + i * 8.6, southWall - 0.35, Math.PI);
  put(props.compressor(), -52, southWall - 0.6, Math.PI);
  put(props.gasCage(), -46, southWall - 0.6, Math.PI);
  put(props.workshop(), -38, southWall - 0.5, Math.PI);
  put(props.scissorLift(0, '#2a5fa8'), -2, southWall - 4, 1.2);
  put(props.scissorLift(5.5, '#c8261c'), 48, southWall - 7, -0.2);
  put(props.boomLift(5.5, '#e1a915'), -22, southWall - 7, 2.6);
  put(props.palletJack(), 25, southWall - 3.5, 0.6);
  put(props.bollards(3, 1.3), -46, southWall - 2.2);

  // ---- Reflections: the hall seen from its middle, for the floor ---------
  const pmrem = new PMREMGenerator(renderer);
  let environment: ReturnType<PMREMGenerator['fromCubemap']> | null = null;
  const reflect = () => {
    const target = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
    const cube = new CubeCamera(0.1 * m, 400 * m, target);
    cube.position.set(0, 1.6 * m, 12 * m);
    scene.environment = null;
    shine.mesh.visible = false;
    cube.update(renderer, scene);
    shine.mesh.visible = settings.floorShine > 0.001;
    environment?.dispose();
    environment = pmrem.fromCubemap(target.texture);
    target.dispose();
    scene.environment = environment.texture;
  };

  // Bloom, so the skylights, windows and lamps glare.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.55, 0.6, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /** Put the settings into the materials and lights. */
  const apply = (s: HallSettings) => {
    for (const surface of HALL_SURFACES) {
      const want = s.materials[surface];
      const made = surfaces[surface];
      const finish = FINISHES[surface][want.finish] ?? FINISHES[surface][0];
      if (made.finish.name !== finish.name) made.setFinish(finish.name);
      made.setColour(
        new Color(finish.colour).multiplyScalar(want.shade).getStyle(),
      );
      made.setRoughness(want.roughness);
      made.setMetalness(want.metalness);
    }
    const sky = new Color(...kelvinToRgb(s.skyKelvin));
    const lampColour = new Color(...kelvinToRgb(s.lampKelvin));
    hall.sky.color.copy(sky).multiplyScalar(1.7 * s.skyIntensity);
    hall.lampGlow.color.copy(lampColour).multiplyScalar(2.2 * s.lampIntensity);
    hall.lampLining.color
      .setRGB(1.2, 0.62, 0.3)
      .multiply(lampColour)
      .multiplyScalar(0.9 * s.lampIntensity);
    daylight.color.copy(sky);
    daylight.intensity = 2.2 * s.skyIntensity;
    skyKey.color.copy(sky);
    skyKey.intensity = 0.8 * s.skyIntensity;
    lampFill.color.copy(lampColour);
    lampFill.intensity = 0.9 * s.lampIntensity;
    lampKey.color.copy(lampColour);
    lampKey.intensity = 0.6 * s.lampIntensity;
    shine.setStrength(s.floorShine);
    shine.setBlur(s.floorBlur);
    bloom.strength = s.bloom;
    fog.near = (90 - 70 * s.haze) * m;
    fog.far = (520 - 420 * s.haze) * m;
  };
  apply(settings);
  reflect();
  let reflectTimer = 0;
  // The console desk, a few metres from the door station, its panel
  // facing the doors.
  const kit = createPanelKit();
  const desk = createHallConsole(kit, settings, () => {
    apply(settings);
    window.clearTimeout(reflectTimer);
    reflectTimer = window.setTimeout(reflect, 400);
  });
  desk.group.scale.setScalar(m);
  desk.group.position.set(0, 0, 6.5 * m);
  desk.group.rotation.y = Math.PI;
  scene.add(desk.group);
  const deskSolid: Footprint = {
    minX: -desk.width / 2 - 0.2,
    maxX: desk.width / 2 + 0.2,
    minZ: 6.5 - 0.3,
    maxZ: 6.5 + desk.depth + 0.2,
  };
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const use = (x: number, y: number) => {
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...desk.uses.keys()], true)[0];
    if (!hit) return;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = desk.uses.get(o);
      if (work) return work(knobDirection(o, hit.point, camera));
    }
  };

  const notes = document.createElement('div');
  notes.id = 'hall-notes';
  notes.textContent =
    "DEV4 · The Hall: the door station in the middle of the nave leads to the other dev rooms · the console desk sets materials and light (click a knob's left half to turn it down, right half up) · WASD: walk · Shift: run · Esc: cursor";
  Object.assign(notes.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: 'calc(100% - 320px)',
    padding: '10px',
    background: '#20302bdd',
    color: '#e8e2cc',
    font: '13px monospace',
  });
  canvas.parentElement?.append(notes);

  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    fov: 60,
    start: station.arrival(params.get('from')) ?? {
      x: 0,
      z: 14 * m,
      yaw: 0,
      pitch: 0.05,
    },
    solids: () => [
      ...[...hall.solids, ...propSolids, deskSolid].map((s) => ({
        minX: s.minX * m,
        maxX: s.maxX * m,
        minZ: s.minZ * m,
        maxZ: s.maxZ * m,
      })),
      ...station.solids(),
    ],
    use,
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    shine.setSize(Math.round(width * 0.75), Math.round(height * 0.75));
    ps1Uniforms.resolution.value.set(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  (window as unknown as { devHall: unknown }).devHall = {
    /** Stand with the eye at (x, y, z), looking at (tx, ty, tz), in metres. */
    view(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
      const dx = tx - x;
      const dz = tz - z;
      walk.place(
        x * m,
        z * m,
        Math.atan2(dx, -dz),
        Math.atan2(ty - y, Math.hypot(dx, dz)),
        y * m,
      );
    },
    /** Change settings as the panel would, e.g. `{ lampKelvin: 2700 }`. */
    set(partial: Partial<HallSettings>) {
      Object.assign(settings, partial);
      apply(settings);
      reflect();
    },
    settings: () => structuredClone(settings),
  };

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
    station.update(delta, walk.walker.x, walk.walker.z);
    desk.update(delta);
    composer.render();
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    window.clearTimeout(reflectTimer);
    walk.dispose();
    station.dispose();
    disposeKit(kit, desk.group);
    notes.remove();
    hall.dispose();
    shine.dispose();
    props.dispose();
    for (const s of Object.values(surfaces)) s.material.dispose();
    disposeFinishTextures();
    environment?.dispose();
    pmrem.dispose();
    composer.dispose();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose = station.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
