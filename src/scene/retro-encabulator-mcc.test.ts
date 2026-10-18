import { createLevel0Machine } from '../rendering/level0-machine';
import { assertDropProfile } from '../toolkit/controls/logic/drop-profile';
import { signal } from '@preact/signals-core';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import type { PortableObject } from '../toolkit/controls/input/object-handling';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, BoxGeometry, Mesh, Raycaster, Vector3 } from 'three';
import type { Group, Material, Object3D } from 'three';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createMachineGallery,
  createEmptyMachinePlinths,
  EMPTY_GALLERY_LAYOUT,
  MACHINE_GALLERY_LAYOUT,
} from '../toolkit/gallery/rooms/machine-gallery';
import { machineComponent } from '../toolkit/components/industrial-control/parts/machine-components';
import { MACHINE_COMPONENTS } from '../toolkit/components/industrial-control/logic/machine-components';
import { watchMerged } from '../toolkit/components/core/views/merge-static';
import { FAILURES } from '../game/machine-failure';
import { createRetroEncabulatorMcc } from './retro-encabulator-mcc';

beforeEach(() => {
  // Geometry/raycast tests need label canvases, but no pixel rendering.
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

function fixture(options?: Parameters<typeof createRetroEncabulatorMcc>[1]) {
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit, options);
  const interiors: Group[] = [];
  mcc.group.traverse((o) => {
    if (o.name.endsWith(' contents')) interiors.push(o as Group);
  });
  return {
    mcc,
    interiors,
    dispose: () => {
      mcc.parts.dispose();
      disposeKit(kit, mcc.group);
    },
  };
}

/** Throw the incoming isolator's handle, as a click on it does. */
function isolate(mcc: ReturnType<typeof createRetroEncabulatorMcc>) {
  const isolator = mcc.group.getObjectByName('INCOMING ISOLATOR handle')!;
  let lever: Object3D | undefined;
  isolator.traverse((o) => {
    if (!lever && mcc.parts.uses.has(o)) lever = o;
  });
  return work(mcc, lever!);
}

function work(
  mcc: ReturnType<typeof createRetroEncabulatorMcc>,
  object: Object3D,
) {
  for (let at: Object3D | null = object; at; at = at.parent) {
    const use = mcc.parts.uses.get(at);
    if (use) {
      use();
      return true;
    }
  }
  return false;
}

it('keeps a scenario-gated pump dark until its retry feed is enabled', () => {
  const kit = createPanelKit();
  const oilFeed = signal(false);
  const mcc = createRetroEncabulatorMcc(kit, {
    incomingOn: true,
    bucketFeed: { 'section3.bucket1': oilFeed },
  });
  const main = mcc.components.find(
    (device) => device.object.name === 'section1.bucket2: breaker',
  )!;
  const oil = mcc.components.find(
    (device) => device.object.name === 'section3.bucket1: breaker',
  )!;
  expect(main.breaker!.closed.value).toBe(false);
  main.breaker!.operate();
  expect(oil.active.value).toBe(false);
  oilFeed.value = true;
  expect(oil.active.value).toBe(true);
  mcc.parts.dispose();
  disposeKit(kit, mcc.group);
});

it('shows two rack status lamps through Automation Control startup and fault', () => {
  const { mcc, dispose } = fixture();
  const lamps: Object3D[] = [];
  mcc.group.traverse((object) => {
    if (object.name === 'Rack status lens') lamps.push(object);
  });
  expect(lamps).toHaveLength(2);
  expect(lamps.map((lamp) => lamp.userData.status)).toEqual(['off', 'off']);

  isolate(mcc);
  mcc.components
    .find((device) => device.object.name === 'section1.bucket2: breaker')!
    .breaker!.operate();
  mcc.update(0.1);
  expect(lamps.map((lamp) => lamp.userData.status)).toEqual([
    'starting',
    'starting',
  ]);
  mcc.update(3.5);
  expect(lamps.map((lamp) => lamp.userData.status)).toEqual([
    'running',
    'running',
  ]);
  expect(lamps.every((lamp) => lamp.userData.lit)).toBe(true);

  mcc.components.find((device) => device.kind === 'backplane')!.test();
  mcc.update(0.1);
  expect(lamps.map((lamp) => lamp.userData.status)).toEqual(['fault', 'fault']);
  dispose();
});

it('flashes the rack indicators red during failure and extinguishes them when main power trips', () => {
  const { mcc, dispose } = fixture();
  const lamps: Object3D[] = [];
  mcc.group.traverse((object) => {
    if (object.name === 'Rack status lens') lamps.push(object);
  });
  isolate(mcc);
  mcc.components
    .find((device) => device.object.name === 'section1.bucket2: breaker')!
    .breaker!.operate();
  mcc.update(3.5);
  mcc.fail('kaput');
  const seen = new Set<boolean>();
  for (let i = 0; i < 8; i++) {
    mcc.update(0.13);
    expect(lamps.map((lamp) => lamp.userData.status)).toEqual([
      'fault',
      'fault',
    ]);
    seen.add(Boolean(lamps[0].userData.lit));
  }
  expect(seen).toEqual(new Set([true, false]));
  for (let i = 0; i < 80; i++) mcc.update(0.13);
  expect(lamps.map((lamp) => lamp.userData.status)).toEqual(['off', 'off']);
  expect(lamps.every((lamp) => lamp.userData.lit === false)).toBe(true);
  dispose();
});

it('beeps at a distinct pitch as each screen reaches steady state, once per boot', () => {
  const play = vi.spyOn(partAudio, 'play').mockImplementation(() => () => {});
  const { mcc, dispose } = fixture();
  isolate(mcc);
  mcc.components
    .find((d) => d.object.name === 'section1.bucket2: breaker')!
    .breaker!.operate();
  play.mockClear();
  const beeps = () =>
    play.mock.calls
      .map(([recipe]) => recipe)
      .filter(
        (recipe) =>
          ('tone' in recipe && recipe.tone.seconds === 0.11) ||
          ('tones' in recipe && recipe.tones[0]?.hz === 880),
      );
  mcc.update(3);
  expect(beeps()).toHaveLength(0);
  mcc.update(0.5);
  expect(beeps()).toHaveLength(1); // Automation Control PLC self-test.
  expect(beeps()[0]).toEqual({
    tones: [{ at: 0, hz: 880, seconds: 0.11, type: 'square', level: 0.06 }],
  });
  mcc.update(20);
  const first = beeps();
  expect(first.length).toBeGreaterThanOrEqual(7);
  expect(
    new Set(
      first.map((recipe) => {
        if ('tone' in recipe) return recipe.tone.hz;
        if ('tones' in recipe) return recipe.tones[0].hz;
        return NaN;
      }),
    ).size,
  ).toBe(first.length);
  // Every one heard over the machine's hum.
  for (const recipe of first) {
    const level =
      'tone' in recipe
        ? recipe.tone.level
        : 'tones' in recipe
          ? recipe.tones[0].level
          : 0;
    expect(level).toBeGreaterThanOrEqual(0.06);
  }
  mcc.update(5);
  expect(beeps()).toHaveLength(first.length);
  isolate(mcc);
  mcc.update(0);
  isolate(mcc);
  mcc.update(25);
  mcc.update(0.05);
  expect(beeps()).toHaveLength(first.length * 2);
  dispose();
  play.mockRestore();
});

describe('MCC bucket doors', () => {
  it('closes an open door using either black fastener from either side', () => {
    const { mcc, interiors, dispose } = fixture();
    const latches = [...mcc.parts.uses.keys()].filter((o) =>
      o.name.endsWith(' latch'),
    );
    expect(latches).toHaveLength(mcc.doorCount * 2);
    for (const latch of latches.slice(0, 2)) {
      for (const side of [-1, 1]) {
        mcc.door(0);
        for (let i = 0; i < 60; i++) mcc.update(0.05);
        mcc.group.updateMatrixWorld(true);
        const ray = new Raycaster(
          latch.localToWorld(new Vector3(0, 0, side * 0.2)),
          new Vector3(0, 0, -side).transformDirection(latch.matrixWorld),
        );
        const hit = ray.intersectObject(mcc.group, true)[0];
        expect(hit).toBeDefined();
        expect(work(mcc, hit.object)).toBe(true);
        for (let i = 0; i < 60; i++) mcc.update(0.05);
        expect(interiors[0].visible).toBe(false);
      }
    }
    dispose();
  });
  it('renders only the opened bucket contents, including through the closing animation', () => {
    const { mcc, interiors, dispose } = fixture();
    expect(interiors).toHaveLength(mcc.doorCount);
    expect(
      interiors.every(
        (o) => o.visible === (o.userData.interiorVisibility === 'always'),
      ),
    ).toBe(true);
    mcc.door(0);
    mcc.update(0.05);
    expect(interiors[0].visible).toBe(true);
    expect(
      interiors
        .slice(1)
        .every(
          (o) => o.visible === (o.userData.interiorVisibility === 'always'),
        ),
    ).toBe(true);
    mcc.door(0);
    mcc.update(0.05);
    expect(interiors[0].visible).toBe(true);
    for (let i = 0; i < 60; i++) mcc.update(0.05);
    expect(
      interiors.every(
        (o) => o.visible === (o.userData.interiorVisibility === 'always'),
      ),
    ).toBe(true);
    mcc.openAll(true);
    mcc.update(0.1);
    expect(interiors.every((o) => o.visible)).toBe(true);
    dispose();
  });

  it('prunes hidden interiors from raycasting, rather than just hiding them visually', () => {
    const { mcc, interiors, dispose } = fixture();
    const interior = interiors[0];
    const firstMesh = interior.children[0];
    const raycast = vi.spyOn(firstMesh, 'raycast');
    mcc.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(0, 1, 1), new Vector3(0, 0, -1));
    expect(ray.intersectObject(interior, true)).toHaveLength(0);
    expect(raycast).not.toHaveBeenCalled();
    // The pruning must hold even if a hidden rack is pulled out past its door.
    firstMesh.position.set(0, 1, 0);
    mcc.group.updateMatrixWorld(true);
    expect(ray.intersectObject(interior, true)).toHaveLength(0);
    expect(raycast).not.toHaveBeenCalled();
    mcc.door(0);
    mcc.update(0.05);
    mcc.group.updateMatrixWorld(true);
    ray.intersectObject(interior, true);
    expect(raycast).toHaveBeenCalledOnce();
    dispose();
  });

  it('has ventilated rear covers that close their own doors without opening shut ones', () => {
    const { mcc, interiors, dispose } = fixture();
    const backs = [...mcc.parts.uses.keys()].filter((o) =>
      o.name.endsWith(' door back'),
    );
    expect(backs).toHaveLength(mcc.doorCount);
    for (const back of backs) {
      const vents: Object3D[] = [];
      back.traverse((o) => {
        if (o.name === 'Door rear ventilation') vents.push(o);
      });
      expect(vents.length).toBeGreaterThan(0);
    }
    work(mcc, backs[0]);
    mcc.update(0.1);
    expect(interiors[0].visible).toBe(false);
    mcc.door(0);
    mcc.door(1);
    for (let i = 0; i < 20; i++) mcc.update(0.05);
    mcc.group.updateMatrixWorld(true);
    const ray = new Raycaster(
      backs[0].localToWorld(new Vector3(0, 0, -0.2)),
      new Vector3(0, 0, 1).transformDirection(backs[0].matrixWorld),
    );
    const hit = ray.intersectObject(backs[0], true)[0];
    expect(hit).toBeDefined();
    expect(work(mcc, hit.object)).toBe(true);
    for (let i = 0; i < 60; i++) mcc.update(0.05);
    expect(interiors[0].visible).toBe(false);
    expect(interiors[1].visible).toBe(true);
    dispose();
  });
});

describe('shared machine inventory', () => {
  it('completes the capacitor row with five empty exhibits and folded service cards', () => {
    const kit = createPanelKit();
    const empty = createEmptyMachinePlinths(kit);
    expect(empty).toHaveLength(5);
    expect(EMPTY_GALLERY_LAYOUT.map((place) => place.z)).toEqual([
      6.2, 6.2, 6.2, 6.2, 6.2,
    ]);
    for (const plinth of empty) {
      expect(plinth.parts.uses.size).toBe(0);
      const card = plinth.group.getObjectByName(
        'Folded exhibit out of service card',
      )!;
      expect(card).toBeDefined();
      expect(card.children).toHaveLength(2);
      expect(new Box3().setFromObject(card).max.y).toBeGreaterThan(1.05);
      plinth.dispose();
      disposeKit(kit, plinth.group);
    }
  });

  it('fits small-device lettering and gives every PCB textured front and back faces', () => {
    const kit = createPanelKit();
    const relay = machineComponent(kit, 'relay');
    const mark = relay.object.getObjectByName('Label CONTROL RELAY') as Mesh;
    expect(
      new Box3().setFromObject(mark).getSize(new Vector3()).x,
    ).toBeLessThan(0.0232);
    for (const kind of [
      'plc-power',
      'plc-cpu',
      'plc-input',
      'plc-output',
      'plc-analog',
      'plc-comms',
      'backplane',
      'capacitors',
    ] as const) {
      const device = machineComponent(kit, kind);
      const boards: Mesh[] = [];
      device.object.traverse((object) => {
        if (object instanceof Mesh && object.name.startsWith('Textured green'))
          boards.push(object);
      });
      expect(boards.length).toBeGreaterThan(0);
      for (const board of boards) {
        expect(Array.isArray(board.material)).toBe(true);
        const faces = (board.material as Material[]).filter(
          (material) => material.userData.pcbVariant,
        );
        expect(faces).toHaveLength(2);
      }
      device.dispose();
    }
    relay.dispose();
    disposeKit(kit, relay.object);
  });

  it('places readable single-line titles and working lock controls on the plinth tops', () => {
    const kit = createPanelKit();
    const gallery = createMachineGallery(kit);
    for (const plinth of gallery) {
      const panel = plinth.group.getObjectByName('Pedestal test controls')!;
      const title = plinth.group.getObjectByName('Pedestal title') as Mesh;
      expect(
        new Vector3(0, 0, 1).applyQuaternion(panel.quaternion).y,
      ).toBeCloseTo(1);
      expect(title.position.y).toBeGreaterThan(0.98);
      title.geometry.computeBoundingBox();
      expect(title.geometry.boundingBox!.max.x).toBeLessThanOrEqual(0.45);
      const portable: PortableObject[] = [];
      plinth.group.traverse((object) => {
        if (object.userData.portable)
          portable.push(object.userData.portable as PortableObject);
      });
      expect(
        portable.every((object) => !object.component.canPickUp.value),
      ).toBe(true);
      const lock = [...plinth.parts.uses].find(([object]) => {
        for (let at: Object3D | null = object; at; at = at.parent)
          if (at.name.includes('lock/release')) return true;
        return false;
      });
      expect(lock).toBeDefined();
      lock![1]();
      expect(portable.every((object) => object.component.canPickUp.value)).toBe(
        true,
      );
      lock![1]();
      expect(
        portable.every((object) => !object.component.canPickUp.value),
      ).toBe(true);
      plinth.dispose();
      disposeKit(kit, plinth.group);
    }
    const kinds = MACHINE_COMPONENTS.map(([kind]) => kind);
    for (const kind of [
      'relay',
      'rack-unit',
      'motor-unit',
      'plc-power',
      'plc-cpu',
    ])
      expect(
        gallery[kinds.indexOf(kind as (typeof kinds)[number])].group.userData
          .galleryControls,
      ).not.toContain('LOAD');
  });

  it('dev0 pedestal reset re-installs removed exhibits and their subcomponents', () => {
    const kit = createPanelKit();
    const gallery = createMachineGallery(kit);
    for (const plinth of gallery) {
      const portable: PortableObject[] = [];
      plinth.group.traverse((object) => {
        if (object.userData.portable)
          portable.push(object.userData.portable as PortableObject);
      });
      expect(portable.length).toBeGreaterThan(0);
      for (const object of portable) {
        object.component.setLocked(false);
        object.component.pickUp();
        object.detach();
        object.component.drop();
      }
      const reset = [...plinth.parts.uses].find(([object]) => {
        for (let at: Object3D | null = object; at; at = at.parent)
          if (at.name.includes('reset/replace')) return true;
        return false;
      });
      expect(reset).toBeDefined();
      reset![1]();
      for (const object of portable)
        expect(object.component.phase.value).toBe('installed');
      plinth.dispose();
      disposeKit(kit, plinth.group);
    }
  });

  it('exhibits every installed device on a separate, true-size referenced plinth', () => {
    const kit = createPanelKit();
    const gallery = createMachineGallery(kit);
    const mcc = createRetroEncabulatorMcc(kit);
    const exhibited = new Set<string>();
    expect(gallery).toHaveLength(MACHINE_COMPONENTS.length);
    for (const plinth of gallery) {
      const devices: Object3D[] = [];
      plinth.group.traverse((o) => {
        if (
          o.userData.machineComponentKind &&
          !o.parent?.userData.machineComponentKind
        )
          devices.push(o);
      });
      expect(devices).toHaveLength(1);
      const device = devices[0];
      // An exhibit cannot be pickable without a validated drop sound/profile.
      expect(device.userData.portable).toBeDefined();
      device.traverse((object) => {
        const portable = object.userData.portable as PortableObject | undefined;
        if (portable)
          expect(() =>
            assertDropProfile(portable.component.dropProfile),
          ).not.toThrow();
      });
      exhibited.add(device.userData.machineComponentKind);
      expect(device.scale.toArray()).toEqual([1, 1, 1]);
      expect(device.userData.machineReference.source).toMatch(/^https:/);
      const extent = new Box3().setFromObject(device);
      expect(extent.min.y).toBeCloseTo(0.98);
      expect(extent.max.x - extent.min.x).toBeLessThan(0.9);
    }
    expect(exhibited).toEqual(
      new Set(MACHINE_COMPONENTS.map(([kind]) => kind)),
    );
    for (const device of mcc.components)
      expect(exhibited.has(device.kind)).toBe(true);
    for (let i = 0; i < MACHINE_GALLERY_LAYOUT.length; i++) {
      for (let j = i + 1; j < MACHINE_GALLERY_LAYOUT.length; j++) {
        const a = MACHINE_GALLERY_LAYOUT[i],
          b = MACHINE_GALLERY_LAYOUT[j];
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(2);
      }
    }
    mcc.parts.dispose();
    for (const plinth of gallery) {
      plinth.dispose();
      disposeKit(kit, plinth.group);
    }
    disposeKit(kit, mcc.group);
  });

  it('keeps MAIN INCOMING live from the isolator, before the main disconnect', () => {
    const { mcc, dispose } = fixture();
    mcc.update(0.05);
    const named = (name: string) =>
      mcc.components.find((d) => d.object.name === name)!;
    const incoming = named('section1.bucket1: breaker');
    const main = named('section1.bucket2: breaker');
    const contact = mcc.components.find((d) => d.kind === 'contactor')!;
    // Everything starts off, the isolator too: nothing is live.
    expect(incoming.active.value).toBe(false);
    expect(main.active.value).toBe(false);
    // The isolator on, the main disconnect off: the supply is in, no further.
    expect(isolate(mcc)).toBe(true);
    expect(incoming.active.value).toBe(true);
    expect(main.active.value).toBe(false);
    expect(contact.active.value).toBe(false);
    main.breaker!.operate();
    expect(main.active.value).toBe(true);
    expect(contact.active.value).toBe(true);
    // Opening the isolator kills everything, MAIN INCOMING too.
    expect(isolate(mcc)).toBe(true);
    expect(incoming.active.value).toBe(false);
    expect(main.active.value).toBe(false);
    expect(contact.active.value).toBe(false);
    expect(isolate(mcc)).toBe(true);
    expect(incoming.active.value).toBe(true);
    expect(contact.active.value).toBe(true);
    dispose();
  });

  it('drops an installed starter when its breaker trips or control fuse blows', () => {
    const { mcc, dispose } = fixture();
    mcc.update(0.05);
    isolate(mcc);
    mcc.components
      .find((d) => d.object.name === 'section1.bucket2: breaker')!
      .breaker!.operate();
    const contact = mcc.components.find((d) => d.kind === 'contactor')!;
    const prefix = contact.object.name.split(':')[0];
    const breaker = mcc.components.find(
      (d) => d.kind === 'breaker' && d.object.name.startsWith(prefix + ':'),
    )!;
    const fuse = mcc.components.find(
      (d) => d.kind === 'fuse' && d.object.name.startsWith(prefix + ':'),
    )!;
    expect(contact.active.value).toBe(true);
    breaker.test();
    expect(contact.active.value).toBe(false);
    breaker.repair();
    expect(contact.active.value).toBe(false);
    breaker.breaker!.operate();
    expect(contact.active.value).toBe(true);
    fuse.test();
    expect(fuse.faulted.value).toBe(true);
    expect(contact.active.value).toBe(false);
    fuse.repair();
    expect(contact.active.value).toBe(true);
    dispose();
  });
});

it('mounts the trial PCB backplanes only inside closed, culled buckets', () => {
  const { mcc, interiors, dispose } = fixture();
  const boards: Object3D[] = [];
  mcc.group.traverse((o) => {
    if (o.userData.pcbBackplane) boards.push(o);
  });
  expect(boards.length).toBeGreaterThanOrEqual(2);
  for (const board of boards) {
    let owner = board.parent;
    while (owner && !interiors.includes(owner as Group)) owner = owner.parent;
    expect(owner).not.toBeNull();
    expect(owner!.visible).toBe(
      owner!.userData.interiorVisibility === 'always',
    );
    expect(board.scale.toArray()).toEqual([1, 1, 1]);
  }
  mcc.openAll(true);
  mcc.update(0.1);
  for (const interior of interiors) expect(interior.visible).toBe(true);
  dispose();
});

it('services each backplane card independently and propagates supply/CPU loss', () => {
  const kit = createPanelKit();
  const assembly = machineComponent(kit, 'backplane');
  const supply = assembly.cards!.find((c) => c.kind === 'plc-power')!;
  const cpu = assembly.cards!.find((c) => c.kind === 'plc-cpu')!;
  const output = assembly.cards!.find((c) => c.kind === 'plc-output')!;
  expect(assembly.cards).toHaveLength(5);
  expect(
    new Set(
      assembly.cards!.map((card) => card.object.userData.boardDesignation.type),
    ).size,
  ).toBe(5);
  expect(output.active.value).toBe(true);
  const events: string[] = [];
  assembly.onEvent((_, name) => events.push(name));
  assembly.uses.get([...supply.uses.keys()][0])!();
  assembly.update(1);
  expect(supply.service!.connected.state.value).toBe(false);
  expect(cpu.active.value).toBe(false);
  expect(output.active.value).toBe(false);
  expect(events).toContain(supply.object.name);
  expect(
    supply.object.getObjectByName('Withdrawable card')!.position.z,
  ).toBeGreaterThan(0.178);
  assembly.uses.get([...supply.uses.keys()][0])!();
  assembly.update(1);
  expect(
    supply.object.getObjectByName('Withdrawable card')!.position.z,
  ).toBeCloseTo(0);
  expect(output.active.value).toBe(true);
  cpu.service!.connected.flip();
  expect(supply.active.value).toBe(true);
  expect(output.active.value).toBe(false);
  cpu.repair();
  assembly.test();
  expect(supply.active.value).toBe(false);
  expect(assembly.faulted.value).toBe(true);
  assembly.repair();
  expect(output.active.value).toBe(true);
  assembly.dispose();
  disposeKit(kit, assembly.object);
});

it('cannot electrically reseat a Pepperdyne card after it has been picked up', () => {
  const kit = createPanelKit();
  const assembly = machineComponent(kit, 'backplane');
  const cpu = assembly.cards!.find((card) => card.kind === 'plc-cpu')!;
  const output = assembly.cards!.find((card) => card.kind === 'plc-output')!;
  const portable = cpu.object.userData.portable;
  portable.component.pickUp();
  portable.detach();
  cpu.repair();
  assembly.repair();
  for (const use of cpu.uses.values()) use();
  expect(cpu.active.value).toBe(false);
  expect(output.active.value).toBe(false);
  expect(cpu.object.userData.manufacturer).toBe('Pepperdyne');
  assembly.dispose();
  disposeKit(kit, assembly.object);
});

it('starts off, and the isolator and main disconnect supply every bucket, including the PLC', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  const consumers = mcc.components.filter((d) =>
    ['contactor', 'relay', 'plc-power', 'plc-cpu'].includes(d.kind),
  );
  expect(consumers.length).toBeGreaterThan(5);
  expect(consumers.every((d) => !d.active.value)).toBe(true);
  expect(mcc.supply.value).toBe(false);
  expect(main.breaker!.closed.value).toBe(false);
  // The main disconnect alone does nothing while the isolator is off.
  main.breaker!.operate();
  mcc.update(3);
  expect(consumers.every((d) => !d.active.value)).toBe(true);
  isolate(mcc);
  expect(mcc.supply.value).toBe(true);
  mcc.update(3);
  expect(consumers.every((d) => d.active.value)).toBe(true);
  main.breaker!.operate();
  mcc.update(0.1);
  expect(consumers.every((d) => !d.active.value)).toBe(true);
  dispose();
});

it('keeps windowed PLC contents visible and supports a per-bucket override', () => {
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit, {
    interiorVisibility: {
      'section1.bucket3': 'always',
      'section5.bucket1': 'when-open',
    },
  });
  mcc.update(0.1);
  const contents: Object3D[] = [];
  mcc.group.traverse((o) => {
    if (o.name.endsWith(' contents')) contents.push(o);
  });
  expect(contents[0].visible).toBe(true);
  expect(contents.find((o) => o.name.includes('PLC-5'))!.visible).toBe(false);
  mcc.parts.dispose();
  disposeKit(kit, mcc.group);
});

it('fixes the motherboard and leaves five sockets when the expansion cards are removed', () => {
  const { mcc, dispose } = fixture();
  const motherboard = mcc.components.find((d) => d.kind === 'backplane')!;
  expect(motherboard.attachment).toBe('fixed');
  expect(motherboard.object.userData.portable).toBeUndefined();
  const sockets: Object3D[] = [];
  motherboard.object.traverse((o) => {
    if (o.userData.cardSlot !== undefined) sockets.push(o);
  });
  expect(sockets).toHaveLength(5);
  for (const card of motherboard.cards!) {
    expect(card.attachment).toBe('detachable');
    card.object.removeFromParent();
  }
  expect(sockets.every((o) => o.parent !== null)).toBe(true);
  dispose();
});

it('fails like an engine giving up, stalls, restarts from RESET and dies for good', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  // Nothing fails while the machine is off.
  mcc.fail('sputter');
  expect(mcc.failure).toBeNull();
  isolate(mcc);
  main.breaker!.operate();
  mcc.update(3);
  // A hiccup passes, and leaves it running.
  mcc.fail('hiccup');
  expect(mcc.failure).toBe('hiccup');
  mcc.update(2);
  expect(mcc.failure).toBeNull();
  // A sputter leaves it stalled, powered but stopped, until RESET.
  mcc.fail('sputter');
  for (let t = 0; t < 7; t += 0.1) mcc.update(0.1);
  expect(mcc.stalled).toBe(true);
  expect(main.active.value).toBe(true);
  const reset = mcc.controls.get('automation.reset')!.position as {
    value: number;
  };
  reset.value++;
  mcc.update(0.05);
  expect(mcc.failure).toBe('restart');
  for (let t = 0; t < 5; t += 0.1) mcc.update(0.1);
  expect(mcc.failure).toBeNull();
  // The kaput trips the main breaker: dead.
  mcc.fail('kaput');
  for (let t = 0; t < 9; t += 0.1) mcc.update(0.1);
  expect(main.breaker!.position.value).toBe('tripped');
  expect(main.active.value).toBe(false);
  mcc.recover();
  expect(main.active.value).toBe(true);
  dispose();
});

it('in the kaput, smokes from two low units, soots those above and lights almost every fault', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  isolate(mcc);
  main.breaker!.operate();
  mcc.update(3);
  const plumes: Object3D[] = [];
  const soot: Mesh[] = [];
  const windows: Mesh[] = [];
  mcc.group.traverse((o) => {
    if (o.name === 'Burning unit smoke') plumes.push(o);
    if (o.name === 'Soot') soot.push(o as Mesh);
    if (o.name.startsWith('Annunciator ')) windows.push(o as Mesh);
  });
  expect(plumes).toHaveLength(2);
  expect(windows).toHaveLength(12);
  // Each sooted face hangs on a door at or above a burning unit.
  const doors = soot.map((s) => {
    let door = '';
    s.parent!.traverse((o) => {
      if (!door && / (door|cover)$/.test(o.name)) door = o.name;
    });
    return door;
  });
  expect(doors).toEqual(
    expect.arrayContaining([
      'Section 2 MAIN DRIVE MOTOR M-101 door',
      'Section 2 FEED MOTOR M-102 door',
      'Section 2 AUXILIARY MOTOR M-103 door',
      'Section 6 MAIN ENCABULATOR DRIVE VFD-601 door',
      'Section 6 DRIVE ISOLATOR 480 VAC door',
    ]),
  );
  expect(doors).toHaveLength(5);
  // The soot never takes a click.
  const ray = new Raycaster(new Vector3(0, 1, 5), new Vector3(0, 0, -1));
  for (const s of soot) expect(ray.intersectObject(s)).toEqual([]);
  expect(plumes.some((p) => p.visible)).toBe(false);
  expect(soot.some((s) => s.visible)).toBe(false);

  mcc.fail('kaput');
  for (let t = 0; t < 4; t += 0.1) mcc.update(0.1);
  expect(plumes.every((p) => p.visible)).toBe(true);
  // Cleared within about eight seconds of the first bang; dead, sooted.
  for (let t = 4; t < 20; t += 0.1) mcc.update(0.1);
  expect(plumes.some((p) => p.visible)).toBe(false);
  for (const s of soot) {
    expect(s.visible).toBe(true);
    expect((s.material as Material).opacity).toBeGreaterThan(0.6);
  }
  expect(main.active.value).toBe(false);
  // On its battery, the annunciator still shows the faults: all but two
  // windows, the red trips flashing and the amber ones steady.
  const lit = (w: Mesh) =>
    (
      w.material as Material & { color: { getHexString(): string } }
    ).color.getHexString() !== '8e8a80';
  const samples = Array.from({ length: 10 }, () => {
    mcc.update(0.05);
    return windows.map(lit);
  });
  const ever = windows.map((_, i) => samples.some((s) => s[i]));
  const always = windows.map((_, i) => samples.every((s) => s[i]));
  expect(ever.filter(Boolean)).toHaveLength(10);
  const flashing = windows.filter((_, i) => ever[i] && !always[i]);
  expect(flashing.map((w) => w.name).sort()).toEqual([
    'Annunciator BREAKER TRIP',
    'Annunciator BUS OVERVOLT',
    'Annunciator GROUND FAULT',
    'Annunciator PHASE LOSS',
  ]);
  for (const w of flashing) expect(w.userData.alarmColour).toBe('#ff4a30');
  // Put back as it was: clean, and the faults cleared.
  mcc.recover();
  mcc.update(0.1);
  expect(soot.some((s) => s.visible)).toBe(false);
  dispose();
});

it('brings up fewer faults in the lighter failures', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  isolate(mcc);
  main.breaker!.operate();
  mcc.update(3);
  const windows: Mesh[] = [];
  mcc.group.traverse((o) => {
    if (o.name.startsWith('Annunciator ')) windows.push(o as Mesh);
  });
  const lit = () =>
    windows.filter(
      (w) =>
        (
          w.material as Material & { color: { getHexString(): string } }
        ).color.getHexString() !== '8e8a80',
    ).length;
  const most = (seconds: number) => {
    let n = 0;
    for (let t = 0; t < seconds; t += 0.05) {
      mcc.update(0.05);
      n = Math.max(n, lit());
    }
    return n;
  };
  mcc.fail('hiccup');
  const hiccup = most(1.5);
  mcc.recover();
  mcc.update(0.1);
  mcc.fail('sputter');
  const sputter = most(7);
  expect(hiccup).toBe(1);
  expect(sputter).toBe(3);
  dispose();
});

it('shows amber while booting, green running and red flashing in every fault', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  const stack = mcc.group.getObjectByName('Machine stack light')!;
  const tiers = () => (stack.userData.lit as boolean[]).join();
  /** Which tiers light over `seconds`, and whether red flashes. */
  const watch = (seconds: number) => {
    const seen = new Set<string>();
    for (let t = 0; t < seconds; t += 0.1) {
      mcc.update(0.1);
      seen.add(tiers());
    }
    return [...seen].sort();
  };
  mcc.update(0.1);
  expect(tiers()).toBe('false,false,false');
  isolate(mcc);
  main.breaker!.operate();
  // Past the lamp test, the screens still booting.
  for (let t = 0; t < 3; t += 0.25) mcc.update(0.25);
  expect(tiers()).toBe('false,true,false');
  mcc.update(25);
  mcc.update(0.05);
  expect(tiers()).toBe('false,false,true');
  const redFlashing = ['false,false,false', 'true,false,false'];
  mcc.fail('hiccup');
  expect(watch(1.4)).toEqual(redFlashing);
  mcc.update(0.5);
  mcc.update(0.5);
  expect(tiers()).toBe('false,false,true');
  mcc.fail('sputter');
  expect(watch(7)).toEqual(redFlashing);
  mcc.restart();
  mcc.update(0.5);
  expect(tiers()).toBe('false,true,false');
  for (let t = 0; t < 5; t += 0.25) mcc.update(0.25);
  expect(tiers()).toBe('false,false,true');
  mcc.fail('kaput');
  for (let t = 0; t < 9; t += 0.25) mcc.update(0.25);
  expect(main.active.value).toBe(false);
  // Still flashing on the battery, the machine dead.
  expect(watch(3)).toEqual(redFlashing);
  mcc.recover();
  mcc.update(0.05);
  expect(tiers()).not.toContain('true,false,false');
  dispose();
});

it('drives the gauge above BOOST into the red band and returns when released', () => {
  const { mcc, dispose } = fixture();
  isolate(mcc);
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  main.breaker!.operate();
  mcc.update(0);
  mcc.update(4);
  const gauge = mcc.group.getObjectByName('Panendermic fan pressure gauge')!;
  const pivot = gauge.children.find((child) => child.type === 'Group')!;
  const reading = () => (Math.PI * 0.75 - pivot.rotation.z) / (Math.PI * 1.5);
  const boost = mcc.group.getObjectByName('BOOST LED pushbutton')!;
  let cap: Object3D | undefined;
  boost.traverse((object) => {
    if (mcc.parts.uses.has(object)) cap = object;
  });
  expect(reading()).toBeLessThan(0.8);
  expect(work(mcc, cap!)).toBe(true);
  mcc.update(1);
  expect(reading()).toBeGreaterThan(0.8);
  expect(work(mcc, cap!)).toBe(true);
  mcc.update(1);
  expect(reading()).toBeLessThan(0.8);
  main.breaker!.operate();
  mcc.update(1);
  expect(reading()).toBeCloseTo(0);
  dispose();
});

it('indicates incoming supply and contact state on the shared moulded-case breaker', () => {
  const kit = createPanelKit();
  const power = signal(false);
  const breaker = machineComponent(kit, 'breaker', { power });
  const lamp = breaker.object.getObjectByName('Breaker status indicator')!;
  const indication = () => {
    breaker.update(0);
    return lamp.userData.indication;
  };
  expect(indication()).toBe('black');
  power.value = true;
  expect(indication()).toBe('green');
  breaker.breaker!.operate();
  expect(indication()).toBe('red');
  power.value = false;
  expect(indication()).toBe('black');
  power.value = true;
  breaker.breaker!.operate();
  breaker.breaker!.trip();
  expect(indication()).toBe('red');
  breaker.dispose();
  disposeKit(kit, breaker.object);
});

it('shows the Automation isolator green on, red off, and dark without upstream power', () => {
  const { mcc, dispose } = fixture();
  const status = mcc.group.getObjectByName(
    'Automation cabinet isolator status',
  )!;
  const lens = status.getObjectByName('Automation isolator square LED') as Mesh;
  expect((lens.geometry as BoxGeometry).parameters.width).toBe(0.011);
  expect((lens.geometry as BoxGeometry).parameters.height).toBe(0.011);
  expect(status.userData.indication).toBe('dark');
  status.traverse((object) => expect(mcc.parts.uses.has(object)).toBe(false));
  isolate(mcc);
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  const automation = mcc.components.find(
    (d) => d.object.name === 'section5.bucket1: breaker',
  )!;
  main.breaker!.operate();
  mcc.update(1);
  expect(status.userData.indication).toBe('green');
  automation.breaker!.operate();
  mcc.update(1);
  expect(status.userData.indication).toBe('red');
  main.breaker!.operate();
  mcc.update(1);
  expect(status.userData.indication).toBe('dark');
  dispose();
});

it('lets Level 0 operate both pumps directly without lesson feed gates or forced faults', () => {
  const kit = createPanelKit();
  const { mcc, plant } = createLevel0Machine(kit);
  const breaker = (id: string) =>
    mcc.components.find((device) => device.object.name === `${id}: breaker`)!
      .breaker!;
  expect(mcc.supply.value).toBe(false);
  expect(breaker('section1.bucket2').closed.value).toBe(false);
  expect(breaker('section3.bucket1').closed.value).toBe(false);
  expect(breaker('section7.bucket2').closed.value).toBe(false);
  isolate(mcc);
  // Level 0's power interlock key starts out; turn it in to close the main disconnect.
  plant.control.interlockKey.set(true);
  breaker('section1.bucket2').operate();
  mcc.update(3);
  for (const id of ['section3.bucket1', 'section7.bucket2']) {
    breaker(id).operate();
    mcc.update(1);
    expect(
      mcc.components.find((device) => device.object.name === `${id}: breaker`)!
        .active.value,
    ).toBe(true);
  }
  mcc.update(60);
  expect(mcc.failure).toBeNull();
  expect(mcc.stalled).toBe(false);
  mcc.parts.dispose();
  disposeKit(kit, mcc.group);
});

it('keeps Level 0 machine state separate from another room instance', () => {
  const sandboxKit = createPanelKit();
  const other = fixture();
  const { mcc } = createLevel0Machine(sandboxKit);
  expect(mcc.world).not.toBe(other.mcc.world);
  isolate(mcc);
  expect(mcc.supply.value).toBe(true);
  expect(other.mcc.supply.value).toBe(false);
  mcc.parts.dispose();
  disposeKit(sandboxKit, mcc.group);
  other.dispose();
});

it('stops the feed motor on its own emergency stop until HAND OFF AUTO goes through OFF', () => {
  const { mcc, dispose } = fixture();
  isolate(mcc);
  mcc.circuits.get('section1.bucket2')!.breaker!.breaker!.operate();
  const feed = mcc.circuits.get('section2.bucket2')!;
  mcc.update(3);
  // AUTO runs it for 30 s in every 40.
  expect(feed.running.value).toBe(true);
  const door = (label: string) => {
    let hinge: Object3D | undefined;
    mcc.group.traverse((o) => {
      if (o.name === `Section 2 ${label} door`) hinge = o.parent!;
    });
    return hinge!;
  };
  const inside = (root: Object3D, part: string) => {
    let found: Object3D | undefined;
    root.traverse((o) => {
      if (found || !mcc.parts.uses.has(o)) return;
      for (let p: Object3D | null = o; p && p !== root; p = p.parent)
        if (p.name === part) found = o;
    });
    return found!;
  };
  const stop = inside(door('FEED MOTOR M-102'), 'EMERGENCY STOP');
  mcc.parts.uses.get(stop)!();
  mcc.update(0.5);
  expect(feed.running.value).toBe(false);
  mcc.parts.uses.get(stop)!();
  mcc.update(0.5);
  expect(feed.running.value).toBe(false);
  const hoa = inside(door('FEED MOTOR M-102'), 'selector');
  mcc.parts.uses.get(hoa)!(-1);
  mcc.update(0.2);
  expect(mcc.controls.get('feed.hoa')!.position.value).toBe(1);
  mcc.parts.uses.get(hoa)!(-1);
  mcc.update(0.5);
  expect(mcc.controls.get('feed.hoa')!.position.value).toBe(0);
  expect(feed.running.value).toBe(true);
  // The auxiliary motor's emergency stop is still the one Level 2 watches.
  const aux = inside(door('AUXILIARY MOTOR M-103'), 'EMERGENCY STOP');
  mcc.parts.uses.get(aux)!();
  expect(mcc.controls.get('auxiliary.stop')!.position.value).toBe(1);
  dispose();
});

describe('MCC rear service access', () => {
  it('adds three closed leaves without changing the front door identities or machine state', () => {
    const { mcc, dispose } = fixture();
    expect(mcc.rear.doors.map((leaf) => leaf.section)).toEqual([4, 5, 5]);
    expect(mcc.rear.doors.every((leaf) => !leaf.part.door.state.value)).toBe(
      true,
    );
    const front = [...mcc.doors.values()].map((door) => door.value);
    for (const leaf of mcc.rear.doors) {
      const fasteners = [...leaf.part.uses.keys()].filter((o) =>
        o.name.endsWith('fastener'),
      );
      expect(fasteners).toHaveLength(2);
      leaf.part.uses.get(fasteners[0])!();
      expect(leaf.part.door.state.value).toBe(true);
      expect([...mcc.doors.values()].map((door) => door.value)).toEqual(front);
      expect(mcc.mainBreaker.position.value).toBe('off');
      leaf.part.uses.get(fasteners[1])!();
      expect(leaf.part.door.state.value).toBe(false);
    }
    dispose();
  });

  it('renders a bucket through either access and keeps it visible while its rear leaf closes', () => {
    const { mcc, interiors, dispose } = fixture();
    const instruments = interiors.filter((o) =>
      o.name.startsWith('Section 4 '),
    );
    expect(instruments).toHaveLength(4);
    const rear = mcc.rear.doors[0];
    expect(rear.interior.visible).toBe(false);
    rear.part.door.set(true);
    mcc.update(0.05);
    expect(rear.interior.visible).toBe(true);
    expect(instruments.every((o) => o.visible)).toBe(true);
    expect(mcc.doors.get('section4.bucket1')!.value).toBe(false);
    const back = [...rear.part.uses.keys()].find((o) =>
      o.name.endsWith('inside cover'),
    )!;
    rear.part.uses.get(back)!();
    mcc.update(0.01);
    expect(rear.interior.visible).toBe(true);
    for (let i = 0; i < 80; i++) mcc.update(0.05);
    expect(rear.interior.visible).toBe(false);
    expect(instruments.every((o) => !o.visible)).toBe(true);
    // Front access continues independently when rear access is closed.
    const frontLatch = [...mcc.parts.uses.keys()].find(
      (o) =>
        o.name.includes('Section 4 ENCABULATOR CONTROL') &&
        o.name.endsWith(' latch'),
    );
    expect(frontLatch).toBeDefined();
    work(mcc, frontLatch!);
    mcc.update(0.05);
    expect(instruments[0].visible).toBe(true);
    dispose();
  });

  it('keeps opaque plates and guarded busways behind the new rear openings', () => {
    const { mcc, dispose } = fixture();
    const rear = mcc.rear.doors[0];
    rear.part.door.set(true);
    for (let i = 0; i < 80; i++) mcc.update(0.05);
    mcc.group.updateMatrixWorld(true);
    const ray = new Raycaster(
      new Vector3(-0.127, 1.3, -1),
      new Vector3(0, 0, 1),
    );
    const hit = ray.intersectObject(mcc.group, true)[0];
    expect(hit).toBeDefined();
    expect(hit.point.z).toBeLessThan(-0.37);
    expect(hit.point.z).toBeGreaterThan(-0.52);
    expect(mcc.rear.routes.every((route) => mcc.circuits.has(route.id))).toBe(
      true,
    );
    expect(mcc.rear.routes).toHaveLength(6);
    // Rear-only dressing is pruned from picking as well as rendering.
    rear.part.door.set(false);
    for (let i = 0; i < 80; i++) mcc.update(0.05);
    expect(ray.intersectObject(rear.interior, true)).toHaveLength(0);
    dispose();
  });
});

it('provides a genuine grommeted opening through each rear service wireway partition', () => {
  const { mcc, dispose } = fixture();
  const partitions: Object3D[] = [];
  mcc.group.traverse((o) => {
    if (o.name === 'Grommeted wireway partition') partitions.push(o);
  });
  expect(partitions).toHaveLength(2);
  mcc.group.updateMatrixWorld(true);
  for (const partition of partitions) {
    // A ray through a slot traverses sheet steel, rather than disappearing
    // behind a decorative black rectangle over a solid partition.
    const section = partitions.indexOf(partition) + 4;
    for (const route of mcc.rear.routes.filter((r) => r.section === section)) {
      const y = route.points[0][1] - partition.position.y;
      const origin = partition.localToWorld(new Vector3(-0.178, y, -0.1));
      const direction = new Vector3(0, 0, 1).transformDirection(
        partition.matrixWorld,
      );
      expect(
        new Raycaster(origin, direction).intersectObject(partition, true),
      ).toHaveLength(0);
    }
  }
  dispose();
});

it('places the first low round data entry on its real rear plate, independent of scene scale', () => {
  const { mcc, dispose } = fixture();
  const port = mcc.rear.dataPort;
  mcc.group.updateMatrixWorld(true);
  const metrePosition = port.getWorldPosition(new Vector3());
  expect(metrePosition.x).toBeCloseTo(-1.8105);
  expect(metrePosition.y).toBeCloseTo(0.1822);
  expect(metrePosition.z).toBeCloseTo(-0.516);
  mcc.group.scale.setScalar(3);
  mcc.group.position.set(6, 0, 12);
  mcc.group.updateMatrixWorld(true);
  expect(
    port
      .getWorldPosition(new Vector3())
      .distanceTo(metrePosition.multiplyScalar(3).add(new Vector3(6, 0, 12))),
  ).toBeLessThan(0.000001);
  expect(port.parent!.getObjectByName('Right entry blank')).toBeUndefined();
  dispose();
});

it('preserves Level2 isolation, five removable cards and RESET after their removal', () => {
  const { mcc, dispose } = fixture({
    incomingOn: false,
    driveTrainWithMains: true,
  });
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.1) mcc.update(0.1);
  };
  expect(mcc.supply.value).toBe(false);
  expect(mcc.mainBreaker.closed.value).toBe(false);
  isolate(mcc);
  mcc.mainBreaker.operate();
  run(16);
  expect(mcc.mainBreaker.closed.value).toBe(true);
  for (const name of [
    'drive.speed',
    'fan.mode',
    'fan.boost',
    'hydraulic.key',
    'incoming.phase',
    'main.kirk',
    'feed.hoa',
    'annunciator.tests',
    'auxiliary.stop',
    'automation.reset',
  ])
    expect(mcc.controls.has(name), name).toBe(true);
  const cards = mcc.components
    .filter((d) => d.kind === 'backplane')
    .flatMap((d) => d.cards ?? []);
  expect(cards).toHaveLength(5);
  cards.find((d) => d.kind === 'plc-power')!.test();
  mcc.fail('sputter');
  run(7);
  expect(mcc.stalled).toBe(true);
  mcc.door(14);
  expect(mcc.doors.get('section5.bucket1')!.value).toBe(true);
  mcc.circuits.get('section5.bucket1')!.breaker!.breaker!.operate();
  for (const card of cards) {
    const portable = card.object.userData.portable as PortableObject;
    portable.component.setLocked(false);
    portable.component.pickUp();
    portable.detach();
    expect(portable.component.phase.value).toBe('held');
    expect(card.active.value).toBe(false);
  }
  let plcHinge: Object3D | undefined;
  mcc.group.traverse((object) => {
    if (
      object.name.includes('AUTOMATION CONTROL') &&
      object.name.endsWith(' door')
    )
      plcHinge = object.parent!;
  });
  let reset: Object3D | undefined;
  for (const object of mcc.parts.uses.keys()) {
    let resetButton = false;
    for (let at: Object3D | null = object; at; at = at.parent) {
      if (at.name === 'RESET push button') resetButton = true;
      if (at === plcHinge && resetButton) reset = object;
    }
    if (reset) break;
  }
  expect(reset).toBeDefined();
  work(mcc, reset!);
  mcc.update(0.1);
  expect(mcc.failure).toBe('restart');
  run(5);
  expect(mcc.failure).toBeNull();
  expect(mcc.mainBreaker.closed.value).toBe(true);
  mcc.fail('kaput');
  run(9);
  expect(mcc.mainBreaker.closed.value).toBe(false);
  dispose();
});

it('merges only meshes that nothing changes afterwards', () => {
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit, { incomingOn: true });
  expect(mcc.merged.length).toBeGreaterThan(500);
  const watch = watchMerged(mcc.merged);
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.1) {
      mcc.update(0.1);
      watch.check();
    }
  };
  mcc.mainBreaker.operate();
  for (const [, unit] of mcc.circuits)
    if (unit.breaker?.breaker?.position.value === 'off')
      unit.breaker.breaker.operate();
  run(30);
  mcc.openAll(true);
  run(2);
  // Every input, both ways, then every protective device failed.
  for (const use of mcc.parts.uses.values()) {
    use(1);
    run(0.3);
    use(-1);
    run(0.3);
  }
  mcc.openAll(true);
  for (const [, unit] of mcc.circuits)
    for (const device of unit.devices) device.test();
  run(10);
  for (const failure of FAILURES) {
    mcc.recover();
    mcc.fail(failure.id);
    run(failure.seconds + 5);
  }
  mcc.recover();
  mcc.openAll(false);
  run(30);
  expect(
    watch.changed().map((mesh) => mesh.userData.mergedFrom as string),
  ).toEqual([]);
  mcc.parts.dispose();
  disposeKit(kit, mcc.group);
}, 120_000);
