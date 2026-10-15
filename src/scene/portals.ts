import { Group, Mesh, PlaneGeometry } from 'three';
import type { Material, Texture } from 'three';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  PORTAL_HEIGHT,
  PORTAL_WIDTH,
  WALL_THICKNESS,
  enterDevRoom,
} from '../game/dev-room-links';
import type { DevRoomId, Portal } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { createPs1Material } from '../rendering/ps1-material';
import { createLabelTexture } from './screens';

/** How close to its wall a walker's centre must come to touch a portal, metres. */
export const PORTAL_REACH = WALL_THICKNESS / 2 + 0.25 + 0.15;
/** How far in front of a portal an arrival stands, metres. */
export const ARRIVAL_DISTANCE = 1.2;

/** The direction into the room from each wall, and the yaw facing it. */
const INWARD: Record<Portal['side'], { x: number; z: number; yaw: number }> = {
  north: { x: 0, z: 1, yaw: Math.PI },
  south: { x: 0, z: -1, yaw: 0 },
  west: { x: 1, z: 0, yaw: Math.PI / 2 },
  east: { x: -1, z: 0, yaw: -Math.PI / 2 },
};

/**
 * A room's portals: each a glowing patch on the wall in the colour of the
 * room it leads to, with that room's name over it. Walk into one, or click
 * it, and you are in that room, standing in front of its portal back. `update` takes
 * where the walker is; `arrival` says where to stand having come from a
 * room. Built in scene units, `metre` per metre, on a floor at `floorY`.
 */
export function createPortals(
  from: DevRoomId,
  portals: readonly Portal[],
  floorY: number,
  metre: number,
) {
  const group = new Group();
  group.name = 'Portals';
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const width = PORTAL_WIDTH * metre;
  const height = PORTAL_HEIGHT * metre;
  const face = (WALL_THICKNESS / 2) * metre + 0.01 * metre;
  let leaving = false;
  const uses = new Map<Mesh, () => void>();
  const travel = (to: DevRoomId) => {
    if (leaving) return;
    leaving = true;
    enterDevRoom(to, from);
  };
  for (const portal of portals) {
    const inward = INWARD[portal.side];
    const frame = new Group();
    frame.position.set(
      portal.x + inward.x * face,
      floorY,
      portal.z + inward.z * face,
    );
    // Planes face +z; turn each to face into the room.
    frame.rotation.y = Math.atan2(inward.x, inward.z);
    group.add(frame);
    const glow = createPs1Material(
      { color: DEV_ROOM_COLOURS[portal.to] },
      true,
      true,
    );
    materials.push(glow);
    const patch = new Mesh(new PlaneGeometry(width, height), glow);
    patch.position.y = height / 2;
    patch.name = `Portal to ${portal.to}`;
    patch.userData.noCollision = true;
    frame.add(patch);
    // A click on the patch, from anywhere it can be seen, goes too.
    uses.set(patch, () => travel(portal.to));
    const label = createLabelTexture(DEV_ROOM_NAMES[portal.to], {
      ink: '#f2efe4',
      plate: '#1c2422',
      size: 24,
    });
    textures.push(label.texture);
    const sign = createPs1Material({ map: label.texture }, true, true);
    materials.push(sign);
    const plate = new Mesh(
      new PlaneGeometry(
        width * 1.4,
        (width * 1.4 * label.height) / label.width,
      ),
      sign,
    );
    plate.position.set(0, height + 0.2 * metre, 0.002 * metre);
    frame.add(plate);
  }
  return {
    group,
    /** A click on a portal travels, as walking into it does. */
    uses,
    /** Portals are walked into, so they block nothing. */
    solids: (): Footprint[] => [],
    /** Where to stand, having come from `previous`: in front of its portal. */
    arrival(previous: string | null) {
      const portal = portals.find((p) => p.to === previous);
      if (!portal) return null;
      leaving = false;
      const inward = INWARD[portal.side];
      const reach = (WALL_THICKNESS / 2 + ARRIVAL_DISTANCE) * metre;
      return {
        x: portal.x + inward.x * reach,
        z: portal.z + inward.z * reach,
        yaw: inward.yaw,
        pitch: 0,
      };
    },
    /** Travel if the walker, at (x, z), has walked into a portal. */
    update(_delta: number, x: number, z: number) {
      if (leaving) return;
      for (const portal of portals) {
        const across = portal.side === 'east' || portal.side === 'west';
        const off = across ? Math.abs(x - portal.x) : Math.abs(z - portal.z);
        const along = across ? Math.abs(z - portal.z) : Math.abs(x - portal.x);
        if (off <= PORTAL_REACH * metre && along <= width / 2) {
          travel(portal.to);
          return;
        }
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

export type Portals = ReturnType<typeof createPortals>;
