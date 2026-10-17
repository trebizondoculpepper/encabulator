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
import { LEVEL2_CUES } from '../game/level2-cues';
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
import { createFirstPerson } from './first-person';
import { createPs1Material, ps1Uniforms } from './ps1-material';
import { createRenderer, useEnvironment } from './render-style';

/** Module 2's interactive test space; its architectural dressing comes later. */
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
  const bounds: Footprint = {
    minX: -6 * m,
    maxX: 6 * m,
    minZ: -5 * m,
    maxZ: 5 * m,
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
  slab(12, 0.1, 10, 0, -0.05, 0, floor);
  slab(12, 0.08, 10, 0, 3.34, 0, ceiling);
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
  for (const x of [-3, 0, 3]) {
    slab(1.1, 0.035, 0.25, x, 3.2, -0.5, dark);
    const lamp = new PointLight('#f0efe3', 8, 6 * m);
    lamp.position.set(x * m, 3.15 * m, -0.5 * m);
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
  oil.position.set('off');
  hydro.position.set('off');

  // Open-topped waste-paper bin: a physical drop target beside the line-up.
  const bin = new Group();
  bin.name = 'Waste-paper bin';
  bin.position.set(2.45 * m, 0, -2.0 * m);
  scene.add(bin);
  const binPaint = createPs1Material({ color: '#555b5c', metalness: 0.3 });
  for (const side of [-1, 1]) {
    const front = new Mesh(
      new BoxGeometry(0.52 * m, 0.48 * m, 0.025 * m),
      binPaint,
    );
    front.position.set(0, 0.24 * m, side * 0.26 * m);
    bin.add(front);
    const end = new Mesh(
      new BoxGeometry(0.025 * m, 0.48 * m, 0.52 * m),
      binPaint,
    );
    end.position.set(side * 0.26 * m, 0.24 * m, 0);
    bin.add(end);
  }
  const base = new Mesh(
    new BoxGeometry(0.52 * m, 0.025 * m, 0.52 * m),
    binPaint,
  );
  base.position.y = 0.02 * m;
  bin.add(base);
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
    introTimer = window.setTimeout(() => voice.queue(1), 1450);
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
  let smokeOn = false;
  let priorOil = false;
  const priorDrive = drive.closed.value;
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
    cards[index].object.visible = false;
    idle = 0;
    if (binned.size === 5) {
      smokeOn = false;
      advance(11, 84, 85, 86, 87, 88, 89, 90, 91);
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
      return () => {
        if (
          main.closed.value &&
          object!.name.includes('AUTOMATION CONTROL') &&
          object!.name.includes('latch')
        ) {
          voice.interrupt(7);
          return;
        }
        work(knobDirection(object!, hit.point, camera));
      };
    }
    return null;
  };
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
    { minX: 2.14 * m, maxX: 2.76 * m, minZ: -2.31 * m, maxZ: -1.69 * m },
  ];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: { x: 0, z: 1.0 * m, yaw: 0, pitch: 0.05 },
    solids: () => [...walls, ...footprints],
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
    mcc.update(delta);
    partAudio.listen(camera, m);
    phaseTime += delta;
    if (started) titleTime += delta;
    if (phase === 8 && !smokeOn) {
      const attempt =
        phaseTime < 0.8 ||
        (phaseTime > 1.35 && phaseTime < 2.1) ||
        (phaseTime > 2.75 && phaseTime < 3.15);
      hydroTone.value = attempt;
      driveTone.value = attempt;
    }
    if (phase < 13 && titleTime > 5) caption.hidden = true;
    if (endingCountdown >= 0) {
      endingCountdown -= delta;
      if (endingCountdown < 0) {
        advance(12, 92, 93, 94, 95, 96);
        smokeOn = false;
        partAudio.play({
          tones: [220, 185, 151, 121, 94, 70].map((hz, i) => ({
            at: i * 0.32,
            hz,
            seconds: 0.37,
            type: 'sawtooth' as const,
            level: 0.012 * (1 - i / 7),
          })),
        });
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
      advance(2);
    } else if (phase === 2 && phaseTime > 2.5) {
      advance(3, 3);
    } else if (phase === 3 && priorOil && !oil.closed.value) advance(4);
    else if (phase === 4 && oil.closed.value) {
      oilFeed.value = true;
      oilTone.value = true;
      advance(5, 4);
    } else if (phase === 5 && priorDrive && !drive.closed.value) advance(6);
    else if (phase === 6 && drive.closed.value) {
      driveFeed.value = true;
      driveTone.value = true;
      advance(7);
    } else if (phase === 7 && hydro.closed.value && !priorHydro) {
      priorHydro = true;
      hydroTone.value = true;
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
    } else if (phase === 8 && smokeOn && !main.closed.value) advance(9);
    else if (phase === 9 && mcc.isDoorOpen(14)) {
      advance(10, 8, 9);
      for (const card of cards)
        (card.object.userData.portable as PortableObject).component.setLocked(
          false,
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
        const at = card.object.getWorldPosition(new Vector3());
        if (
          Math.abs(at.x - bin.position.x) < 0.23 * m &&
          Math.abs(at.z - bin.position.z) < 0.23 * m &&
          at.y < 0.5 * m
        )
          onBinned(index);
        else if (state === 'settled') {
          const previous = floorTime.get(index);
          const age = (previous ?? 0) + delta;
          floorTime.set(index, age);
          if (previous === undefined) voice.interrupt(104, 105);
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
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    for (const material of [floor, wall, ceiling, steel, dark, binPaint])
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
      smokeOn,
      failedSupplyCard: failedSupplyCard.faulted.value,
    }),
    view: (x: number, z: number, yaw = 0) => walk.place(x * m, z * m, yaw, 0),
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
