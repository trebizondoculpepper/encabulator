import {
  AmbientLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Group, Object3D } from 'three';
import {
  LOOP_CEILING,
  LOOP_HALF,
  LOOP_INNER_BLOCK,
  LOOP_OUTER_BOUNDS,
  LOOP_ZONES,
  onSide,
  visibleZones,
  arrivalAt,
  walkedThrough,
  zoneAt,
} from '../game/dev-corridor-plan';
import { createDevCorridor } from '../scene/dev-corridor';
import {
  devPortals,
  devWalls,
  enterDevRoom,
} from '../toolkit/gallery/logic/dev-room-links';
import { courtyardLink } from '../game/courtyard-link';
import { METRE } from '../toolkit/components/core/logic/units';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createPortals } from '../toolkit/gallery/views/portals';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

/** How many real lights light the corridor: the battens nearest in view. */
export const CORRIDOR_LIGHTS = 6;

/** The views to start from, by name (`?view=`), metres and radians. */
export const CORRIDOR_VIEWS: Record<
  string,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  start: { ...onSide('north', -20), yaw: Math.PI / 2, pitch: 0 },
  a: { ...onSide('north', 0), yaw: -Math.PI / 2, pitch: 0 },
  b: { ...onSide('east', 0), yaw: Math.PI, pitch: 0 },
  c: { ...onSide('south', 0), yaw: Math.PI / 2, pitch: 0 },
  d: { ...onSide('west', 0), yaw: 0, pitch: 0 },
  nw: { x: -LOOP_HALF, z: -LOOP_HALF, yaw: (3 * Math.PI) / 4, pitch: 0 },
  ne: { x: LOOP_HALF, z: -LOOP_HALF, yaw: (-3 * Math.PI) / 4, pitch: 0 },
  se: { x: LOOP_HALF, z: LOOP_HALF, yaw: -Math.PI / 4, pitch: 0 },
  sw: { x: -LOOP_HALF, z: LOOP_HALF, yaw: Math.PI / 4, pitch: 0 },
  courtyard: { ...onSide('south', 0), yaw: 0, pitch: 0.05 },
};

/**
 * dev_corridor (which took over dev7): the corridor that loops round a
 * 50 m square, the hub of the dev rooms (`src/scene/dev-corridor.ts`).
 * Only the zones that can be seen from where the player stands are drawn
 * (`visibleZones`), and the corridor is lit by a few real lights moved to
 * the battens nearest the player in view; the rest only glow. Its spring
 * doors open and swing shut; opening one snaps every other shut at once,
 * silently, so only one is ever open. For now they open onto dark lobbies:
 * the rooms come later.
 */
export function startDevCorridorRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);
  renderer.setClearColor('#101213');
  const camera = new PerspectiveCamera(62, 1, 0.05, 90 * m);
  scene.add(
    new AmbientLight('#e9ece9', 0.45),
    new HemisphereLight('#f2f2ec', '#55574f', 0.35),
  );
  const kit = createPanelKit();
  const corridor = createDevCorridor(kit);
  corridor.group.scale.setScalar(m);
  scene.add(corridor.group);
  // A few real lights, moved each frame to the battens nearest the player
  // in the zones in view: never more lights, however long the corridor.
  const lights = Array.from({ length: CORRIDOR_LIGHTS }, () => {
    const light = new PointLight('#f4f5ec', 0, 10 * m, 2);
    scene.add(light);
    return light;
  });
  const bounds: Footprint = {
    minX: LOOP_OUTER_BOUNDS.minX * m,
    maxX: LOOP_OUTER_BOUNDS.maxX * m,
    minZ: LOOP_OUTER_BOUNDS.minZ * m,
    maxZ: LOOP_OUTER_BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, LOOP_CEILING * m);
  const inner: Footprint = {
    minX: LOOP_INNER_BLOCK.minX * m,
    maxX: LOOP_INNER_BLOCK.maxX * m,
    minZ: LOOP_INNER_BLOCK.minZ * m,
    maxZ: LOOP_INNER_BLOCK.maxZ * m,
  };
  const portals = createPortals(
    'dev_corridor',
    devPortals('dev_corridor', bounds, m),
    0,
    m,
  );
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usable = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [portals.group, corridor.group],
      true,
    )[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh) ?? corridor.parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  /** Where to stand having come from `previous`: in front of its door. */
  const arrival = (previous: string | null) => {
    const door =
      previous === 'dev_courtyard'
        ? corridor.doors.find(
            (d) =>
              d.door.wall === 'inner' && d.door.side === courtyardLink.side,
          )
        : corridor.doors.find((d) => d.room === previous);
    if (!door) return null;
    const at = arrivalAt(door.door);
    return { ...at, x: at.x * m, z: at.z * m };
  };
  const params = new URLSearchParams(location.search);
  const pose = (name: string | null) => {
    const view = CORRIDOR_VIEWS[name ?? ''];
    return view && { ...view, x: view.x * m, z: view.z * m };
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      pose(params.get('view')) ?? arrival(params.get('from')) ?? pose('start')!,
    solids: () => [...outer, inner],
    use: (x, y) => usable(x, y)?.(),
    aimed: () => Boolean(usable(0, 0)),
  });

  /** Show only the zones in view from (x, z), metres. */
  let shown = '';
  const showZones = (x: number, z: number) => {
    const seen = visibleZones(x, z);
    const key = [...seen].sort().join();
    if (key === shown) return seen;
    shown = key;
    for (const id of LOOP_ZONES)
      corridor.zones.get(id)!.group.visible = seen.has(id);
    return seen;
  };
  /** Light the battens nearest (x, z) in the zones in view. */
  const fittings = corridor.fittings.map((f) => ({
    ...f,
    zone: zoneAt(f.x, f.z) ?? 'north.middle',
  }));
  const placeLights = (x: number, z: number, seen: Set<string>) => {
    const near = fittings
      .filter((f) => seen.has(f.zone))
      .sort(
        (p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z),
      )
      .slice(0, lights.length);
    lights.forEach((light, i) => {
      const f = near[i];
      light.intensity = f ? 3 * m * m : 0;
      if (f) light.position.set(f.x * m, (LOOP_CEILING - 0.15) * m, f.z * m);
    });
  };

  /**
   * Walking through an open door goes to its room: an outer door's dev
   * room, an inner door the courtyard (by the matching door of its four).
   */
  let leaving = false;
  const goThrough = (x: number, z: number) => {
    if (leaving) return;
    for (const d of corridor.doors) {
      if (!d.part.door.open || !walkedThrough(d.door, x, z)) continue;
      if (d.door.wall === 'inner') {
        courtyardLink.side = d.door.side;
        leaving = true;
        enterDevRoom('dev_courtyard', 'dev_corridor');
      } else if (d.room) {
        leaving = true;
        enterDevRoom(d.room, 'dev_corridor');
      }
      return;
    }
  };

  /** Only one door open at a time: opening one snaps every other shut. */
  const wasOpen = new Set<(typeof corridor.doors)[number]>();
  const oneDoorOpen = () => {
    for (const d of corridor.doors) {
      const open = d.part.door.open;
      if (open && !wasOpen.has(d)) {
        for (const other of corridor.doors)
          if (other !== d && other.part.door.open) {
            other.part.door.snapShut();
            wasOpen.delete(other);
          }
        wasOpen.add(d);
      } else if (!open) wasOpen.delete(d);
    }
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    const x = walk.walker.x / m;
    const z = walk.walker.z / m;
    const seen = showZones(x, z);
    placeLights(x, z, seen);
    corridor.parts.update(delta);
    oneDoorOpen();
    goThrough(x, z);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });

  (window as unknown as { devCorridor: unknown }).devCorridor = {
    /** Stand at a named view: start, a to d, nw, ne, se, sw, courtyard. */
    view(name: string) {
      const p = pose(name);
      if (p) walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** The zones drawn from where the player stands. */
    zones: () => [...visibleZones(walk.walker.x / m, walk.walker.z / m)],
    /** The doors: each one's room, and whether it is open. */
    doors: () =>
      corridor.doors.map((d) => ({
        room: d.room,
        side: d.door.side,
        t: d.door.t,
        open: d.part.door.open,
      })),
    /** Push door `n` (in `doors()` order) open. */
    open(n: number) {
      corridor.doors[n]?.part.door.push(1);
    },
    /** A frame's draw calls and triangles. */
    stats: () => ({ ...renderer.info.render }),
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    corridor.parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devCorridor?: unknown }).devCorridor;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view = pose(new URLSearchParams(location.search).get('view'));
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      leaving = false;
      // Back through a door: it is shut behind the player now.
      for (const d of corridor.doors) d.part.door.snapShut();
      const at = arrival(previous);
      if (at) walk.place(at.x, at.z, at.yaw, at.pitch);
    },
    suspend() {
      corridor.parts.setAudible(false);
    },
    resume() {
      corridor.parts.setAudible(true);
    },
  });
}
