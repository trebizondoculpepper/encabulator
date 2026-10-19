import { computed, effect, signal } from '@preact/signals-core';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
} from 'three';
import { Group } from 'three';
import type { Object3D } from 'three';
import { SKY_IDS, createSkyChanger, sunDirection } from '../game/skies';
import type { SkyId } from '../game/skies';
import {
  COURTYARD_HALF,
  COURTYARD_HEIGHT,
  createDevCourtyard,
} from '../scene/dev-courtyard';
import { createSkyDome } from '../scene/sky-dome';
import { METRE } from '../toolkit/components/core/logic/units';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { enterDevRoom } from '../toolkit/gallery/logic/dev-room-links';
import { courtyardLink } from '../game/courtyard-link';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import {
  potentiometer,
  pushButton,
  selector,
} from '../toolkit/components/core/parts/parts';
import { lightSwitch } from '../toolkit/components/architectural/parts/building-parts';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

/** The views to start from, by name (`?view=`), metres and radians. */
export const COURTYARD_VIEWS: Record<
  string,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  start: { x: 0, z: COURTYARD_HALF - 2, yaw: 0, pitch: 0.1 },
  up: { x: 0, z: 0, yaw: 0, pitch: 1.2 },
  smoking: { x: -2, z: -2, yaw: -Math.PI * 0.75, pitch: 0 },
  pedestal: { x: 3, z: 3.9, yaw: 0, pitch: -0.75 },
};

/** Where the control pedestal stands, and which way it faces (to +z). */
const PEDESTAL = { x: 3, z: 3, yaw: 0 };
/** Its buttons: the owner's three ambient settings. */
const PEDESTAL_SKIES: readonly {
  id: SkyId;
  legend: string;
  colour: 'green' | 'black' | 'red' | 'blue';
}[] = [
  { id: 'overcast', legend: 'OVERCAST', colour: 'black' },
  { id: 'cumulus', legend: 'FLUFFY CLOUDS', colour: 'green' },
  { id: 'quake', legend: 'HELL', colour: 'red' },
  { id: 'night', legend: 'NIGHT', colour: 'blue' },
];

/**
 * dev_courtyard: the light well in the middle of the office block, open to
 * the sky (`src/scene/dev-courtyard.ts`), the dev room for skies. Over it,
 * a sky dome (`src/scene/sky-dome.ts`) shows the chosen sky
 * (`src/game/skies.ts`): UK GREY by default, BLUE, FLUFFY CLOUDS, QUAKE
 * (layers of racing purple noise over a purple sky) and the rest; the sun,
 * its shadows and the light on the courtyard follow it, and a change of
 * sky takes a few seconds. A control pedestal in the courtyard has a
 * button for each of the three ambient settings: OVERCAST, FLUFFY CLOUDS
 * and HELL (the others are for development). Its four spring doors lead back to the corridor's four
 * sides; for now they open onto dark lobbies, and only one is open at once.
 */
export function startDevCourtyardRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.shadowMap.enabled = true;
  const freeEnvironment = useEnvironment(renderer, scene, 0.15);
  const camera = new PerspectiveCamera(62, 1, 0.05, 400 * m);
  const kit = createPanelKit();
  const courtyard = createDevCourtyard(kit);
  courtyard.group.scale.setScalar(m);
  scene.add(courtyard.group);

  // ---- The sky and its light ----------------------------------------------
  const sky = createSkyDome(300 * m);
  scene.add(sky.dome);
  const changer = createSkyChanger(
    (new URLSearchParams(location.search).get('sky') as SkyId | null) ??
      'overcast',
  );
  if (!SKY_IDS.includes(changer.target)) changer.choose('overcast');
  const hemisphere = new HemisphereLight('#ffffff', '#5a574f', 1);
  const ambient = new AmbientLight('#ffffff', 0.2);
  const sun = new DirectionalLight('#ffffff', 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -14 * m,
    right: 14 * m,
    top: 14 * m,
    bottom: -14 * m,
    near: m,
    far: 60 * m,
  });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02 * m;
  scene.add(hemisphere, ambient, sun, sun.target);
  const lightFor = (time: number, dt: number) => {
    let now = changer.step(dt);
    // HELL's own controls on the pedestal, as far as HELL is showing.
    if (now.quake > 0) {
      const q = now.quake;
      now = {
        ...now,
        layers: now.layers + (hellLayers() - now.layers) * q,
        layerSpeed: now.layerSpeed + (hellSpeed() - now.layerSpeed) * q,
      };
    }
    sky.set(now, dt, time, hellSpread() * now.quake);
    const d = sunDirection(now);
    sun.position.set(d.x * 30 * m, d.y * 30 * m, d.z * 30 * m);
    sun.color.setRGB(...now.sunColour, SRGBColorSpace);
    sun.intensity = Math.max(0, now.sun * Math.min(1, d.y * 6));
    hemisphere.color.setRGB(...now.ambient, SRGBColorSpace);
    hemisphere.groundColor.setRGB(
      now.ambient[0] * 0.45,
      now.ambient[1] * 0.42,
      now.ambient[2] * 0.38,
      SRGBColorSpace,
    );
    hemisphere.intensity = now.ambientLevel;
    ambient.intensity = 0.12 * now.ambientLevel;
    scene.environmentIntensity = 0.15 * now.ambientLevel;
  };

  // ---- The control pedestal ---------------------------------------------
  // A galvanised post on a base plate with a sloping steel desk on top,
  // standing in the courtyard, with a button for each of the owner's
  // ambient settings; the other skies are for development (`sky()`).
  const pedestal = new Group();
  pedestal.position.set(PEDESTAL.x * m, 0, PEDESTAL.z * m);
  pedestal.rotation.y = PEDESTAL.yaw;
  pedestal.scale.setScalar(m);
  scene.add(pedestal);
  const galv = kitPaint(kit, '#a9aeab', 0.45);
  const desk = kitPaint(kit, '#3e4547', 0.5);
  const part = (
    geometry: BoxGeometry,
    paint: typeof galv,
    y: number,
    z = 0,
  ) => {
    const mesh = new Mesh(geometry, paint);
    mesh.position.set(0, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    pedestal.add(mesh);
    return mesh;
  };
  part(new BoxGeometry(0.4, 0.02, 0.4), galv, 0.01);
  part(new BoxGeometry(0.08, 0.95, 0.08), galv, 0.495);
  const top = new Group();
  top.position.set(0, 1.0, 0);
  // Its desk slopes up towards whoever stands at it, on its +z side.
  top.rotation.x = 0.45;
  pedestal.add(top);
  const slab = new Mesh(new BoxGeometry(0.62, 0.05, 0.42), desk);
  slab.castShadow = slab.receiveShadow = true;
  top.add(slab);
  const heading = createMicroLabel(kit, 'AMBIENT', {
    height: 0.028,
    ink: '#f0f0ea',
  });
  heading.rotation.x = -Math.PI / 2;
  heading.position.set(0, 0.027, -0.17);
  top.add(heading);
  const buttons = PEDESTAL_SKIES.map(({ id, legend, colour }, i) => {
    const button = pushButton(kit, {
      name: `${legend} sky button`,
      legend,
      colour,
      head: 'flush',
      action: () => changer.choose(id),
    });
    button.object.rotation.x = -Math.PI / 2;
    button.object.position.set(-0.21 + i * 0.14, 0.026, -0.07);
    top.add(button.object);
    courtyard.parts.add(button);
    return button;
  });
  // HELL's controls, a row below: how many layers of cloud (a three-way
  // selector), how far each layer's way is turned from the one beneath
  // (ALIGN: from all one way to each its own) and how much faster each
  // layer is than the one beneath (SPEED: 1 to 1.3 times).
  const hellHeading = createMicroLabel(kit, 'HELL', {
    height: 0.022,
    ink: '#e3a3c8',
  });
  hellHeading.rotation.x = -Math.PI / 2;
  hellHeading.position.set(0, 0.027, 0.045);
  top.add(hellHeading);
  const layersKnob = selector(kit, {
    name: 'HELL cloud layers selector',
    legend: 'LAYERS 1 2 3',
    positions: 3,
    initial: 2,
  });
  const alignKnob = potentiometer(kit, {
    name: 'HELL layer alignment knob',
    legend: 'ALIGN',
    steps: 10,
    initial: 0,
  });
  const speedKnob = potentiometer(kit, {
    name: 'HELL layer speed knob',
    legend: 'SPEED ×1–1.3',
    steps: 6,
    initial: 0.5,
  });
  [layersKnob, alignKnob, speedKnob].forEach((knob, i) => {
    knob.object.rotation.x = -Math.PI / 2;
    knob.object.position.set(-0.14 + i * 0.14, 0.026, 0.12);
    top.add(knob.object);
    courtyard.parts.add(knob);
  });
  const hellLayers = () => 1 + layersKnob.position.value;
  const hellSpread = () => alignKnob.share.value;
  const hellSpeed = () => 1 + 0.3 * speedKnob.share.value;

  // ---- The courtyard's lights ---------------------------------------------
  // A bulkhead on each wall and the lamp post, cool white LED, all on one
  // circuit, switched from beside any door: each switch flips them all, as
  // intermediate switching does. A few real lights, one a fitting.
  const switches = courtyard.switchSpots.map(() => signal(false));
  const lit = computed(() =>
    switches.reduce((on, s) => (s.value ? !on : on), true),
  );
  courtyard.switchSpots.forEach(({ wall, x, y }, i) => {
    const toggle = lightSwitch(kit, {
      name: 'courtyard lights switch',
      gangs: [
        {
          get value() {
            return switches[i].value;
          },
          set(on: boolean) {
            switches[i].value = on;
          },
        },
      ],
    });
    toggle.object.position.set(x, y, 0.02);
    wall.add(toggle.object);
    courtyard.parts.add(toggle);
  });
  const lamps = courtyard.lights.map((at) => {
    const light = new PointLight('#eef3ff', 0, 14 * m, 2);
    light.position.set(at.x * m, at.y * m, at.z * m);
    scene.add(light);
    return light;
  });
  const stopLights = effect(() => {
    const on = lit.value;
    for (const lamp of courtyard.lamps) lamp.set(on);
    for (const light of lamps) light.intensity = on ? 2.4 * m * m : 0;
  });

  // ---- Walking --------------------------------------------------------------
  const walls: Footprint[] = (() => {
    const H = COURTYARD_HALF * m;
    const t = 0.3 * m;
    return [
      { minX: -H - t, maxX: H + t, minZ: -H - t, maxZ: -H },
      { minX: -H - t, maxX: H + t, minZ: H, maxZ: H + t },
      { minX: -H - t, maxX: -H, minZ: -H, maxZ: H },
      { minX: H, maxX: H + t, minZ: -H, maxZ: H },
    ];
  })();
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usable = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster
      .intersectObjects(
        [courtyard.group, ...buttons.map((b) => b.object)],
        true,
      )
      .find((h) => h.object.name !== 'sky');
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = courtyard.parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  /**
   * Each wall's door, metres: its middle, and the way into the courtyard
   * from it. The north wall's door is the corridor's north side's inner
   * door, and so on round (`courtyardLink`).
   */
  const doorways = courtyard.doors.map(({ side, part }, i) => {
    const inward = [
      { x: 0, z: 1 },
      { x: -1, z: 0 },
      { x: 0, z: -1 },
      { x: 1, z: 0 },
    ][i];
    return {
      side,
      part,
      x: -inward.x * COURTYARD_HALF,
      z: -inward.z * COURTYARD_HALF,
      inward,
    };
  });
  /** Where to stand having come from the corridor: inside the matching door. */
  const arrival = (previous: string | null) => {
    if (previous !== 'dev_corridor') return null;
    const d = doorways.find((w) => w.side === courtyardLink.side);
    if (!d) return null;
    return {
      x: (d.x + d.inward.x * 1.3) * m,
      z: (d.z + d.inward.z * 1.3) * m,
      yaw: Math.atan2(d.inward.x, -d.inward.z),
      pitch: 0,
    };
  };
  /** Walking through an open door goes back to its side of the corridor. */
  let leaving = false;
  const goThrough = (x: number, z: number) => {
    if (leaving) return;
    for (const d of doorways) {
      if (!d.part.door.open) continue;
      const across = d.inward.x !== 0;
      const along = across ? Math.abs(z - d.z) : Math.abs(x - d.x);
      const toFace = across ? (x - d.x) * d.inward.x : (z - d.z) * d.inward.z;
      if (along <= 0.5 && toFace >= -0.05 && toFace <= 0.6) {
        courtyardLink.side = d.side;
        leaving = true;
        enterDevRoom('dev_corridor', 'dev_courtyard');
        return;
      }
    }
  };
  const params = new URLSearchParams(location.search);
  const pose = (name: string | null) => {
    const view = COURTYARD_VIEWS[name ?? ''];
    return view && { ...view, x: view.x * m, z: view.z * m };
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      pose(params.get('view')) ?? arrival(params.get('from')) ?? pose('start')!,
    solids: () => walls,
    use: (x, y) => usable(x, y)?.(),
    aimed: () => Boolean(usable(0, 0)),
  });

  /** Only one door open at a time: opening one snaps the others shut. */
  const wasOpen = new Set<unknown>();
  const oneDoorOpen = () => {
    for (const d of courtyard.doors) {
      const open = d.part.door.open;
      if (open && !wasOpen.has(d)) {
        for (const other of courtyard.doors)
          if (other !== d && other.part.door.open) {
            other.part.door.snapShut();
            wasOpen.delete(other);
          }
        wasOpen.add(d);
      } else if (!open) wasOpen.delete(d);
    }
  };

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

  let last = 0;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    // The sky stays round the eye, however far it walks.
    sky.dome.position.copy(camera.position);
    lightFor(time / 1000, delta);
    courtyard.parts.update(delta);
    oneDoorOpen();
    goThrough(walk.walker.x / m, walk.walker.z / m);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });

  (window as unknown as { devCourtyard: unknown }).devCourtyard = {
    /** Stand at a named view: start, up, smoking, pedestal. */
    view(name: string) {
      const p = pose(name);
      if (p) walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Change to a sky: overcast, cumulus, quake, clear, cirrus, storm, sunset, night. */
    sky(id: SkyId) {
      if (SKY_IDS.includes(id)) changer.choose(id);
    },
    skies: () => [...SKY_IDS],
    /** Whether the courtyard's lights are on, and switch them. */
    lights(on?: boolean) {
      if (on !== undefined && on !== lit.value)
        switches[0].value = !switches[0].value;
      return lit.value;
    },
    /**
     * Turn one of HELL's knobs (`layers`, `align` or `speed`) `steps`
     * detents, up (positive) or down, as clicks on it would.
     */
    turn(knob: 'layers' | 'align' | 'speed', steps: number) {
      const part = { layers: layersKnob, align: alignKnob, speed: speedKnob }[
        knob
      ];
      let use: ((direction?: number) => void) | undefined;
      part.object.traverse((o) => {
        use ??= courtyard.parts.uses.get(o);
      });
      for (let i = 0; i < Math.abs(steps); i++) use?.(Math.sign(steps));
    },
    /** HELL's controls: layers (1 to 3), alignment and speed (0 to 1 each). */
    hell: () => ({
      layers: hellLayers(),
      spread: hellSpread(),
      speed: hellSpeed(),
    }),
    /** The sky showing, or changing to. */
    showing: () => changer.target,
    stats: () => ({ ...renderer.info.render }),
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
  };
  void COURTYARD_HEIGHT;

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    courtyard.parts.dispose();
    stopLights();
    sky.dispose();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devCourtyard?: unknown }).devCourtyard;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      leaving = false;
      for (const d of courtyard.doors) d.part.door.snapShut();
      const view =
        pose(new URLSearchParams(location.search).get('view')) ??
        arrival(previous);
      if (view) walk.place(view.x, view.z, view.yaw, view.pitch);
    },
    suspend() {
      courtyard.parts.setAudible(false);
    },
    resume() {
      courtyard.parts.setAudible(true);
    },
  });
}
