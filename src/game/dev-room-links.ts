import type { Footprint } from './walk-collision';

/**
 * How the development rooms join. They are not one connected world: each
 * is a room of its own, and a portal (a coloured patch on a wall) sends
 * whoever touches it straight to the room it names, arriving in front of
 * that room's portal back. The Hall is the hub; the Rhombus mini-game
 * has a single exit to it.
 */

export type DevRoomId = 'dev0' | 'dev1' | 'dev2' | 'dev3' | 'dev6' | 'dev7';
export type RoomId = DevRoomId | 'hall' | 'rhombus';
export type PortalSide = 'north' | 'south' | 'east' | 'west';
export interface Portal {
  to: RoomId;
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
  'dev6',
  'dev7',
];

/** The Hall and mini-game have their own public room IDs. */
export const ROOMS: readonly RoomId[] = [...DEV_ROOMS, 'hall', 'rhombus'];

/** Historic URLs remain usable without changing the address bar. */
export function resolveRoomId(id: string | null): RoomId | undefined {
  if (id === 'dev4') return 'hall';
  if (id === 'dev5') return 'rhombus';
  return ROOMS.includes(id as RoomId) ? (id as RoomId) : undefined;
}

export const DEV_ROOM_NAMES: Record<RoomId, string> = {
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · EFFECTS',
  dev2: 'DEV2 · HALLUCINATIONS',
  dev3: 'DEV3 · RACKS',
  dev6: 'DEV6 · RETRO ENCABULATOR',
  dev7: 'DEV7 · UNDERGROUND CORRIDOR',
  hall: 'THE HALL',
  rhombus: 'RHOMBUS',
};
/** Each room's portal colour, so a portal says where it goes. */
export const DEV_ROOM_COLOURS: Record<RoomId, string> = {
  dev0: '#2fb3a5',
  dev1: '#d0732c',
  dev2: '#8a4fd6',
  dev3: '#3f7fe0',
  dev6: '#9a9685',
  dev7: '#2d9ca0',
  hall: '#c9c23a',
  rhombus: '#d8d4c8',
};
export const PORTAL_WIDTH = 1.2;
export const PORTAL_HEIGHT = 2.2;
/** How thick a room's walls are, metres. */
export const WALL_THICKNESS = 0.3;

/** The hall, where the game takes place: every room has a way to it. */
export const HALL: RoomId = 'hall';
/** The rooms the hall's door station leads to. */
export const STATION_ROOMS: readonly RoomId[] = ROOMS.filter(
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
  id: RoomId,
  bounds: Footprint,
  metre: number,
): Portal[] {
  if (id === HALL) return [];
  const z = bounds.maxZ - 1.1 * metre;
  // Development-room neighbours, with the Hall reached separately.
  const at = DEV_ROOMS.indexOf(id as DevRoomId);
  const portals: Portal[] = [];
  if (id === 'rhombus')
    return [{ to: HALL, side: 'east', x: bounds.maxX, z: 0 }];
  if (at > 0)
    portals.push({
      to: DEV_ROOMS[at - 1],
      side: 'west',
      x: bounds.minX,
      z,
    });
  if (at < DEV_ROOMS.length - 1)
    portals.push({
      to: DEV_ROOMS[at + 1],
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
export function enterDevRoom(to: RoomId, from: RoomId) {
  window.dispatchEvent(new CustomEvent('dev-room', { detail: { to, from } }));
}
