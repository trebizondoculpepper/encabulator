import {
  AlwaysDepth,
  AlwaysStencilFunc,
  BoxGeometry,
  EqualStencilFunc,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ReplaceStencilOp,
  ShaderMaterial,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { springDoor } from '../../components/architectural/parts/building-parts';
import { SPRING_OPENING } from '../../components/architectural/views/spring-door';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  PORTAL_HEIGHT,
  PORTAL_WIDTH,
  WALL_THICKNESS,
  enterDevRoom,
} from '../logic/dev-room-links';
import type { RoomId, Portal } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { createLabelTexture } from '../../components/core/views/screens';

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

/** How deep the dark lobby behind a room's door is, metres. */
const LOBBY = 1.6;
/** How near the doorway's face, and within how much of its middle, one goes through. */
const THROUGH = { face: 0.6, half: 0.5 };

/**
 * Stencil drawing for a doorway in a wall the room built solid: the
 * doorway marks where it is seen (`mask`), the depth there is pushed back
 * (`deepen`), and the lobby and the door's swinging leaf are drawn only
 * there, so the wall looks cut through without being changed. Needs the
 * renderer's stencil buffer (`createRenderer` has one).
 */
const DOORWAY_ORDER = 10;
function doorwayMaterials() {
  const mask = new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: AlwaysStencilFunc,
    stencilZPass: ReplaceStencilOp,
  });
  const deepen = new ShaderMaterial({
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // As far off as can be: what is behind the doorway may be drawn.
        gl_Position.z = gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(0.0); }`,
    colorWrite: false,
    depthFunc: AlwaysDepth,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: EqualStencilFunc,
  });
  /** Make `material` draw only in the doorway. */
  const within = <T extends Material>(material: T) => {
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilFunc = EqualStencilFunc;
    return material;
  };
  return { mask, deepen, within };
}

/**
 * A room's ways out (`portals`), each a double-action spring door in the
 * wall, as on the corridor (the `springDoor` part), under the name of
 * the room it leads to on that room's colour. A use pushes it open, away
 * from you, onto a dark lobby (drawn into the solid wall through a
 * stencil, `doorwayMaterials`); it eases shut on its spring, and stays
 * open while you stand in its doorway; walk through it while it is open
 * and you are in that room, in front of its door back. The training
 * room, the Rhombus and the warehouse rooms have doors of their own.
 * `update` takes the time and where the walker is; `arrival` says where to
 * stand having come from a room. Built in scene units, `metre` per metre,
 * on a floor at `floorY`.
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
  // Portals stand 2 mm off the wall's face, drawn over it at any distance
  // (by polygon offset), so whatever covers the wall runs on under them.
  const face = (WALL_THICKNESS / 2) * metre + 0.002 * metre;
  let leaving = false;
  const uses = new Map<Object3D, (direction?: number) => void>();
  // The spring doors, their parts and the doorway's stencil materials.
  const kit = createPanelKit();
  const parts = createPartSet();
  const doorway = doorwayMaterials();
  materials.push(doorway.mask, doorway.deepen);
  const doors: {
    portal: Portal;
    part: ReturnType<typeof springDoor>;
  }[] = [];
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
    if (from === 'dev17' || from === 'dev18') {
      // The shared room owns its physical doors; this invisible use surface only travels.
      const material = createPs1Material({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      materials.push(material);
      const patch = new Mesh(new PlaneGeometry(width, height), material);
      patch.position.set(0, height / 2, 0.22 * metre);
      patch.name = `Portal to ${portal.to}`;
      frame.add(patch);
      uses.set(patch, () => travel(portal.to));
      continue;
    }
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
      // Intumescent strips and smoke seals round the frame's rebate.
      const seal = material('#7e4038', 0.7);
      for (const side of [-1, 1])
        part(0.006, 2.05, 0.004, side * 0.478, 1.03, 0.024, seal);
      part(0.95, 0.006, 0.004, 0, 2.071, 0.024, seal);
      const leaf = part(0.93, 2.04, 0.045, 0, 1.02, 0.02, beech);
      leaf.name = `Portal to ${portal.to}`;
      uses.set(leaf, () => travel(portal.to));
      // The vision panel, low enough to see a wheelchair user or a child
      // (500 to 1500 mm at least, Approved Document M), shows only the dim
      // corridor beyond.
      part(0.16, 1.2, 0.002, 0.22, 1.15, 0.044, dark);
      for (const [w, h, x, y] of [
        [0.2, 0.02, 0.22, 1.76],
        [0.2, 0.02, 0.22, 0.54],
        [0.02, 1.24, 0.12, 1.15],
        [0.02, 1.24, 0.32, 1.15],
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
    // A spring door in the wall, built in metres.
    const door = new Group();
    door.scale.setScalar(metre);
    frame.add(door);
    const part = parts.add(
      springDoor(kit, { name: `${DEV_ROOM_NAMES[portal.to]} door` }),
    );
    door.add(part.object);
    for (const [object, use] of part.uses) uses.set(object, use);
    doors.push({ portal, part });
    // The leaf, which swings into the wall, is drawn only in the doorway.
    part.object.traverse((o) => {
      if (!o.userData.live) return;
      o.traverse((leaf) => {
        if (!(leaf instanceof Mesh)) return;
        leaf.material = doorway.within((leaf.material as Material).clone());
        materials.push(leaf.material as Material);
        leaf.renderOrder = DOORWAY_ORDER + 3;
      });
    });
    // The doorway, and the dark lobby behind it.
    const { width: w, height: h } = SPRING_OPENING;
    const mask = new Mesh(new PlaneGeometry(w, h), doorway.mask);
    mask.position.set(0, h / 2, 0);
    mask.renderOrder = DOORWAY_ORDER;
    mask.raycast = () => {};
    door.add(mask);
    const deepen = new Mesh(new PlaneGeometry(w, h), doorway.deepen);
    deepen.position.copy(mask.position);
    deepen.renderOrder = DOORWAY_ORDER + 1;
    deepen.raycast = () => {};
    door.add(deepen);
    const dark = doorway.within(new MeshBasicMaterial({ color: '#0d0e0f' }));
    materials.push(dark);
    const lobby = (
      pw: number,
      ph: number,
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
    ) => {
      const face = new Mesh(new PlaneGeometry(pw, ph), dark);
      face.position.set(x, y, z);
      face.rotation.set(rx, ry, 0);
      face.renderOrder = DOORWAY_ORDER + 2;
      face.raycast = () => {};
      door.add(face);
    };
    lobby(w, h, 0, h / 2, -LOBBY, 0, 0);
    lobby(LOBBY, h, -w / 2, h / 2, -LOBBY / 2, 0, Math.PI / 2);
    lobby(LOBBY, h, w / 2, h / 2, -LOBBY / 2, 0, -Math.PI / 2);
    lobby(w, LOBBY, 0, h, -LOBBY / 2, Math.PI / 2, 0);
    lobby(w, LOBBY, 0, 0, -LOBBY / 2, -Math.PI / 2, 0);
    // The name of the room it leads to over it, on that room's colour.
    const sign = createMicroLabel(kit, DEV_ROOM_NAMES[portal.to], {
      height: 0.075,
      ink: '#101214',
      plate: DEV_ROOM_COLOURS[portal.to],
      maxWidth: 1.6,
    });
    sign.position.set(0, h + 0.32, 0.1);
    door.add(sign);
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
      // Come back through its door: shut behind you now.
      for (const d of doors) d.part.door.snapShut();
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
    update(delta: number, x: number, z: number) {
      parts.update(delta);
      // A door is held open while someone stands in its doorway, and
      // walking through it while it is open goes to its room.
      for (const { portal, part } of doors) {
        const inward = INWARD[portal.side];
        const off =
          ((x - portal.x) * inward.x + (z - portal.z) * inward.z) / metre -
          WALL_THICKNESS / 2;
        const along =
          Math.abs((x - portal.x) * inward.z - (z - portal.z) * inward.x) /
          metre;
        const inDoorway = along <= THROUGH.half && off <= THROUGH.face;
        part.hold(inDoorway && part.door.open);
        if (!leaving && inDoorway && part.door.open && off >= -0.05) {
          travel(portal.to);
          return;
        }
      }
      if (leaving) return;
      for (const portal of portals) {
        // The rooms with doors of their own travel as their portals did.
        if (doors.some((d) => d.portal === portal)) continue;
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
      parts.dispose();
      disposeKit(kit, group);
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

export type Portals = ReturnType<typeof createPortals>;
