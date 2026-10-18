import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3 } from 'three';
import { partAudio } from '../../core/audio/part-audio';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { bbcWorkstation } from './bbc-workstation';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BBC workstation exhibit', () => {
  it('retains all five original models at true scale and starts with a dark monitor', () => {
    const kit = createPanelKit();
    const exhibit = bbcWorkstation(kit);
    expect(exhibit.view.bbc.group.name).toBe('BbcMicroModelB');
    expect(exhibit.view.cub.group.name).toBe('MicrovitecCub');
    expect(exhibit.view.disk.group.name).toBe('BbcExternalDiskDrive');
    expect(exhibit.view.chair.group.name).toBe('Office chair');
    expect(exhibit.view.width).toBeGreaterThan(1);
    expect(exhibit.view.bbc.group.scale.x).toBe(1);
    expect(exhibit.view.cub.screen.visible).toBe(false);
    const bbc = new Box3().setFromObject(exhibit.view.bbc.group);
    expect(bbc.max.x - bbc.min.x).toBeCloseTo(0.41, 2);
    exhibit.dispose();
    disposeKit(kit, exhibit.object);
  });

  it('boots from its real power rocker and cancels its positional recording when switched off or hidden', () => {
    const stop = vi.fn();
    const play = vi.spyOn(partAudio, 'play').mockReturnValue(stop);
    const kit = createPanelKit();
    const exhibit = bbcWorkstation(kit);
    const use = exhibit.uses.get(exhibit.view.bbc.powerSwitch)!;
    use();
    exhibit.update(0.5);
    expect(exhibit.view.cub.screen.visible).toBe(true);
    expect(
      play.mock.calls.some(
        ([recipe, from]) =>
          'recording' in recipe && from === exhibit.view.bbc.group,
      ),
    ).toBe(true);
    use();
    exhibit.update(0);
    expect(stop).toHaveBeenCalled();
    expect(exhibit.view.cub.screen.visible).toBe(false);
    use();
    exhibit.setAudible(false);
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
    exhibit.dispose();
    disposeKit(kit, exhibit.object);
  });
});
