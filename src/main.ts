import './styles/main.css';
import { DEV_ROOMS } from './game/dev-room-links';
import type { DevRoomId } from './game/dev-room-links';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Scene canvas is missing.');

const showError = (error: unknown) => {
  const message = document.querySelector<HTMLParagraphElement>('#error');
  if (message) {
    message.hidden = false;
    message.textContent =
      'The game could not start. Please use a browser with WebGL 2 enabled.';
  }
  console.error(error);
};

// Rooms retain their apparatus state while only the current room draws.
type RoomHandle = (() => void) & {
  enter?: (from: string | null) => void;
  suspend?: () => void;
  resume?: () => void;
};
const rooms = new Map<string, { root: HTMLElement; handle: RoomHandle }>();
let current: string | undefined;
let revision = 0;
const resetEffects = async () => {
  const { ps1Uniforms } = await import('./rendering/ps1-material');
  ps1Uniforms.roomLight.value = 1;
  ps1Uniforms.plantLight.value = 1;
  ps1Uniforms.channels.value.set(1, 1, 1);
  ps1Uniforms.warp.value = 0;
  ps1Uniforms.warpField.value.set(0, 0, 0, 0);
  ps1Uniforms.precision.value.set(0, 0, 0);
  ps1Uniforms.pi.value = Math.PI;
  ps1Uniforms.linearTarget.value = 0;
};
const openRoom = async () => {
  const ownRevision = ++revision;
  const params = new URLSearchParams(location.search);
  const asked = params.get('room');
  const room: DevRoomId = DEV_ROOMS.includes(asked as DevRoomId)
    ? (asked as DevRoomId)
    : 'dev0';
  let start: (canvas: HTMLCanvasElement) => RoomHandle;
  if (room === 'dev2')
    start = (await import('./rendering/hallucination-room'))
      .startHallucinationRoom;
  else if (room === 'dev1')
    start = (await import('./rendering/effects-room')).startEffectsRoom;
  else start = (await import('./rendering/controls-room')).startControlsRoom;
  await resetEffects();
  if (ownRevision !== revision) return;
  if (document.pointerLockElement) document.exitPointerLock();
  window.dispatchEvent(new Event('blur'));
  if (current) {
    const old = rooms.get(current)!;
    old.handle.suspend?.();
    old.root.hidden = true;
  }
  current = room;
  let loaded = rooms.get(room);
  if (!loaded) {
    const root = document.createElement('section');
    root.setAttribute('aria-label', `Room ${room}`);
    Object.assign(root.style, { position: 'absolute', inset: '0' });
    const surface = canvas.cloneNode() as HTMLCanvasElement;
    surface.id = 'scene';
    surface.hidden = false;
    surface.style.display = 'block';
    surface.setAttribute('aria-label', `Development room ${room}`);
    canvas.parentElement!.append(root);
    root.append(surface);
    canvas.hidden = true;
    canvas.style.display = 'none';
    canvas.id = 'scene-template';
    loaded = { root, handle: start(surface) };
    rooms.set(room, loaded);
  }
  for (const [id, entry] of rooms) {
    entry.root.hidden = id !== room;
    const surface = entry.root.querySelector('canvas');
    if (surface) surface.id = id === room ? 'scene' : `scene-${id}`;
  }
  loaded.root.hidden = false;
  loaded.handle.enter?.(params.get('from'));
  loaded.handle.resume?.();
};
const travel = (event: Event) => {
  const { to, from } = (event as CustomEvent<{ to: string; from: string }>)
    .detail;
  if (!DEV_ROOMS.includes(to as DevRoomId)) return;
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('room', to);
  url.searchParams.set('from', from);
  history.pushState(null, '', url);
  void openRoom().catch(showError);
};
const popstate = () => {
  void openRoom().catch(showError);
};
window.addEventListener('dev-room', travel);
window.addEventListener('popstate', popstate);
void openRoom().catch(showError);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    revision++;
    for (const entry of rooms.values()) {
      entry.handle();
      entry.root.remove();
    }
    canvas.hidden = false;
    canvas.style.display = 'block';
    canvas.id = 'scene';
    window.removeEventListener('dev-room', travel);
    window.removeEventListener('popstate', popstate);
  });
