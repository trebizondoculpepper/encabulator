import { signal } from '@preact/signals-core';
import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { click, partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { createShorting } from '../../components/core/logic/shorting';
import { STAND_CONDITIONS } from '../logic/stand-conditions';
import { STAND_RADIUS } from '../logic/mobile-pedestal';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createLampGlow,
  createPowerMotes,
  createShortSpark,
} from '../../components/core/views/button-effects';
import {
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { knobDirection } from '../../controls/input/knob-turning';
import { createLabelTexture } from '../../components/core/views/screens';
import { createStandInCondition } from '../views/stand-condition';
import { createFirstPerson } from '../../controls/input/first-person';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -10, maxX: 10, minZ: -6, maxZ: 6 };
const CEILING = 3.2;
/** Where the stands stand: a row across the room, facing south. */
const ROW_Z = -3;
const SPACING = 2;

/**
 * Dev11, the Button Gallery: the wandering button's stand (dev9) in every
 * state of repair, standing in a row under its own spotlight, each with a
 * museum label: gleaming new, chrome-plated all over in a glowing aura; as
 * it is in service; then worn, knocked about, vandalised, set on fire and
 * wrecked, each keeping every hurt of the one before
 * (`src/toolkit/gallery/logic/stand-conditions.ts`, drawn by `src/toolkit/gallery/views/stand-condition.ts`).
 * Their buttons press, their lenses damaged to match
 * (`src/toolkit/components/core/logic/lens-damage.ts`); those that still work are lit and gleam,
 * the new one giving off tiny motes of power; from the vandalised one on,
 * each shorts out now and then with a little spark and a crackle
 * (`src/toolkit/components/core/logic/shorting.ts`, `src/toolkit/components/core/views/button-effects.ts`), and the wreck's
 * lamp flickers, white through the hole in its lens, grey plastic when it
 * goes out.
 */
export function startButtonGalleryRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  // A brighter studio to reflect, so chrome looks like chrome.
  const freeEnvironment = useEnvironment(renderer, scene, 0.55);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.25));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.35));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();

  // ---- The room: a dim gallery ----------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5f6366'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2a2c30'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#3c4149');
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
  const sign = createSectionBoard(kit, 'THE BUTTON GALLERY', 4.2);
  sign.position.set(-2.1, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The stands ---------------------------------------------------------
  const flickering = signal(false);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // A short's crackle: a few sharp ticks of high noise, close together.
  const crackle = click({
    band: 4800,
    q: 1.1,
    decay: 0.022,
    level: 0.22,
    repeat: [3, 0.028],
  });
  const auras: ((time: number) => void)[] = [];
  /** What each button gives off, run each frame. */
  const effects: ((time: number, delta: number) => void)[] = [];
  const shorts = new Map<string, () => void>();
  const frees: (() => void)[] = [];
  const stands = STAND_CONDITIONS.map((condition, i) => {
    const x = (i - (STAND_CONDITIONS.length - 1) / 2) * SPACING;
    const stand = createStandInCondition(kit, condition, 1000 + i * 37);
    stand.group.position.set(x, 0, ROW_Z);
    room.add(stand.group);
    auras.push(stand.update);
    frees.push(stand.dispose);
    const lamp = signal(condition.lamp === 'on');
    const button = pushButton(kit, {
      colour: 'red',
      head: 'illuminated',
      name: `button ${condition.name}, ${condition.caption.toLowerCase()}`,
      lamp,
      damage: signal(condition.lens),
      damageSeed: i + 1,
    });
    stand.mount.add(button.object);
    parts.add(button);
    // A lit lens gleams; a new one gives off motes of power; a damaged one
    // shorts now and then, its lamp jumping on with the spark.
    const glow = createLampGlow(kit, m);
    button.object.add(glow.group);
    const motes = condition.finish === 'chrome' ? createPowerMotes(kit) : null;
    if (motes) button.object.add(motes.group);
    const spark = condition.shorts ? createShortSpark(kit) : null;
    if (spark) button.object.add(spark.group);
    const shorting = condition.shorts ? createShorting() : null;
    const short = () => {
      if (!spark) return;
      spark.fire();
      partAudio.play(crackle, button.object);
    };
    shorts.set(condition.name, short);
    effects.push((time, delta) => {
      if (shorting?.update(delta)) short();
      spark?.update(delta, reducedMotion.matches);
      motes?.update(time, delta, reducedMotion.matches);
      lamp.value =
        (condition.lamp === 'flickering'
          ? flickering.value
          : condition.lamp === 'on') || Boolean(spark?.flashing());
      glow.set(lamp.value ? 1 : 0);
    });
    // Its own spotlight, from above and in front.
    const spot = new SpotLight('#fff3e2', 14 * m * m, 0, 0.36, 0.6, 2);
    spot.position.set(x * m, (CEILING - 0.1) * m, (ROW_Z + 1.4) * m);
    spot.target.position.set(x * m, 0.65 * m, ROW_Z * m);
    scene.add(spot, spot.target);
    // A museum label on a slanted lectern, in front and to one side.
    const lectern = new Group();
    lectern.position.set(x + 0.5, 0, ROW_Z + 0.55);
    room.add(lectern);
    const steel = kitPaint(kit, '#2b2d30', 0.4);
    // Low, so it never hides the stand.
    const post = new Mesh(new BoxGeometry(0.04, 0.72, 0.04), steel);
    post.position.y = 0.36;
    lectern.add(post);
    const plate = new Group();
    plate.position.set(0, 0.74, 0);
    plate.rotation.x = -0.6;
    lectern.add(plate);
    const back = new Mesh(new BoxGeometry(0.26, 0.15, 0.012), steel);
    plate.add(back);
    const label = createLabelTexture(
      `${condition.name} · ${condition.caption}`,
      {
        ink: '#1c1c1a',
        plate: '#e9e5da',
        size: 28,
      },
    );
    kit.textures.push(label.texture);
    const face = createPs1Material({ map: label.texture, roughness: 0.6 });
    kit.materials.push(face);
    const text = new Mesh(
      new PlaneGeometry(0.24, (0.24 * label.height) / label.width),
      face,
    );
    text.position.z = 0.0065;
    plate.add(text);
    return { x, condition, mount: stand.mount };
  });
  room.updateMatrixWorld(true);

  // ---- Walking and working -----------------------------------------------
  const portals = createPortals('dev11', devPortals('dev11', bounds, m), 0, m);
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
  // A view's `y`, if given, is the eye's height in metres.
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number; y?: number }
  > = {
    room: { x: 0, z: 4.6 * m, yaw: 0, pitch: -0.12 },
  };
  // Each stand close up, 60 cm in front of its button, wherever its post
  // has left it, looking at it: `?view=1` to `?view=7`.
  for (const { condition, mount } of stands) {
    const at = mount.getWorldPosition(new Vector3()).divideScalar(m);
    const eye = { x: at.x, y: Math.max(0.5, at.y + 0.12), z: at.z + 0.6 };
    views[condition.name] = {
      x: eye.x * m,
      z: eye.z * m,
      yaw: 0,
      pitch: Math.atan2(at.y - eye.y, 0.6),
      y: eye.y,
    };
  }
  const go = (pose: (typeof views)[string]) =>
    walk.place(
      pose.x,
      pose.z,
      pose.yaw,
      pose.pitch,
      pose.y === undefined ? undefined : pose.y * m,
    );
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [
      ...outer,
      ...stands.map(({ x }) => ({
        minX: (x - STAND_RADIUS) * m,
        maxX: (x + STAND_RADIUS) * m,
        minZ: (ROW_Z - STAND_RADIUS) * m,
        maxZ: (ROW_Z + STAND_RADIUS) * m,
      })),
    ],
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
  (window as unknown as { devGallery: unknown }).devGallery = {
    /** Work whatever is at screen point (x, y), −1 to 1, as a click does. */
    use: (x: number, y: number) => usableAt(x, y)?.(),
    view(name: string) {
      const pose = views[name];
      if (pose) go(pose);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Short stand `n`'s button out now, if it shorts. */
    short: (n: number | string) => shorts.get(String(n))?.(),
  };

  // ---- Each frame ----------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    const t = time / 1000;
    ps1Uniforms.time.value = t;
    // The wreck's lamp, on a failing contact: mostly dark, then stuttering.
    flickering.value =
      Math.sin(t * 13.1) + Math.sin(t * 7.3 + 1) + Math.sin(t * 1.7 + 2) > 1.1;
    for (const aura of auras) aura(t);
    for (const effect of effects) effect(t, delta);
    walk.update(delta);
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
    for (const free of frees) free();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devGallery?: unknown }).devGallery;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        go(view);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
