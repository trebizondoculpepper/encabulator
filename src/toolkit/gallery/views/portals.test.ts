import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { slide } from '../../controls/logic/walk-collision';
import { createPortals } from './portals';

vi.mock('../../components/core/views/screens', () => ({
  createLabelTexture: () => ({
    texture: new Texture(),
    width: 256,
    height: 48,
  }),
}));
afterEach(() => vi.unstubAllGlobals());

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };

describe('portals', () => {
  it('send a walker who walks into one to its room, once', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const [west] = links;
    portals.update(0.1, -3, west.z);
    expect(dispatchEvent).not.toHaveBeenCalled();
    // Walk west until the wall stops the walker.
    const stop = slide(devWalls(bounds, 1, 3.2), -3, west.z, -3, 0, 0.25);
    portals.update(0.1, stop.x, west.z);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      to: 'dev_corridor',
      from: 'dev1',
    });
    portals.update(0.1, stop.x, west.z);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    portals.dispose();
  });

  it('send a walker who clicks one to its room, once', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const [patch] = [...portals.uses.entries()];
    expect(patch[0].name).toBe('Portal to dev_corridor');
    patch[1]();
    patch[1]();
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      to: 'dev_corridor',
      from: 'dev1',
    });
    portals.dispose();
  });

  it('do nothing beside the patch, along the same wall', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    portals.update(0.1, -4.6, links[0].z - 2);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('stand an arrival clear of the way out, facing into the room', () => {
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const pose = portals.arrival('dev_corridor')!;
    expect(pose.x).toBeCloseTo(-5 + 0.15 + 1.2);
    expect(pose.z).toBeCloseTo(links[0].z);
    expect(Math.sin(pose.yaw)).toBeCloseTo(1);
    expect(portals.arrival('dev3')).toBeNull();
  });
});
