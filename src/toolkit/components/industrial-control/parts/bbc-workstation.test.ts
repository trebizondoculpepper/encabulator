import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh, TubeGeometry, Vector3 } from 'three';
import type { Color, Material } from 'three';
import { partAudio } from '../../core/audio/part-audio';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { bbcWorkstation } from './bbc-workstation';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BBC workstation exhibit', () => {
  it('retains all five original models at true scale and starts with a dark monitor', () => {
    const kit = createPanelKit();
    const exhibit = bbcWorkstation(kit);
    expect(exhibit.view.bbc.group.name).toBe('BbcMicroModelB');
    expect(exhibit.view.cub.group.name).toBe('MicrovitecCub');
    expect(exhibit.view.disk.group.name).toBe('BbcExternalDiskDrive');
    expect(exhibit.view.chair.group.name).toBe('Office chair');
    expect(exhibit.view.width).toBeGreaterThan(1);
    expect(exhibit.view.bbc.group.scale.x).toBe(1);
    expect(exhibit.view.cub.screen.visible).toBe(false);
    const bbc = new Box3().setFromObject(exhibit.view.bbc.group);
    expect(bbc.max.x - bbc.min.x).toBeCloseTo(0.41, 2);
    exhibit.dispose();
    disposeKit(kit, exhibit.object);
  });

  it('draws its lettered grey, red and brown keys in a few meshes, and seats the player facing the monitor', () => {
    const kit = createPanelKit();
    const exhibit = bbcWorkstation(kit);
    const keys = exhibit.view.bbc.group.getObjectByName('BBC keyboard keys')!;
    const meshes: Mesh[] = [];
    keys.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    // One a colour of cap, and one for every legend, from one atlas.
    expect(meshes.length).toBeLessThanOrEqual(5);
    const colours = new Set(
      meshes
        .map((m) => m.material as Material & { color?: Color; map?: unknown })
        .filter((m) => !m.map)
        .map((m) => `#${m.color!.getHexString()}`),
    );
    expect(colours).toEqual(new Set(['#5c5e5a', '#bf382c', '#6b5a3e']));
    expect(meshes.some((m) => (m.material as { map?: unknown }).map)).toBe(
      true,
    );
    const seat = vi.fn();
    exhibit.onSit(seat);
    exhibit.uses.get(exhibit.view.chair.group)!();
    expect(seat).toHaveBeenCalledOnce();
    const pose = seat.mock.calls[0][0];
    expect(pose.y).toBeCloseTo(1.18);
    expect(pose.yaw).toBeCloseTo(0);
    expect(pose.pitch).toBeLessThan(0);
    expect(
      exhibit.object.getObjectByName('Cub RGB signal cable to BBC RGB socket'),
    ).toBeDefined();
    exhibit.dispose();
    disposeKit(kit, exhibit.object);
  });

  it('joins both continuous mains cords to the actual rear connectors and distinct floor plugs for either model', () => {
    for (const imported of [false, true]) {
      const kit = createPanelKit();
      const exhibit = bbcWorkstation(kit, imported);
      exhibit.object.updateMatrixWorld(true);
      for (const [wireName, connectorName, plugName] of [
        [
          'BBC mains flex to floor power box',
          'BBC rear mains connector',
          'BBC floor power plug',
        ],
        [
          'Cub monitor mains flex',
          'Cub rear mains connector',
          'Cub floor power plug',
        ],
      ]) {
        const wire = exhibit.object.getObjectByName(
          wireName,
        ) as Mesh<TubeGeometry>;
        const curve = wire.geometry.parameters.path;
        const start = wire.localToWorld(curve.getPoint(0));
        const end = wire.localToWorld(curve.getPoint(1));
        expect(
          new Box3()
            .setFromObject(exhibit.object.getObjectByName(connectorName)!)
            .expandByScalar(0.002)
            .containsPoint(start),
        ).toBe(true);
        expect(
          new Box3()
            .setFromObject(exhibit.object.getObjectByName(plugName)!)
            .expandByScalar(0.002)
            .containsPoint(end),
        ).toBe(true);
        // Between the equipment and the rear edge, the wire clears the top.
        for (let i = 0; i <= 100; i++) {
          const point = curve.getPoint(i / 100);
          if (point.z > -exhibit.view.depth / 2)
            expect(point.y).toBeGreaterThan(exhibit.view.top);
        }
      }
      exhibit.dispose();
      disposeKit(kit, exhibit.object);
    }
  });

  it('boots from its real power rocker and cancels its positional recording when switched off or hidden', () => {
    const stop = vi.fn();
    const play = vi.spyOn(partAudio, 'play').mockReturnValue(stop);
    const kit = createPanelKit();
    const exhibit = bbcWorkstation(kit);
    const use = exhibit.uses.get(exhibit.view.bbc.group)!;
    expect(
      exhibit.object.getObjectByName('Floor-bolted workstation power box'),
    ).toBeDefined();
    expect(
      exhibit.object.getObjectByName('BBC mains flex to floor power box'),
    ).toBeDefined();
    expect(
      exhibit.object.getObjectByName('Cub monitor mains flex'),
    ).toBeDefined();
    use();
    exhibit.update(0.5);
    expect(exhibit.view.cub.screen.visible).toBe(true);
    expect(
      play.mock.calls.some(
        ([recipe, from]) =>
          'recording' in recipe &&
          from ===
            exhibit.view.group.getObjectByName('BBC internal loudspeaker'),
      ),
    ).toBe(true);
    const speaker = exhibit.view.group.getObjectByName(
      'BBC internal loudspeaker',
    )!;
    exhibit.object.position.set(6, 0, -4);
    const before = exhibit.view.bbc.group.getWorldPosition(new Vector3());
    const parent = exhibit.view.bbc.group.parent!;
    exhibit.view.bbc.group.removeFromParent();
    expect(
      speaker.getWorldPosition(new Vector3()).distanceTo(before),
    ).toBeLessThan(1e-9);
    parent.add(exhibit.view.bbc.group);
    use();
    exhibit.update(0);
    expect(stop).toHaveBeenCalled();
    expect(exhibit.view.cub.screen.visible).toBe(false);
    use();
    exhibit.setAudible(false);
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
    exhibit.dispose();
    disposeKit(kit, exhibit.object);
  });
});
