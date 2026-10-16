import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { CHAIN, devPortals, devWalls } from '../game/dev-room-links';
import { slide } from '../game/walk-collision';
import { createPortals } from './portals';

vi.mock('./screens', () => ({
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
 * Every way between the rooms must work both ways a player uses it:
 * walking into it and clicking it. Each room's portals are tested from
 * where a player arrives in front of them.
 */
describe('the portal network', () => {
  for (const id of CHAIN)
    for (const portal of devPortals(id, bounds, 1)) {
      it(`${id}: the portal to ${portal.to} can be walked into`, () => {
        const went = journeys();
        const portals = createPortals(id, devPortals(id, bounds, 1), 0, 1);
        const walls = devWalls(bounds, 1, 3);
        // Arrive as if back from the portal's room (facing into the room,
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

      it(`${id}: the portal to ${portal.to} can be clicked`, () => {
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

      it(`${id}: ${portal.to} has a way back`, () => {
        const back = devPortals(portal.to, bounds, 1).map((p) => p.to);
        expect(back).toContain(id);
      });
    }
});
