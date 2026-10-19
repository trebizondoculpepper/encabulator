import { ROOM_DOOR_FROM_WEST } from '../../../game/training-room-plan';
import type { Footprint } from '../../controls/logic/walk-collision';

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
  | 'dev_corridor'
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
  | 'dev18'
  | 'dev19'
  | 'dev20'
  | 'dev21'
  | 'dev22'
  | 'dev23';
export type RoomId =
  | DevRoomId
  | 'hall'
  | 'rhombus'
  | 'training'
  | 'level0'
  | 'level2'
  | 'dev_courtyard';
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
  'dev_corridor',
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
  'dev19',
  'dev20',
  'dev21',
  'dev22',
  'dev23',
];

/** The rooms linked by portals, in order along the chain. */
export const CHAIN: readonly RoomId[] = ['training', ...DEV_ROOMS, 'rhombus'];

/** Every room with a URL of its own. */
export const ROOMS: readonly RoomId[] = [
  ...CHAIN,
  'hall',
  'level0',
  'level2',
  // Reached through dev_corridor's courtyard doors, not by a portal.
  'dev_courtyard',
];

/** Historic URLs remain usable without changing the address bar. */
export function resolveRoomId(id: string | null): RoomId | undefined {
  if (id === 'dev5') return 'rhombus';
  // dev_corridor took over dev7, the underground corridor.
  if (id === 'dev7') return 'dev_corridor';
  if (id === 'retro-computing') return 'dev19';
  return ROOMS.includes(id as RoomId) ? (id as RoomId) : undefined;
}

export const DEV_ROOM_NAMES: Record<RoomId, string> = {
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · EFFECTS',
  dev2: 'DEV2 · HALLUCINATIONS',
  dev3: 'DEV3 · RACKS',
  dev4: 'DEV4 · BRANDS AND LOGOS',
  dev6: 'DEV6 · RETRO ENCABULATOR',
  dev_corridor: 'DEV CORRIDOR',
  dev8: 'DEV8 · FIRE SAFETY',
  dev9: 'DEV9 · THE WANDERING BUTTON',
  dev10: 'DEV10 · WAKING UP FROM THE DREAM',
  dev11: 'DEV11 · THE BUTTON GALLERY',
  dev12: 'DEV12 · MACHINE TONES',
  dev13: 'DEV13 · COMPUTER BEEPS',
  dev14: 'DEV14 · PUTTING THINGS IN THE BIN',
  dev15: 'DEV15 · THE APPEARING SKIP',
  dev16: 'DEV16 · GRAFFITI GALLERY',
  dev17: 'DEV17 · WAREHOUSE TRAINING ROOM',
  dev18: 'DEV18 · BUILDING FITTINGS',
  dev19: 'DEV19 · RETRO COMPUTING',
  dev20: 'DEV20 · REPAIR WORKSHOP',
  dev21: 'DEV21 · SETTLING OBJECTS INTO SKIPS',
  dev22: 'DEV22 · FIRES',
  dev23: 'DEV23 · RECEPTION',
  hall: 'THE HALL',
  dev_courtyard: 'COURTYARD',
  rhombus: 'RHOMBUS',
  training: 'TRAINING ROOM',
  level0: 'LEVEL 0 · MACHINE SANDBOX',
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
  dev_corridor: '#2d9ca0',
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
  dev19: '#b99b6c',
  dev20: '#798b91',
  dev21: '#c4a24a',
  dev22: '#e0602a',
  dev23: '#3e7f8c',
  hall: '#c9c23a',
  dev_courtyard: '#7fa36a',
  rhombus: '#d8d4c8',
  training: '#e3d6b0',
  level0: '#809c91',
  level2: '#8c99a6',
};
/** How thick a room's walls are, metres. */
export const WALL_THICKNESS = 0.3;

/**
 * A room's way out, in scene units (`metre` per metre): since the dev
 * rooms were wired to dev_corridor's doors (`doc/prompts/009`), every room
 * has a single way out, a spring door back to the corridor, which leads
 * round the loop to every other: on its west wall near its south end
 * (dev17 and dev18 on their north wall, clear of the doors already there);
 * the training room's in its north wall; the Rhombus mini-game's in its
 * east wall.
 * The corridor and the courtyard have doors of their own instead, and the
 * Hall none.
 */
export function devPortals(
  id: RoomId,
  bounds: Footprint,
  metre: number,
): Portal[] {
  if (!CHAIN.includes(id) || id === 'dev_corridor') return [];
  const to: RoomId = 'dev_corridor';
  if (id === 'training')
    return [
      {
        to,
        side: 'north',
        x: bounds.minX + ROOM_DOOR_FROM_WEST * metre,
        z: bounds.minZ,
      },
    ];
  // In the warehouse, in a clear bay of its north wall between columns.
  if (id === 'dev17')
    return [{ to, side: 'north', x: bounds.minX + 15 * metre, z: bounds.minZ }];
  // In dev18, in the north wall's corner, clear of the doors shown there.
  if (id === 'dev18')
    return [
      { to, side: 'north', x: bounds.maxX - 1.4 * metre, z: bounds.minZ },
    ];
  if (id === 'rhombus') return [{ to, side: 'east', x: bounds.maxX, z: 0 }];
  return [{ to, side: 'west', x: bounds.minX, z: bounds.maxZ - 1.1 * metre }];
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

/**
 * `walls` (from `devWalls`) with a doorway cut through for each of
 * `doors`, the width of a spring door's opening (`width`, scene units),
 * full height: for a room that cuts real openings for its doors rather
 * than drawing them into a solid wall.
 */
export function cutDoorways(
  walls: readonly WallPiece[],
  doors: readonly Portal[],
  width: number,
): WallPiece[] {
  let pieces = [...walls];
  for (const door of doors) {
    const across = door.side === 'east' || door.side === 'west';
    const next: WallPiece[] = [];
    for (const piece of pieces) {
      const hit = across
        ? door.x >= piece.minX &&
          door.x <= piece.maxX &&
          door.z > piece.minZ &&
          door.z < piece.maxZ
        : door.z >= piece.minZ &&
          door.z <= piece.maxZ &&
          door.x > piece.minX &&
          door.x < piece.maxX;
      if (!hit) {
        next.push(piece);
        continue;
      }
      const at = across ? door.z : door.x;
      const lo = across ? piece.minZ : piece.minX;
      const hi = across ? piece.maxZ : piece.maxX;
      for (const [a, b] of [
        [lo, at - width / 2],
        [at + width / 2, hi],
      ])
        if (b > a)
          next.push(
            across
              ? { ...piece, minZ: a, maxZ: b }
              : { ...piece, minX: a, maxX: b },
          );
    }
    pieces = next;
  }
  return pieces;
}

/** Travel is handled by the app, without reloading the browser. */
export function enterDevRoom(to: RoomId, from: RoomId, through = false) {
  // `through`: walked through a doorway the room beyond was seen through,
  // so the app hands over without a break (`src/main.ts`).
  window.dispatchEvent(
    new CustomEvent('dev-room', {
      detail: through ? { to, from, through } : { to, from },
    }),
  );
}
