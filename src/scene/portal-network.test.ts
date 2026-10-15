import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEV_ROOMS,
  HALL,
  STATION_ROOMS,
  devPortals,
  devWalls,
} from '../game/dev-room-links';
import { slide } from '../game/walk-collision';
import { createPortals } from './portals';
import { createDoorStation } from './door-station';

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
 * Every way between the dev rooms must work both ways a player uses it:
 * walking into it and clicking it. Each room's wall portals are tested
 * from where a player arrives in front of them; the Hall's door station
 * from where a player arrives in front of each door.
 */
describe('the portal network', () => {
  for (const id of DEV_ROOMS.filter((r) => r !== HALL))
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
        const back =
          portal.to === HALL
            ? STATION_ROOMS
            : devPortals(portal.to, bounds, 1).map((p) => p.to);
        expect(back).toContain(id);
      });
    }

  for (const to of STATION_ROOMS) {
    it(`the Hall: the station door to ${to} can be walked through`, () => {
      const went = journeys();
      const station = createDoorStation(HALL, STATION_ROOMS, 1);
      const start = station.arrival(to)!;
      expect(start).not.toBeNull();
      // Turn round and walk back through the door.
      const { x } = start;
      let { z } = start;
      for (let i = 0; i < 80 && went().length === 0; i++) {
        z -= 0.05;
        station.update(1 / 60, x, z);
      }
      expect(went()).toEqual([{ to, from: HALL }]);
      station.dispose();
    });

    it(`the Hall: the station door to ${to} can be clicked`, () => {
      const went = journeys();
      const station = createDoorStation(HALL, STATION_ROOMS, 1);
      const doorway = [...station.uses.keys()].find(
        (m) => m.name === `Doorway to ${to}`,
      );
      expect(doorway).toBeDefined();
      station.uses.get(doorway!)!();
      expect(went()).toEqual([{ to, from: HALL }]);
      station.dispose();
    });
  }

  it('reaches every room from the Hall', () => {
    expect([...STATION_ROOMS, HALL].sort()).toEqual([...DEV_ROOMS].sort());
  });
});
