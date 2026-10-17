import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { signal } from '@preact/signals-core';
import { createLevel2Voice } from '../audio/level2-voice';
import { partAudio } from '../audio/part-audio';
import { devWalls } from '../game/dev-room-links';
import {
  LEVEL2_BETAFORM,
  LEVEL2_CUES,
  LEVEL2_INTRO,
  LEVEL2_RESET,
  LEVEL2_SKIP,
} from '../game/level2-cues';
import type { BetaformId } from '../game/level2-cues';
import { METRE } from '../game/units';
import type { Footprint } from '../game/walk-collision';
import type { PortableObject } from './object-handling';
import { createPanelKit, disposeKit } from '../scene/eighties-controls';
import { ISOLATOR } from '../scene/incoming-isolator';
import {
  BAY_WIDTHS,
  createRetroEncabulatorMcc,
  MCC_DEPTH,
  MCC_ISOLATOR_X,
  MCC_WIDTH,
} from '../scene/retro-encabulator-mcc';
import { knobDirection } from '../scene/rotary-knob';
import { addSkipLamps, createSkip } from '../scene/skip';
import { hiddenSpot, offSight } from '../game/hidden-spot';
import { dressSkip } from '../game/skip-dressing';
import { createBinTossing } from './bin-tossing';
import type { TossBin } from './bin-tossing';
import { createFirstPerson } from './first-person';
import { createPs1Material, ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** Module 2's interactive test space; its architectural dressing comes later. */
/** Where the skip may appear, metres: the far end of the room. */
const SKIP_SPOTS = [
  { x: -3.6, z: 16.6 },
  { x: 0, z: 17.4 },
  { x: 3.6, z: 16.6 },
];
/** The glance down at the first dropped card: seconds turning, holding. */
const GLANCE = { turn: 0.7, hold: 1.1 };

export function startLevel2Room(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.3);
  renderer.setClearColor('#a9aaa4');
  const camera = new PerspectiveCamera(55, 1, 0.05, 40 * m);
  scene.add(new AmbientLight('#e8ebe9', 1.35));
  const key = new DirectionalLight('#f5f4e9', 1.2);
  key.position.set(1, 5, 4);
  scene.add(key);
  const floor = createPs1Material({ color: '#777975' });
  const wall = createPs1Material({ color: '#c7c8bc' });
  const ceiling = createPs1Material({ color: '#d4d5cf' });
  const steel = createPs1Material({ color: '#969a99', metalness: 0.4 });
  const dark = createPs1Material({ color: '#25292b' });
  // A long room: the skip, when there is one, stands at the far end,
  // about ten seconds' walk (20 m) from the machine, time for the narrator
  // to talk while the player carries each card to it.
  const ROOM = { minZ: -5, maxZ: 19 };
  const bounds: Footprint = {
    minX: -6 * m,
    maxX: 6 * m,
    minZ: ROOM.minZ * m,
    maxZ: ROOM.maxZ * m,
  };
  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = steel,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w * m, h * m, d * m), material);
    mesh.position.set(x * m, y * m, z * m);
    scene.add(mesh);
    return mesh;
  };
  const roomDepth = ROOM.maxZ - ROOM.minZ;
  const roomMiddle = (ROOM.minZ + ROOM.maxZ) / 2;
  slab(12, 0.1, roomDepth, 0, -0.05, roomMiddle, floor);
  slab(12, 0.08, roomDepth, 0, 3.34, roomMiddle, ceiling);
  const walls = devWalls(bounds, m, 3.3 * m);
  for (const piece of walls) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wall,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  for (const z of [-0.5, 5.5, 11.5, 17])
    for (const x of [-3, 0, 3]) {
      slab(1.1, 0.035, 0.25, x, 3.2, z, dark);
      const lamp = new PointLight('#f0efe3', 8, 6 * m);
      lamp.position.set(x * m, 3.15 * m, z * m);
      scene.add(lamp);
    }
  const kit = createPanelKit();
  const oilFeed = signal(false);
  const driveFeed = signal(false);
  const hydroFeed = signal(true);
  const oilTone = signal(false);
  const hydroTone = signal(false);
  const driveTone = signal(false);
  const mcc = createRetroEncabulatorMcc(kit, {
    incomingOn: true,
    driveTrainWithMains: true,
    bucketFeed: {
      'section3.bucket1': oilFeed,
      'section6.bucket1': driveFeed,
      'section7.bucket2': hydroFeed,
    },
    toneEnabled: {
      'section3.bucket1': oilTone,
      'section6.bucket1': driveTone,
      'section7.bucket2': hydroTone,
    },
  });
  mcc.group.scale.setScalar(m);
  mcc.group.position.set(0, 0, -3.8 * m);
  scene.add(mcc.group);
  const device = (id: string) =>
    mcc.components.find((item) => item.object.name === `${id}: breaker`)!
      .breaker!;
  const main = device('section1.bucket2');
  const oil = device('section3.bucket1');
  const drive = device('section6.bucket2');
  const hydro = device('section7.bucket2');
  // The small breaker inside Automation Control, the cards' own cabinet:
  // the cards come out only once it is off. The rest of the machine stays
  // on, so the player is saving a machine that is still running.
  const automation = device('section5.bucket1');
  oil.position.set('off');
  hydro.position.set('off');

  // A small stain and a few drifting smoke wisps mark the failed cabinet.
  const plcX =
    -MCC_WIDTH / 2 +
    BAY_WIDTHS.slice(0, 4).reduce((a, b) => a + b, 0) +
    BAY_WIDTHS[4] / 2;
  const stain = new Mesh(
    new SphereGeometry(0.13 * m, 14, 8),
    new MeshBasicMaterial({ color: '#282b2c', transparent: true, opacity: 0 }),
  );
  stain.scale.set(1.7, 0.3, 0.07);
  stain.position.set(plcX * m, 2.42 * m, -3.76 * m);
  scene.add(stain);
  const smoke = Array.from({ length: 12 }, (_, i) => {
    const puff = new Mesh(
      new SphereGeometry((0.045 + (i % 3) * 0.018) * m, 8, 6),
      new MeshBasicMaterial({
        color: '#454b4b',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    scene.add(puff);
    return puff;
  });
  const reserveLamps = Array.from({ length: 3 }, (_, i) => {
    const lamp = new Mesh(
      new SphereGeometry(0.009 * m, 10, 8),
      new MeshBasicMaterial({ color: '#344d35' }),
    );
    lamp.position.set((plcX - 0.07 + i * 0.07) * m, 1.34 * m, -3.78 * m);
    scene.add(lamp);
    return lamp;
  });

  const cards = mcc.components
    .filter((item) => item.kind === 'backplane')
    .flatMap((item) => item.cards ?? []);
  const failedSupplyCard = cards.find((card) => card.kind === 'plc-power')!;
  const binned = new Set<number>();
  const removed = new Set<number>();
  const floorTime = new Map<number, number>();
  // There is no bin. The first card the player drops on the floor has the
  // narrator scold them and point out the skip "over there", which only
  // then appears, behind them, where they were not looking: it was never
  // there before he said so (`LEVEL2_SKIP`).
  const tossing = createBinTossing({
    camera,
    metre: m,
    onLanded: (object) => {
      const index = cards.findIndex((card) => card.object === object);
      if (index >= 0 && !binned.has(index)) onBinned(index);
    },
  });
  const skipModel = createSkip(kit);
  skipModel.group.scale.setScalar(m);
  let skip: TossBin | null = null;
  let skipLamps: ReturnType<typeof addSkipLamps> | null = null;
  const eye = new Vector3();
  const look = new Vector3();
  const conjureSkip = () => {
    camera.getWorldPosition(eye).divideScalar(m);
    camera.getWorldDirection(look);
    // One of three places at the far end, where the player is neither
    // standing nor looking (nor has dropped a card).
    const loose = cards
      .filter(
        (card, index) =>
          !binned.has(index) &&
          (card.object.userData.portable as PortableObject).component.phase
            .value !== 'installed',
      )
      .map((card) =>
        card.object.getWorldPosition(new Vector3()).divideScalar(m),
      );
    const clear = SKIP_SPOTS.filter((spot) =>
      loose.every((at) => Math.hypot(at.x - spot.x, at.z - spot.z) > 1.4),
    );
    const halfView = Math.atan(
      Math.tan((camera.fov * Math.PI) / 360) * camera.aspect,
    );
    const facing = { x: look.x, z: look.z };
    const at = { x: eye.x, z: eye.z };
    const spot =
      hiddenSpot({
        eye: at,
        facing,
        halfView,
        size: skipModel.footprint,
        candidates: clear.length ? clear : SKIP_SPOTS,
        near: 2.5,
        ideal: 20,
      }) ??
      // Should they be looking that way, the one furthest from their view.
      [...SKIP_SPOTS].sort(
        (a, b) => offSight(at, facing, b) - offSight(at, facing, a),
      )[0];
    skipModel.group.position.set(spot.x * m, 0, spot.z * m);
    scene.add(skipModel.group);
    skipLamps = addSkipLamps(kit, skipModel.group, dressSkip().lamps);
    skip = tossing.add({ name: 'skip', ...skipModel, ...spot });
  };
  // On the first card dropped, the player's eyes go down to it, as the
  // narrator draws breath: a glance the room makes, holding the player
  // for a moment (`hold`), so the skip appears unseen.
  let glance: {
    t: number;
    from: { yaw: number; pitch: number };
    to: { yaw: number; pitch: number };
  } | null = null;
  const glanceAt = (object: Object3D) => {
    const target = object.getWorldPosition(new Vector3());
    camera.getWorldPosition(eye);
    const yaw = Math.atan2(target.x - eye.x, -(target.z - eye.z));
    const pitch = Math.atan2(
      target.y - eye.y,
      Math.hypot(target.x - eye.x, target.z - eye.z),
    );
    const from = { yaw: walk.walker.yaw, pitch: walk.walker.pitch };
    // Turning the short way round.
    const turn =
      ((((yaw - from.yaw) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) -
      Math.PI;
    glance = { t: 0, from, to: { yaw: from.yaw + turn, pitch } };
    walk.hold(true);
  };
  const glancing = (delta: number) => {
    if (!glance) return;
    glance.t += delta;
    const k = Math.min(1, glance.t / GLANCE.turn);
    const ease = k * k * (3 - 2 * k);
    walk.place(
      walk.walker.x,
      walk.walker.z,
      glance.from.yaw + (glance.to.yaw - glance.from.yaw) * ease,
      glance.from.pitch + (glance.to.pitch - glance.from.pitch) * ease,
    );
    if (glance.t >= GLANCE.turn + GLANCE.hold) {
      glance = null;
      walk.hold(false);
    }
  };
  for (const card of cards)
    (card.object.userData.portable as PortableObject).component.setLocked(true);
  const voice = createLevel2Voice();
  let started = false;
  let introTimer = 0;
  let completionTimer = 0;
  const jingle = () =>
    partAudio.play({
      tones: [392, 523, 659, 784, 659].map((hz, i) => ({
        at: i * 0.23,
        hz,
        seconds: 0.19,
        type: 'triangle' as const,
        level: 0.025,
      })),
    });
  const startNarration = () => {
    if (started) return;
    started = true;
    window.setTimeout(jingle, 0);
    introTimer = window.setTimeout(() => {
      for (const line of LEVEL2_INTRO) voice.say(line);
      voice.queue(1);
    }, 1450);
  };
  window.addEventListener('pointerdown', startNarration, { capture: true });
  window.addEventListener('keydown', startNarration, { capture: true });
  const caption = document.createElement('div');
  caption.textContent =
    'Module 2: Standard Encabulation Operation · Click to begin';
  Object.assign(caption.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '12%',
    color: '#f1eee5',
    textAlign: 'center',
    fontFamily: 'sans-serif',
    fontSize: 'clamp(18px, 3vw, 36px)',
    textShadow: '0 2px 8px #222',
    pointerEvents: 'none',
  });
  canvas.parentElement?.append(caption);
  let phase = 0;
  let phaseTime = 0;
  let titleTime = 0;
  let endingCountdown = -1;
  let griefCountdown = -1;
  let restarting = false;
  let revived = false;
  let resetNag = 0;
  let smokeOn = false;
  let priorOil = false;
  // Rebooting the betaform amplifier: three operations drawn at random
  // from ten, each a real control round the machine, set in any order and
  // latched once done (`LEVEL2_BETAFORM`). No two playthroughs agree on
  // what routine operation is.
  const control = (name: string) => mcc.controls.get(name)!.position;
  /** Something done by doing one thing and then another. */
  const cycle = (first: () => boolean, then: () => boolean) => {
    let started = false;
    return () => {
      if (first()) started = true;
      return started && then();
    };
  };
  const checks: Record<BetaformId, () => boolean> = {
    isolator: cycle(
      () => !drive.closed.value,
      () => drive.closed.value,
    ),
    speed: () => control('drive.speed').value >= 10,
    fan: () => control('fan.mode').value === 2,
    key: () => control('hydraulic.key').value === 0,
    boost: () => control('fan.boost').value === 1,
    phase: () => control('incoming.phase').value === 0,
    kirk: () => control('main.kirk').value === 0,
    hoa: () => control('feed.hoa').value === 0,
    test: () => control('annunciator.tests').value > 0,
    stop: cycle(
      () => control('auxiliary.stop').value === 1,
      () => control('auxiliary.stop').value === 0,
    ),
  };
  const drawn = (Object.keys(checks) as BetaformId[])
    .map((id) => ({ id, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(({ id }) => id);
  const betaform = new Set<BetaformId>();
  let listed = false;
  let nagTime = 0;
  let nagged = 0;
  let priorHydro = false;
  let idle = 0;
  let optional = 97;
  let lastRemoved = -1;
  voice.onStart((id) => {
    if (id === 91) endingCountdown = 7;
  });
  const advance = (next: number, ...cues: number[]) => {
    phase = next;
    phaseTime = 0;
    idle = 0;
    if (cues.length) voice.interrupt(...cues);
  };
  const cardName = (index: number) =>
    String(
      cards[index].object.userData.boardDesignation?.type ??
        `card ${index + 1}`,
    );
  const onRemoved = (index: number) => {
    removed.add(index);
    floorTime.delete(index);
    lastRemoved = index;
    idle = 0;
    const count = removed.size;
    if (count === 1) {
      voice.interrupt();
      voice.say(`A Pepperdyne ${cardName(index)}. A modial-interaction board.`);
      voice.queue(11, 12);
    } else if (count === 2)
      voice.interrupt(14, 15, 16, 17, 18, 19, 20, 21, 22, 23);
    else if (count === 3) voice.interrupt(30, 31, 32, 33, 34, 35, 36, 37, 38);
    else if (count === 4)
      voice.interrupt(58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71);
    else {
      voice.interrupt(74, 75, 76, 77, 78, 79, 80, 81, 82);
      voice.say(
        LEVEL2_CUES[82].text.replace(
          'Baltovsky flux compensator',
          cardName(index).toLowerCase(),
        ),
      );
    }
  };
  const onBinned = (index: number) => {
    binned.add(index);
    idle = 0;
    if (binned.size === 5) {
      smokeOn = false;
      // The machine is stalled; its RESET will bring it back.
      advance(11, 84);
      voice.say(LEVEL2_RESET.prompt);
    } else if (binned.size === 1) voice.interrupt(13);
    else if (binned.size === 2) {
      const remaining = cards.length - removed.size;
      voice.interrupt();
      voice.say(
        LEVEL2_CUES[23].text.replace(
          '[BOARDS REMAINING: THREE]',
          String(remaining),
        ),
      );
      if (remaining > 0) {
        voice.queue(25, 26, 27, 28);
        voice.say(
          LEVEL2_CUES[28].text.replace(
            '[BOARDS REMAINING: THREE]',
            String(remaining),
          ),
        );
      }
    } else if (binned.size === 3) {
      const next = cards.findIndex((_, slot) => !removed.has(slot));
      const name = cardName(next >= 0 ? next : index).toLowerCase();
      voice.interrupt(39);
      voice.say(
        LEVEL2_CUES[39].text.replace('hydrocoptic phase regulator', name),
      );
      voice.queue(41);
      voice.say(
        LEVEL2_CUES[41].text.replace('hydrocoptic phase regulator', name),
      );
      voice.queue(43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57);
    } else voice.interrupt(72, 73);
  };

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(mcc.group, true)[0];
    if (!hit || hit.distance > 3.2 * m) return null;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    ) {
      const work = mcc.parts.uses.get(object);
      if (!work) continue;
      return () => work(knobDirection(object!, hit.point, camera));
    }
    return null;
  };
  /**
   * A card the player tried to pull while its cabinet is still live: the
   * pickup refuses it (the card is locked) and the narrator objects.
   */
  const liveCardAt = (x: number, y: number) => {
    if (phase < 10 || !automation.closed.value) return false;
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(mcc.group, true)[0];
    if (!hit || hit.distance > 3.2 * m) return false;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    )
      if (cards.some((card) => card.object === object)) return true;
    return false;
  };
  let warned = -Infinity;
  const footprints: Footprint[] = [
    {
      minX: (-MCC_WIDTH / 2 - 0.1) * m,
      maxX: (MCC_WIDTH / 2 + 0.1) * m,
      minZ: (-3.8 - MCC_DEPTH - 0.08) * m,
      maxZ: -3.72 * m,
    },
    {
      minX: (MCC_ISOLATOR_X - ISOLATOR.width / 2 - 0.05) * m,
      maxX: (MCC_ISOLATOR_X + ISOLATOR.width / 2 + 0.05) * m,
      minZ: (-3.8 + ISOLATOR.back) * m,
      maxZ: (-3.8 + ISOLATOR.front) * m,
    },
  ];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: { x: 0, z: 1.0 * m, yaw: 0, pitch: 0.05 },
    solids: () => [
      ...walls,
      ...footprints,
      ...(skip
        ? [
            {
              minX: (skip.x - skip.footprint.x / 2 - 0.05) * m,
              maxX: (skip.x + skip.footprint.x / 2 + 0.05) * m,
              minZ: (skip.z - skip.footprint.z / 2 - 0.05) * m,
              maxZ: (skip.z + skip.footprint.z / 2 + 0.05) * m,
            },
          ]
        : []),
    ],
    divert: (object, portable) => tossing.divert(object, portable),
    use: (x, y) => {
      if (liveCardAt(x, y)) {
        // Once, and again only if they keep trying.
        if (clock - warned > 8) voice.interrupt(7);
        warned = clock;
        return;
      }
      usableAt(x, y)?.();
    },
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
  let last = 0;
  let clock = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    clock += delta;
    walk.update(delta);
    glancing(delta);
    tossing.update(delta);
    skipLamps?.update(time / 1000);
    mcc.update(delta);
    partAudio.listen(camera, m);
    phaseTime += delta;
    if (started) titleTime += delta;
    if (phase < 13 && titleTime > 5) caption.hidden = true;
    if (endingCountdown >= 0) {
      endingCountdown -= delta;
      if (endingCountdown < 0) {
        // Cut him off mid-word: the machine dies, finally, with sparks,
        // and its main breaker trips.
        voice.interrupt();
        smokeOn = false;
        mcc.fail('kaput');
        griefCountdown = 8.5;
      }
    }
    if (griefCountdown >= 0) {
      griefCountdown -= delta;
      if (griefCountdown < 0) advance(12, 92, 93, 94, 95, 96);
    }
    if (phase === 11) {
      // Waiting for RESET; then the machine sputters back into life, and
      // the narrator, relieved, resumes the lesson.
      if (mcc.failure === 'restart') restarting = true;
      else if (restarting && mcc.failure === null) {
        restarting = false;
        revived = true;
        voice.interrupt(85, 86, 87, 88, 89, 90, 91);
      } else if (!revived && !restarting && !voice.busy) {
        resetNag += delta;
        if (resetNag > 14) {
          resetNag = 0;
          voice.say(LEVEL2_RESET.remind);
        }
      }
    }
    if (phase === 12 && !voice.busy) {
      phase = 13;
      completionTimer = window.setTimeout(() => {
        caption.textContent = 'Module 2 complete.';
        caption.hidden = false;
        jingle();
      }, 3000);
    }
    if (phase === 0 && main.closed.value) advance(1, 2);
    else if (phase === 1 && oil.closed.value) {
      priorOil = true;
      // The sticky switch: a hiccup, as a warning of what is to come.
      mcc.fail('hiccup');
      advance(2);
    } else if (phase === 2 && phaseTime > 2.5) {
      advance(3, 3);
    } else if (phase === 3 && priorOil && !oil.closed.value) advance(4);
    else if (phase === 4 && oil.closed.value) {
      oilFeed.value = true;
      oilTone.value = true;
      advance(5, 4);
    } else if (phase === 5) {
      for (const id of drawn)
        if (!betaform.has(id) && checks[id]()) {
          betaform.add(id);
          nagTime = 0;
          if (betaform.size === drawn.length) {
            driveFeed.value = true;
            driveTone.value = true;
            // The main machine note shifts up as the amplifier comes in.
            mcc.pitch.value = 1.08;
            advance(7);
            voice.interrupt();
            voice.say(LEVEL2_BETAFORM.done);
          } else if (!voice.busy)
            voice.say(LEVEL2_BETAFORM.acks[(betaform.size - 1) % 3]);
        }
      // Before anything, the whole list; after it, one remaining operation
      // at a time, precisely, until it is done.
      nagTime += delta;
      const remaining = drawn.filter((id) => !betaform.has(id));
      if (phase === 5 && !voice.busy && remaining.length) {
        if (!listed && nagTime > 6) {
          listed = true;
          nagTime = 0;
          voice.say(LEVEL2_BETAFORM.intro);
          for (const id of remaining)
            voice.say(LEVEL2_BETAFORM.operations[id].say);
          voice.say(LEVEL2_BETAFORM.outro);
        } else if (listed && nagTime > 15) {
          nagTime = 0;
          const id = remaining[nagged++ % remaining.length];
          voice.say(LEVEL2_BETAFORM.operations[id].remind);
        }
      }
    } else if (phase === 7 && hydro.closed.value && !priorHydro) {
      priorHydro = true;
      hydroTone.value = true;
      // A surge, then the machine sputters to a standstill.
      mcc.fail('sputter');
      advance(8);
    } else if (phase === 8 && phaseTime > 4 && !smokeOn) {
      smokeOn = true;
      // Fail a real board in the same component model used by dev6. Its
      // power loss propagates through the processor and I/O cards.
      failedSupplyCard.test();
      partAudio.play(
        {
          click: {
            band: 950,
            q: 0.7,
            decay: 0.2,
            level: 0.12,
            thump: [85, 0.16],
          },
        },
        failedSupplyCard.object,
      );
      hydroFeed.value = false;
      hydroTone.value = false;
      driveTone.value = false;
      voice.interrupt(5, 6);
    } else if (phase === 8 && smokeOn) advance(9);
    else if (phase === 9 && mcc.isDoorOpen(14)) advance(10, 8, 9);
    if (phase >= 10)
      // A card still in its slot comes out only with its cabinet's breaker
      // off; one already out can always be picked up again.
      for (const card of cards) {
        const portable = (card.object.userData.portable as PortableObject)
          .component;
        // A card in the skip stays there.
        if (!binned.has(cards.indexOf(card)))
          portable.setLocked(
            portable.phase.value === 'installed' && automation.closed.value,
          );
      }
    if (phase === 10) {
      for (const [index, card] of cards.entries()) {
        const state = (card.object.userData.portable as PortableObject)
          .component.phase.value;
        if (state !== 'installed' && !removed.has(index)) onRemoved(index);
        if (binned.has(index) || state === 'installed' || state === 'held') {
          floorTime.delete(index);
          continue;
        }
        if (state === 'settled') {
          const previous = floorTime.get(index);
          const age = (previous ?? 0) + delta;
          floorTime.set(index, age);
          if (previous === undefined && !skip) {
            // The first card on the floor: there never was a bin.
            glanceAt(card.object);
            conjureSkip();
            voice.interrupt();
            voice.say(LEVEL2_SKIP.appears);
          } else if (previous === undefined) voice.interrupt(104, 105);
          else if (age >= 30 && age - delta < 30) voice.interrupt(106);
          else if (age >= 40 && age - delta < 40) voice.interrupt(107);
        }
      }
      idle += delta;
      if (idle > 25 && !voice.busy && removed.size < 5) {
        const firstHeld =
          removed.size === 1 &&
          binned.size === 0 &&
          (cards[lastRemoved].object.userData.portable as PortableObject)
            .component.phase.value === 'held';
        voice.queue(
          firstHeld ? 102 : removed.size === binned.size ? 108 : optional,
        );
        optional = optional < 101 ? optional + 1 : 97;
        idle = 0;
      }
    }
    (stain.material as MeshBasicMaterial).opacity +=
      ((smokeOn ? 0.5 : 0) - (stain.material as MeshBasicMaterial).opacity) *
      Math.min(1, delta * 0.5);
    smoke.forEach((puff, i) => {
      const age = (time / 4000 + i / smoke.length) % 1;
      puff.position.set(
        (plcX + Math.sin(i * 13) * 0.09 + age * 0.07) * m,
        (2 + age * 0.65) * m,
        (-3.74 + age * 0.06) * m,
      );
      (puff.material as MeshBasicMaterial).opacity = smokeOn
        ? Math.sin(age * Math.PI) * 0.11
        : 0;
    });
    reserveLamps.forEach((lamp, i) => {
      const dim = removed.size >= 4 && phase < 11;
      const alive =
        phase < 12 && (main.closed.value || (phase >= 9 && phase < 12));
      const flicker = dim && Math.sin(time * 0.002 + i * 4) > 0.2;
      (lamp.material as MeshBasicMaterial).color.set(
        !alive || flicker ? '#344038' : dim ? '#5c7850' : '#73bb67',
      );
    });
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    window.clearTimeout(introTimer);
    window.clearTimeout(completionTimer);
    window.removeEventListener('pointerdown', startNarration, true);
    window.removeEventListener('keydown', startNarration, true);
    caption.remove();
    walk.dispose();
    voice.dispose();
    mcc.parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    scene.remove(skipModel.group);
    skipLamps?.dispose();
    for (const root of [scene, skipModel.group])
      root.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
    for (const material of [floor, wall, ceiling, steel, dark])
      material.dispose();
    (stain.material as MeshBasicMaterial).dispose();
    for (const puff of smoke) (puff.material as MeshBasicMaterial).dispose();
    for (const lamp of reserveLamps)
      (lamp.material as MeshBasicMaterial).dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { level2?: unknown }).level2;
  };
  (window as unknown as { level2: unknown }).level2 = {
    world: mcc.world,
    components: () =>
      mcc.components.map((device) => ({
        name: device.object.name,
        kind: device.kind,
        active: device.active.value,
        faulted: device.faulted.value,
        value: device.value.value,
      })),
    state: () => ({
      phase,
      removed: removed.size,
      binned: binned.size,
      skip: skip && { x: skip.x, z: skip.z },
      smokeOn,
      failedSupplyCard: failedSupplyCard.faulted.value,
    }),
    view: (x: number, z: number, yaw = 0) => walk.place(x * m, z * m, yaw, 0),
    /** Glance at the first card and conjure the skip, as a first drop does. */
    conjureSkip: () => {
      if (skip) return skip;
      glanceAt(cards[0].object);
      conjureSkip();
      return { x: skip!.x, z: skip!.z };
    },
  };
  return Object.assign(dispose, {
    suspend() {
      mcc.parts.setAudible(false);
      voice.suspend();
    },
    resume() {
      mcc.parts.setAudible(true);
      voice.resume();
    },
  });
}
