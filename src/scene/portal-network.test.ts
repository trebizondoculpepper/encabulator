import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  CHAIN,
  devPortals,
  devWalls,
} from '../toolkit/gallery/logic/dev-room-links';
import { slide } from '../toolkit/controls/logic/walk-collision';
import { createPortals } from '../toolkit/gallery/views/portals';
import { LOOP_ROOMS } from './dev-corridor';

vi.mock('../toolkit/components/core/views/screens', () => ({
  createLabelTexture: () => ({
    texture: new Texture(),
    width: 256,
    height: 48,
  }),
}));
afterEach(() => vi.unstubAllGlobals());

/** Where each journey went: the `dev-room` events dispatched. */
function journeys() {
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { dispatchEvent });
  return () => dispatchEvent.mock.calls.map((call) => call[0].detail);
}

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const WALKER_RADIUS = 0.25;

/**
 * Every room is wired to dev_corridor (`doc/prompts/009`): its one way out
 * leads back to the corridor, which has a door to it. Each way out must
 * work both ways a player uses it, walking into it and clicking it, tested
 * from where a player arrives in front of it.
 */
describe('the doors and ways out', () => {
  for (const id of CHAIN.filter((room) => room !== 'dev_corridor'))
    for (const portal of devPortals(id, bounds, 1)) {
      it(`${id}: its way out leads to the corridor`, () => {
        expect(portal.to).toBe('dev_corridor');
      });

      it(`${id}: its way out can be walked into`, () => {
        const went = journeys();
        const portals = createPortals(id, devPortals(id, bounds, 1), 0, 1);
        const walls = devWalls(bounds, 1, 3);
        // Arrive as if back from the corridor (facing into the room,
        // forward being (sin yaw, -cos yaw)), then turn and walk at it.
        const start = portals.arrival(portal.to)!;
        expect(start).not.toBeNull();
        const step = {
          x: -Math.sin(start.yaw) * 0.05,
          z: Math.cos(start.yaw) * 0.05,
        };
        let at = { x: start.x, z: start.z };
        for (let i = 0; i < 80 && went().length === 0; i++) {
          at = slide(walls, at.x, at.z, step.x, step.z, WALKER_RADIUS);
          portals.update(1 / 60, at.x, at.z);
        }
        expect(went()).toEqual([{ to: portal.to, from: id }]);
        portals.dispose();
      });

      it(`${id}: its way out can be clicked`, () => {
        const went = journeys();
        const portals = createPortals(id, devPortals(id, bounds, 1), 0, 1);
        const patch = [...portals.uses.keys()].find(
          (m) => m.name === `Portal to ${portal.to}`,
        );
        expect(patch).toBeDefined();
        portals.uses.get(patch!)!();
        expect(went()).toEqual([{ to: portal.to, from: id }]);
        portals.dispose();
      });

      it(`${id}: the corridor has a door to it`, () => {
        expect(LOOP_ROOMS).toContain(id);
      });
    }

  it('leaves the corridor with no portals: it has doors', () => {
    expect(devPortals('dev_corridor', bounds, 1)).toEqual([]);
  });
});
