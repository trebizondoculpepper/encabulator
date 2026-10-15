import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  enterDevRoom,
} from '../game/dev-room-links';
import type { DevRoomId } from '../game/dev-room-links';
import type { Footprint } from '../game/walk-collision';
import { createLabelTexture } from './screens';

/** A door's opening, metres. */
export const DOOR_WIDTH = 0.92;
export const DOOR_HEIGHT = 2.1;
/** How far apart the doors stand, metres. */
export const DOOR_PITCH = 4;

/**
 * A door station, after the film Monsters, Inc.: a row of ordinary doors,
 * each standing in a steel frame on a wheeled dock under an overhead
 * track, each door painted its own colour and swung open on a doorway
 * filled with light in the colour of the room it leads to. Walk through a
 * doorway and you are in that room. The doors stand in a line along x,
 * centred on the origin, their doorways facing ±z. Built in scene units,
 * `metre` per metre, on the floor at y = 0.
 */
export function createDoorStation(
  from: DevRoomId,
  rooms: readonly DevRoomId[],
  metre: number,
) {
  const group = new Group();
  group.name = 'Door station';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const m = metre;
  const box = (
    parent: Group,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new BoxGeometry(w * m, h * m, d * m);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x * m, y * m, z * m);
    parent.add(mesh);
    return mesh;
  };
  const standard = (color: string, roughness = 0.5, metalness = 0) => {
    const material = new MeshStandardMaterial({ color, roughness, metalness });
    materials.push(material);
    return material;
  };
  const steel = standard('#5a6064', 0.45, 0.6);
  const dark = standard('#26292b', 0.6, 0.4);
  const rubber = standard('#151515', 0.9);
  const brass = standard('#c9a34c', 0.3, 0.8);
  const leafColours = [
    '#c0392b',
    '#2e86c1',
    '#f1c40f',
    '#27ae60',
    '#8e44ad',
    '#e67e22',
  ];
  const span = (rooms.length - 1) * DOOR_PITCH;
  let leaving = false;
  const uses = new Map<Mesh, () => void>();
  const travel = (to: DevRoomId) => {
    if (leaving) return;
    leaving = true;
    enterDevRoom(to, from);
  };
  // The overhead track the doors' docks hang from, on two portal frames.
  const trackY = DOOR_HEIGHT + 1.4;
  box(group, steel, span + 3, 0.3, 0.3, 0, trackY, 0);
  for (const sx of [-1, 1]) {
    box(
      group,
      steel,
      0.3,
      trackY + 0.15,
      0.3,
      sx * (span / 2 + 1.5),
      (trackY + 0.15) / 2,
      0,
    );
    box(group, dark, 0.8, 0.1, 0.8, sx * (span / 2 + 1.5), 0.05, 0);
  }
  const sign = createLabelTexture('DOOR STATION', {
    ink: '#1b1b1b',
    plate: '#e8c215',
    size: 28,
  });
  textures.push(sign.texture);
  const signMaterial = new MeshBasicMaterial({ map: sign.texture });
  materials.push(signMaterial);
  for (const sz of [-1, 1]) {
    const plate = new Mesh(
      new PlaneGeometry(2.4 * m, ((2.4 * sign.height) / sign.width) * m),
      signMaterial,
    );
    geometries.push(plate.geometry);
    plate.position.set(0, (trackY + 0.55) * m, sz * 0.16 * m);
    plate.rotation.y = sz > 0 ? 0 : Math.PI;
    group.add(plate);
  }
  box(group, steel, 2.6, 0.08, 0.08, 0, trackY + 0.2, 0);

  const doors = rooms.map((to, i) => {
    const x = -span / 2 + i * DOOR_PITCH;
    const dock = new Group();
    dock.position.x = x * m;
    group.add(dock);
    // The wheeled dock.
    box(dock, dark, DOOR_WIDTH + 0.9, 0.16, 1.1, 0, 0.18, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const wheel = new Mesh(
          new CylinderGeometry(0.07 * m, 0.07 * m, 0.05 * m, 12),
          rubber,
        );
        geometries.push(wheel.geometry);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(
          sx * (DOOR_WIDTH / 2 + 0.3) * m,
          0.07 * m,
          sz * 0.4 * m,
        );
        dock.add(wheel);
      }
    // The steel frame, up to the track.
    const frameTop = 0.26 + DOOR_HEIGHT;
    for (const sx of [-1, 1])
      box(
        dock,
        steel,
        0.1,
        trackY - 0.26,
        0.16,
        sx * (DOOR_WIDTH / 2 + 0.05),
        0.26 + (trackY - 0.26) / 2,
        0,
      );
    box(dock, steel, DOOR_WIDTH + 0.2, 0.12, 0.16, 0, frameTop + 0.06, 0);
    // The doorway, full of the destination's light.
    const glow = new MeshBasicMaterial({
      color: new Color(DEV_ROOM_COLOURS[to]).multiplyScalar(1.6),
    });
    glow.toneMapped = false;
    materials.push(glow);
    const doorway = box(
      dock,
      glow,
      DOOR_WIDTH,
      DOOR_HEIGHT,
      0.02,
      0,
      0.26 + DOOR_HEIGHT / 2,
      0,
    );
    doorway.name = `Doorway to ${to}`;
    uses.set(doorway, () => travel(to));
    // The door itself, swung open on its left hinge, with a brass knob.
    const hinge = new Group();
    hinge.position.set(-(DOOR_WIDTH / 2) * m, 0.26 * m, 0.04 * m);
    hinge.rotation.y = -1.2;
    dock.add(hinge);
    const leaf = standard(leafColours[i % leafColours.length], 0.55);
    box(
      hinge,
      leaf,
      DOOR_WIDTH,
      DOOR_HEIGHT,
      0.045,
      DOOR_WIDTH / 2,
      DOOR_HEIGHT / 2,
      0,
    );
    // Raised panels, in the leaf's colour.
    for (const y of [0.55, 1.5])
      box(
        hinge,
        leaf,
        DOOR_WIDTH - 0.3,
        y > 1 ? 0.75 : 0.85,
        0.06,
        DOOR_WIDTH / 2,
        y,
        0,
      );
    const knob = new Mesh(
      new CylinderGeometry(0.03 * m, 0.03 * m, 0.14 * m, 10),
      brass,
    );
    geometries.push(knob.geometry);
    knob.rotation.x = Math.PI / 2;
    knob.position.set((DOOR_WIDTH - 0.08) * m, 1.0 * m, 0);
    hinge.add(knob);
    // The red lamp on top that says the door is live.
    const lamp = new MeshBasicMaterial({ color: new Color(2, 0.25, 0.15) });
    lamp.toneMapped = false;
    materials.push(lamp);
    const bulb = new Mesh(
      new CylinderGeometry(0.08 * m, 0.1 * m, 0.14 * m, 12),
      lamp,
    );
    geometries.push(bulb.geometry);
    bulb.position.set(0, (frameTop + 0.2) * m, 0);
    dock.add(bulb);
    // The room's name, both sides, on the frame's header.
    const name = createLabelTexture(DEV_ROOM_NAMES[to], {
      ink: '#f2efe4',
      plate: '#1c2422',
      size: 22,
    });
    textures.push(name.texture);
    const nameMaterial = new MeshBasicMaterial({ map: name.texture });
    materials.push(nameMaterial);
    for (const sz of [-1, 1]) {
      const w = DOOR_WIDTH + 1.4;
      const plate = new Mesh(
        new PlaneGeometry(w * m, ((w * name.height) / name.width) * m),
        nameMaterial,
      );
      geometries.push(plate.geometry);
      plate.position.set(0, (frameTop + 0.55) * m, sz * 0.09 * m);
      plate.rotation.y = sz > 0 ? 0 : Math.PI;
      dock.add(plate);
    }
    return { to, x };
  });

  return {
    group,
    /** A click on a doorway travels, as walking through it does. */
    uses,
    /** The frames' posts and the gantry's legs. */
    solids(): Footprint[] {
      const posts: Footprint[] = [];
      const post = (x: number) =>
        posts.push({
          minX: (x - 0.1) * m,
          maxX: (x + 0.1) * m,
          minZ: -0.12 * m,
          maxZ: 0.12 * m,
        });
      for (const door of doors)
        for (const sx of [-1, 1]) post(door.x + sx * (DOOR_WIDTH / 2 + 0.05));
      for (const sx of [-1, 1]) post(sx * (span / 2 + 1.5));
      return posts;
    },
    /** Where to stand having come from `previous`: in front of its door. */
    arrival(previous: string | null) {
      const door = doors.find((d) => d.to === previous);
      if (!door) return null;
      leaving = false;
      return { x: door.x * m, z: 1.8 * m, yaw: Math.PI, pitch: 0 };
    },
    /** Travel if the walker, at (x, z), is passing through a doorway. */
    update(_delta: number, x: number, z: number) {
      if (leaving) return;
      for (const door of doors)
        if (
          Math.abs(x - door.x * m) < (DOOR_WIDTH / 2 - 0.1) * m &&
          Math.abs(z) < 0.2 * m
        ) {
          travel(door.to);
          return;
        }
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const mat of materials) mat.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
