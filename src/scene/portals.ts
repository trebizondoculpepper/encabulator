import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import type { Material, Texture } from 'three';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  PORTAL_HEIGHT,
  PORTAL_WIDTH,
  WALL_THICKNESS,
  enterDevRoom,
} from '../game/dev-room-links';
import type { RoomId, Portal } from '../game/dev-room-links';
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
  from: RoomId,
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
  const travel = (to: RoomId) => {
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
    if (from === 'rhombus') {
      const steel = createPs1Material({
        color: '#777e7d',
        metalness: 0.75,
        roughness: 0.35,
      });
      const leaf = createPs1Material({
        color: '#31554d',
        metalness: 0.3,
        roughness: 0.45,
      });
      const hardware = createPs1Material({
        color: '#d5d9d1',
        metalness: 0.85,
        roughness: 0.25,
      });
      materials.push(steel, leaf, hardware);
      const part = (
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        material: Material,
      ) => {
        const mesh = new Mesh(
          new BoxGeometry(w * metre, h * metre, d * metre),
          material,
        );
        mesh.position.set(x * metre, y * metre, z * metre);
        mesh.userData.noCollision = true;
        frame.add(mesh);
        return mesh;
      };
      // A recessed steel frame, solid leaf, kick plate and horizontal panic bar.
      part(1.52, 0.11, 0.12, 0, 2.31, 0.04, steel);
      for (const side of [-1, 1])
        part(0.11, 2.35, 0.12, side * 0.705, 1.175, 0.04, steel);
      const door = part(1.29, 2.2, 0.055, 0, 1.1, 0.095, leaf);
      door.name = `Portal to ${portal.to}`;
      uses.set(door, () => travel(portal.to));
      part(1.05, 0.32, 0.012, 0, 0.24, 0.132, steel);
      part(0.92, 0.065, 0.075, 0, 1.05, 0.18, hardware);
      for (const side of [-1, 1])
        part(0.045, 0.17, 0.12, side * 0.43, 1.05, 0.15, steel);
      const exitLabel = createLabelTexture('EXIT', {
        ink: '#f8fff0',
        plate: '#0d8147',
        size: 72,
      });
      textures.push(exitLabel.texture);
      const exitFace = createPs1Material(
        { map: exitLabel.texture },
        true,
        true,
      );
      materials.push(exitFace);
      part(1.42, 0.48, 0.12, 0, 2.78, 0.08, steel);
      const sign = new Mesh(
        new PlaneGeometry(1.3 * metre, 0.37 * metre),
        exitFace,
      );
      sign.position.set(0, 2.78 * metre, 0.148 * metre);
      frame.add(sign);
      continue;
    }
    if (from === 'training') {
      // The training room's own door: a beech-veneered fire door in a
      // painted frame, with a vision panel, lever handle, closer, kick
      // plate and its signs.
      const material = (color: string, roughness: number, metalness = 0) => {
        const m = createPs1Material({ color, roughness, metalness });
        materials.push(m);
        return m;
      };
      const frameWhite = material('#eeece4', 0.5);
      const beech = material('#c79d64', 0.5);
      const chromed = material('#cfd2d2', 0.2, 0.9);
      const dark = material('#1d2326', 0.08, 0.3);
      const part = (
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        m: Material,
      ) => {
        const mesh = new Mesh(
          new BoxGeometry(w * metre, h * metre, d * metre),
          m,
        );
        mesh.position.set(x * metre, y * metre, z * metre);
        mesh.userData.noCollision = true;
        frame.add(mesh);
        return mesh;
      };
      part(1.12, 0.07, 0.03, 0, 2.115, 0.015, frameWhite);
      for (const side of [-1, 1])
        part(0.07, 2.15, 0.03, side * 0.525, 1.075, 0.015, frameWhite);
      const leaf = part(0.93, 2.04, 0.045, 0, 1.02, 0.02, beech);
      leaf.name = `Portal to ${portal.to}`;
      uses.set(leaf, () => travel(portal.to));
      // The vision panel shows only the dim corridor beyond.
      part(0.16, 0.8, 0.002, 0.22, 1.45, 0.044, dark);
      for (const [w, h, x, y] of [
        [0.2, 0.02, 0.22, 1.86],
        [0.2, 0.02, 0.22, 1.04],
        [0.02, 0.84, 0.12, 1.45],
        [0.02, 0.84, 0.32, 1.45],
      ] as const)
        part(w, h, 0.012, x, y, 0.047, beech);
      part(0.03, 0.2, 0.015, -0.4, 1.02, 0.05, chromed);
      part(0.14, 0.022, 0.022, -0.34, 1.02, 0.07, chromed);
      part(0.86, 0.25, 0.003, 0, 0.14, 0.044, chromed);
      part(0.32, 0.06, 0.06, -0.2, 1.98, 0.075, chromed);
      const signs: [string, string, string, number, number][] = [
        ['FIRE DOOR KEEP SHUT', '#ffffff', '#1d4f9c', 1.62, 0.2],
        ['TRAINING ROOM', '#1d1d1d', '#e8e6de', 1.82, 0.26],
      ];
      for (const [text, ink, plate, y, w] of signs) {
        const label = createLabelTexture(text, { ink, plate, size: 28 });
        textures.push(label.texture);
        const face = createPs1Material({ map: label.texture, roughness: 0.6 });
        materials.push(face);
        const mesh = new Mesh(
          new PlaneGeometry(
            w * metre,
            (w * metre * label.height) / label.width,
          ),
          face,
        );
        mesh.position.set(-0.17 * metre, y * metre, 0.044 * metre);
        frame.add(mesh);
      }
      continue;
    }
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
