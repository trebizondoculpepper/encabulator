import type { Footprint } from './walk-collision';

export type DevRoomId = 'dev0' | 'dev1' | 'dev2';
export type DoorSide = 'north' | 'south' | 'east' | 'west';
export interface DevDoor {
  to: DevRoomId;
  side: DoorSide;
  x: number;
  z: number;
}

/** The development wing, in order from west to east. */
export const DEV_ROOMS: readonly DevRoomId[] = ['dev0', 'dev1', 'dev2'];

export const DEV_ROOM_NAMES: Record<DevRoomId, string> = {
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · EFFECTS',
  dev2: 'DEV2 · HALLUCINATIONS',
};
export const DEV_DOOR_WIDTH = 1.2;
export const DEV_DOOR_HEIGHT = 2.2;

/** A row of adjacent rooms, each opening onto the next by its south wall. */
export function devDoors(
  id: DevRoomId,
  bounds: Footprint,
  metre: number,
): DevDoor[] {
  const laneZ = bounds.maxZ - 1.1 * metre;
  const at = DEV_ROOMS.indexOf(id);
  const doors: DevDoor[] = [];
  if (at > 0)
    doors.push({
      to: DEV_ROOMS[at - 1],
      side: 'west',
      x: bounds.minX,
      z: laneZ,
    });
  if (at < DEV_ROOMS.length - 1)
    doors.push({
      to: DEV_ROOMS[at + 1],
      side: 'east',
      x: bounds.maxX,
      z: laneZ,
    });
  return doors;
}

export interface WallPiece extends Footprint {
  bottom: number;
  top: number;
}

/** Masonry stops at each jamb; only the lintel spans the opening. */
export function devWallPieces(
  bounds: Footprint,
  doors: readonly DevDoor[],
  metre: number,
  height: number,
): WallPiece[] {
  const pieces: WallPiece[] = [];
  const thick = 0.3 * metre;
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const horizontal = side === 'north' || side === 'south';
    const edge =
      side === 'north'
        ? bounds.minZ
        : side === 'south'
          ? bounds.maxZ
          : side === 'west'
            ? bounds.minX
            : bounds.maxX;
    const start = horizontal ? bounds.minX : bounds.minZ;
    const end = horizontal ? bounds.maxX : bounds.maxZ;
    const door = doors.find((d) => d.side === side);
    const add = (a: number, b: number, bottom = 0) => {
      if (b <= a) return;
      pieces.push(
        horizontal
          ? {
              minX: a,
              maxX: b,
              minZ: edge - thick / 2,
              maxZ: edge + thick / 2,
              bottom,
              top: height,
            }
          : {
              minX: edge - thick / 2,
              maxX: edge + thick / 2,
              minZ: a,
              maxZ: b,
              bottom,
              top: height,
            },
      );
    };
    if (!door) {
      add(start, end);
      continue;
    }
    const at = horizontal ? door.x : door.z;
    const half = (DEV_DOOR_WIDTH * metre) / 2;
    add(start, at - half);
    add(at + half, end);
    add(at - half, at + half, DEV_DOOR_HEIGHT * metre);
  }
  return pieces;
}

/** Door transitions are handled by the app, without reloading the browser. */
export function enterDevRoom(to: DevRoomId, from: DevRoomId) {
  window.dispatchEvent(new CustomEvent('dev-room', { detail: { to, from } }));
}
