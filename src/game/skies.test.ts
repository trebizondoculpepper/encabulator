import { describe, expect, it } from 'vite-plus/test';
import {
  SKIES,
  SKY_CHANGE_SECONDS,
  SKY_IDS,
  blendSkies,
  createSkyChanger,
  sunDirection,
} from './skies';

describe('the courtyard skies', () => {
  it('has the briefed kinds, each with a name for its button', () => {
    // The owner's three first: UK grey (the default), blue with fluffy
    // clouds, and Quake's racing purple; then the rest.
    expect(SKY_IDS.slice(0, 3)).toEqual(['overcast', 'cumulus', 'quake']);
    expect(createSkyChanger().target).toBe('overcast');
    expect(SKIES.quake.layers).toBeGreaterThanOrEqual(2);
    expect(SKIES.quake.wind).toBeGreaterThan(SKIES.cumulus.wind * 20);
    for (const id of SKY_IDS) expect(SKIES[id].name.length).toBeGreaterThan(0);
  });

  it('puts the sun below the horizon at night and low at sunset', () => {
    expect(sunDirection(SKIES.night).y).toBeLessThan(0);
    expect(sunDirection(SKIES.sunset).y).toBeGreaterThan(0);
    expect(sunDirection(SKIES.sunset).y).toBeLessThan(0.1);
    const d = sunDirection(SKIES.clear);
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
  });

  it('blends from one sky to the next, ending exactly on it', () => {
    const half = blendSkies(SKIES.clear, SKIES.storm, 0.5);
    expect(half.cover).toBeGreaterThan(SKIES.clear.cover);
    expect(half.cover).toBeLessThan(SKIES.storm.cover);
    expect(blendSkies(SKIES.clear, SKIES.storm, 1)).toMatchObject({
      cover: SKIES.storm.cover,
      zenith: SKIES.storm.zenith,
    });
  });

  it('changes gradually when another sky is chosen', () => {
    const changer = createSkyChanger('clear');
    changer.choose('night');
    const early = changer.step(SKY_CHANGE_SECONDS * 0.25);
    expect(early.stars).toBeGreaterThan(0);
    expect(early.stars).toBeLessThan(1);
    const done = changer.step(SKY_CHANGE_SECONDS);
    expect(done).toBe(SKIES.night);
  });
});
