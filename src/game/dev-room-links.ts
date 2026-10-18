import { ROOM_DOOR_FROM_WEST } from './training-room-plan';
import type { Footprint } from './walk-collision';

/**
 * How the rooms join. They are not one connected world: each is a room of
 * its own, and a portal (a coloured patch on a wall, or a room's own door)
 * sends whoever touches it straight to the room it names, arriving in
 * front of that room's portal back. The rooms form one chain, each linked
 * to its neighbours: the training room at one end, then the development
 * rooms, then the Rhombus mini-game. The Hall is not in it: it has no
 * portals and is reached only by its URL.
 */

export type DevRoomId =
  | 'dev0'
  | 'dev1'
  | 'dev2'
  | 'dev3'
  | 'dev4'
  | 'dev6'
  | 'dev7'
  | 'dev8'
  | 'dev9'
  | 'dev10'
  | 'dev11'
  | 'dev12'
  | 'dev13'
  | 'dev14'
  | 'dev15'
  | 'dev16'
  | 'dev17'
  | 'dev18';
export type RoomId = DevRoomId | 'hall' | 'rhombus' | 'training' | 'level2';
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
  'dev4',
  'dev6',
  'dev7',
  'dev8',
  'dev9',
  'dev10',
  'dev11',
  'dev12',
  'dev13',
  'dev14',
  'dev15',
  'dev16',
  'dev17',
  'dev18',
];

/** The rooms linked by portals, in order along the chain. */
export const CHAIN: readonly RoomId[] = ['training', ...DEV_ROOMS, 'rhombus'];

/** Every room with a URL of its own. */
export const ROOMS: readonly RoomId[] = [...CHAIN, 'hall', 'level2'];

/** Historic URLs remain usable without changing the address bar. */
export function resolveRoomId(id: string | null): RoomId | undefined {
  if (id === 'dev5') return 'rhombus';
  return ROOMS.includes(id as RoomId) ? (id as RoomId) : undefined;
}

export const DEV_ROOM_NAMES: Record<RoomId, string> = {
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · EFFECTS',
  dev2: 'DEV2 · HALLUCINATIONS',
  dev3: 'DEV3 · RACKS',
  dev4: 'DEV4 · BRANDS AND LOGOS',
  dev6: 'DEV6 · RETRO ENCABULATOR',
  dev7: 'DEV7 · UNDERGROUND CORRIDOR',
  dev8: 'DEV8 · BUILDING FITTINGS',
  dev9: 'DEV9 · THE WANDERING BUTTON',
  dev10: 'DEV10 · WAKING UP FROM THE DREAM',
  dev11: 'DEV11 · THE BUTTON GALLERY',
  dev12: 'DEV12 · MACHINE TONES',
  dev13: 'DEV13 · COMPUTER BEEPS',
  dev14: 'DEV14 · PUTTING THINGS IN THE BIN',
  dev15: 'DEV15 · THE APPEARING SKIP',
  dev16: 'DEV16 · GRAFFITI GALLERY',
  dev17: 'DEV17 · WAREHOUSE TRAINING ROOM',
  dev18: 'DEV18 · ARCHITECTURAL FITTINGS',
  hall: 'THE HALL',
  rhombus: 'RHOMBUS',
  training: 'TRAINING ROOM',
  level2: 'MODULE 2 · STANDARD ENCABULATION OPERATION',
};
/** Each room's portal colour, so a portal says where it goes. */
export const DEV_ROOM_COLOURS: Record<RoomId, string> = {
  dev0: '#2fb3a5',
  dev1: '#d0732c',
  dev2: '#8a4fd6',
  dev3: '#3f7fe0',
  dev4: '#c8a227',
  dev6: '#9a9685',
  dev7: '#2d9ca0',
  dev8: '#b8433a',
  dev9: '#c7542f',
  dev10: '#6f9a3a',
  dev11: '#b0a4d8',
  dev12: '#4f9bb3',
  dev13: '#8fa9c5',
  dev14: '#7d9a5c',
  dev15: '#d9a43a',
  dev16: '#e8306b',
  dev17: '#a7b4b1',
  dev18: '#b6be9d',
  hall: '#c9c23a',
  rhombus: '#d8d4c8',
  training: '#e3d6b0',
  level2: '#8c99a6',
};
export const PORTAL_WIDTH = 1.2;
export const PORTAL_HEIGHT = 2.2;
/** How thick a room's walls are, metres. */
export const WALL_THICKNESS = 0.3;

/**
 * A room's portals, in scene units (`metre` per metre): to the room
 * before it in the chain on its west wall and the room after it on its
 * east wall, both near its south end. The chain's two ends have a single
 * way out of their own: the training room's door in its north wall, and
 * the Rhombus mini-game's EXIT door in its east wall. The Hall has none.
 */
export function devPortals(
  id: RoomId,
  bounds: Footprint,
  metre: number,
): Portal[] {
  const at = CHAIN.indexOf(id);
  if (at < 0) return [];
  const before = CHAIN[at - 1];
  const after = CHAIN[at + 1];
  if (id === 'training')
    return [
      {
        to: after,
        side: 'north',
        x: bounds.minX + ROOM_DOOR_FROM_WEST * metre,
        z: bounds.minZ,
      },
    ];
  if (id === 'dev17' || id === 'dev18') {
    const x = bounds.maxX - 1.1 * metre;
    return [
      { to: before, side: 'south', x, z: bounds.maxZ },
      { to: after, side: 'north', x, z: bounds.minZ },
    ];
  }
  if (id === 'rhombus')
    return [{ to: before, side: 'east', x: bounds.maxX, z: 0 }];
  const z = bounds.maxZ - 1.1 * metre;
  return [
    { to: before, side: 'west', x: bounds.minX, z },
    { to: after, side: 'east', x: bounds.maxX, z },
  ];
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
