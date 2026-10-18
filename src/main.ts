import './styles/main.css';
import { ROOMS, resolveRoomId } from './game/dev-room-links';
import type { RoomId } from './game/dev-room-links';

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
  const room = resolveRoomId(params.get('room')) ?? 'dev0';
  let start: (canvas: HTMLCanvasElement) => RoomHandle;
  if (room === 'rhombus')
    start = (await import('./rendering/plinth-room')).startPlinthRoom;
  else if (room === 'level2')
    start = (await import('./rendering/level2-room')).startLevel2Room;
  else if (room === 'training')
    start = (await import('./rendering/training-room')).startTrainingRoom;
  else if (room === 'hall')
    start = (await import('./rendering/hall-room')).startHallRoom;
  else if (room === 'dev6')
    start = (await import('./rendering/encabulator-room')).startEncabulatorRoom;
  else if (room === 'dev12')
    start = (await import('./rendering/tones-room')).startTonesRoom;
  else if (room === 'dev18')
    start = (await import('./rendering/warehouse-room'))
      .startArchitecturalGalleryRoom;
  else if (room === 'dev17')
    start = (await import('./rendering/warehouse-room')).startWarehouseRoom;
  else if (room === 'dev16')
    start = (await import('./rendering/graffiti-room')).startGraffitiRoom;
  else if (room === 'dev15')
    start = (await import('./rendering/appearing-skip-room'))
      .startAppearingSkipRoom;
  else if (room === 'dev14')
    start = (await import('./rendering/bin-room')).startBinRoom;
  else if (room === 'dev13')
    start = (await import('./rendering/beeps-room')).startBeepsRoom;
  else if (room === 'dev11')
    start = (await import('./rendering/button-gallery-room'))
      .startButtonGalleryRoom;
  else if (room === 'dev10')
    start = (await import('./rendering/waking-room')).startWakingRoom;
  else if (room === 'dev9')
    start = (await import('./rendering/wandering-room')).startWanderingRoom;
  else if (room === 'dev8')
    start = (await import('./rendering/fittings-room')).startFittingsRoom;
  else if (room === 'dev7')
    start = (await import('./rendering/corridor-room')).startCorridorRoom;
  else if (room === 'dev3')
    start = (await import('./rendering/racks-room')).startRacksRoom;
  else if (room === 'dev2')
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
    surface.setAttribute('aria-label', `Room ${room}`);
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
  if (!ROOMS.includes(to as RoomId)) return;
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
