import type { Footprint } from './walk-collision';

/**
 * How the development rooms join. They are not one connected world: each
 * is a room of its own, and a portal (a coloured patch on a wall) sends
 * whoever touches it straight to the room it names, arriving in front of
 * that room's portal back. Each room has a portal to the room before it
 * on its west wall and to the room after it on its east wall.
 */

export type DevRoomId = 'dev0' | 'dev1' | 'dev2' | 'dev3' | 'dev4' | 'dev5';
export type PortalSide = 'north' | 'south' | 'east' | 'west';
export interface Portal {
  to: DevRoomId;
  side: PortalSide;
  /** The middle of the patch, on the wall's centre line. */
  x: number;
  z: number;
}

/** The development rooms, in order. */
export const DEV_ROOMS: readonly DevRoomId[] = [
  'dev0',
  'dev1',
  'dev2',
  'dev3',
  'dev4',
  'dev5',
];

export const DEV_ROOM_NAMES: Record<DevRoomId, string> = {
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · EFFECTS',
  dev2: 'DEV2 · HALLUCINATIONS',
  dev3: 'DEV3 · RACKS',
  dev4: 'DEV4 · THE HALL',
  dev5: 'DEV5 · PLINTHS',
};
/** Each room's portal colour, so a portal says where it goes. */
export const DEV_ROOM_COLOURS: Record<DevRoomId, string> = {
  dev0: '#2fb3a5',
  dev1: '#d0732c',
  dev2: '#8a4fd6',
  dev3: '#3f7fe0',
  dev4: '#c9c23a',
  dev5: '#d8d4c8',
};
export const PORTAL_WIDTH = 1.2;
export const PORTAL_HEIGHT = 2.2;
/** How thick a room's walls are, metres. */
export const WALL_THICKNESS = 0.3;

/** The hall, where the game takes place: every room has a way to it. */
export const HALL: DevRoomId = 'dev4';
/** The rooms the hall's door station leads to. */
export const STATION_ROOMS: readonly DevRoomId[] = DEV_ROOMS.filter(
  (id) => id !== HALL,
);

/**
 * A room's portals, in scene units (`metre` per metre): to the room
 * before it on its west wall and the room after it on its east wall,
 * both near its south end, and to the hall, if the hall is not already
 * its neighbour, on its west wall near its north end. The hall has no
 * wall portals: its door station leads everywhere.
 */
export function devPortals(
  id: DevRoomId,
  bounds: Footprint,
  metre: number,
): Portal[] {
  if (id === HALL) return [];
  const z = bounds.maxZ - 1.1 * metre;
  // Neighbours in order, passing over the hall, which has the station.
  const at = STATION_ROOMS.indexOf(id);
  const portals: Portal[] = [];
  if (at > 0)
    portals.push({
      to: STATION_ROOMS[at - 1],
      side: 'west',
      x: bounds.minX,
      z,
    });
  if (at < STATION_ROOMS.length - 1)
    portals.push({
      to: STATION_ROOMS[at + 1],
      side: 'east',
      x: bounds.maxX,
      z,
    });
  if (!portals.some((p) => p.to === HALL))
    portals.push({
      to: HALL,
      side: 'west',
      x: bounds.minX,
      z: bounds.minZ + 1.6 * metre,
    });
  return portals;
}

export interface WallPiece extends Footprint {
  bottom: number;
  top: number;
}

/** A room's four walls, solid, `height` tall, on its bounds' edges. */
export function devWalls(
  bounds: Footprint,
  metre: number,
  height: number,
): WallPiece[] {
  const t = (WALL_THICKNESS * metre) / 2;
  const wall = (piece: Footprint): WallPiece => ({
    ...piece,
    bottom: 0,
    top: height,
  });
  return [
    wall({
      minX: bounds.minX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.minZ + t,
    }),
    wall({
      minX: bounds.minX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.maxZ - t,
      maxZ: bounds.maxZ + t,
    }),
    wall({
      minX: bounds.minX - t,
      maxX: bounds.minX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.maxZ + t,
    }),
    wall({
      minX: bounds.maxX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.maxZ + t,
    }),
  ];
}

/** Travel is handled by the app, without reloading the browser. */
export function enterDevRoom(to: DevRoomId, from: DevRoomId) {
  window.dispatchEvent(new CustomEvent('dev-room', { detail: { to, from } }));
}
