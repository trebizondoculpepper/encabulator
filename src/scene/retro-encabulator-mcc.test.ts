import { assertDropProfile } from '../game/drop-profile';
import type { PortableObject } from '../rendering/object-handling';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { Group, Material, Object3D } from 'three';
import { createPanelKit, disposeKit } from './eighties-controls';
import {
  createMachineGallery,
  createEmptyMachinePlinths,
  EMPTY_GALLERY_LAYOUT,
  MACHINE_GALLERY_LAYOUT,
} from '../rendering/machine-gallery';
import { machineComponent } from '../rendering/machine-components';
import { MACHINE_COMPONENTS } from '../game/machine-components';
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

function fixture() {
  const kit = createPanelKit();
  const mcc = createRetroEncabulatorMcc(kit);
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

describe('MCC bucket doors', () => {
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

  it('drops an installed starter when its breaker trips or control fuse blows', () => {
    const { mcc, dispose } = fixture();
    mcc.update(0.05);
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

it('starts off and the main disconnect supplies every bucket, including the PLC', () => {
  const { mcc, dispose } = fixture();
  const main = mcc.components.find(
    (d) => d.object.name === 'section1.bucket2: breaker',
  )!;
  const consumers = mcc.components.filter((d) =>
    ['contactor', 'relay', 'plc-power', 'plc-cpu'].includes(d.kind),
  );
  expect(consumers.length).toBeGreaterThan(5);
  expect(consumers.every((d) => !d.active.value)).toBe(true);
  main.breaker!.operate();
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
      'section1.bucket1': 'always',
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
