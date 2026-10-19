import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
} from 'three';
import { expect, it } from 'vite-plus/test';
import { createCabinetPlacement } from './cabinet-placement';
import { createObjectHandling } from '../toolkit/controls/input/object-handling';
import { createPortableBoard } from '../toolkit/controls/logic/portable-board';

function fixture() {
  const root = new Scene();
  const home = new Group();
  home.position.set(0, 1, -1);
  home.add(new Mesh(new PlaneGeometry(0.7, 0.7), new MeshBasicMaterial()));
  root.add(home);
  const object = new Mesh(
    new BoxGeometry(0.1, 0.1, 0.1),
    new MeshBasicMaterial(),
  );
  object.position.set(0, 1, 0);
  const portable = { component: createPortableBoard(), detach() {} };
  object.userData.portable = portable;
  root.add(object);
  const camera = new PerspectiveCamera(55, 1, 0.01, 100);
  camera.position.set(0, 1, 1);
  camera.lookAt(0, 1, -1);
  let compatible = true;
  let occupied = false;
  const socket = createCabinetPlacement(
    root,
    camera,
    [
      {
        home,
        position: new Vector3(0, 0, 0.05),
        width: 0.3,
        height: 0.4,
        accepts: () => compatible && !occupied,
        place: () => {
          if (!compatible || occupied) return false;
          occupied = true;
          home.add(object);
          object.position.set(0, 0, 0.01);
          portable.component.reset();
          return true;
        },
      },
    ],
    1,
  );
  const handling = createObjectHandling(
    root,
    camera,
    1,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
    socket.heldAction,
    undefined,
    socket.targetFeedback,
  );
  handling.use(0, 0);
  return {
    root,
    home,
    object,
    portable,
    camera,
    socket,
    handling,
    incompatible: () => {
      compatible = false;
    },
    occupy: () => {
      occupied = true;
    },
  };
}

it('shows a circle for a compatible empty socket and inserts on use, ignoring the held object', () => {
  const f = fixture();
  expect(f.handling.holding()).toBe(true);
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.object.parent).toBe(f.home);
  expect(f.portable.component.phase.value).toBe('installed');
  f.socket.dispose();
  f.handling.dispose();
});

it.each(['wrong part', 'occupied'] as const)(
  'shows an X for %s and keeps the carried part',
  (reason) => {
    const f = fixture();
    if (reason === 'wrong part') f.incompatible();
    else f.occupy();
    expect(f.handling.targetFeedback(0, 0)).toBe('reject');
    f.handling.use(0, 0);
    expect(f.handling.holding()).toBe(true);
    f.socket.dispose();
    f.handling.dispose();
  },
);

it('uses the normal crosshair beyond reach, through a closed door, or for hidden contents', () => {
  const f = fixture();
  f.camera.position.z = 5;
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  f.camera.position.z = 1;
  const door = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
  door.position.set(0, 1, -0.5);
  f.root.add(door);
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  door.visible = false;
  f.home.visible = false;
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  f.socket.dispose();
  f.handling.dispose();
});
