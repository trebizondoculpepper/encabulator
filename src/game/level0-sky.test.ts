import { expect, it } from 'vite-plus/test';
import { SKIES as DOME_SKIES } from './skies';
import { SKIES, domeSky, mixColour, pickWeather, skyLook } from './level0-sky';

it('starts as asked, or at random among overcast, sunny and night', () => {
  expect(pickWeather('night')).toBe('night');
  expect(pickWeather('hell', () => 0)).toBe('overcast');
  expect(pickWeather(null, () => 0.99)).toBe('night');
  expect(pickWeather(null, () => 0.5)).toBe('sunny');
});

it('is its own sky without hell, and hell itself at full', () => {
  expect(skyLook('sunny', 0)).toEqual(SKIES.sunny);
  expect(skyLook('night', 1)).toEqual(SKIES.hell);
});

it('turns towards hell by degrees', () => {
  expect(mixColour('#000000', '#ff0000', 0.5)).toBe('#800000');
  const half = skyLook('overcast', 0.5);
  expect(half.daylight).toBeCloseTo(
    (SKIES.overcast.daylight + SKIES.hell.daylight) / 2,
  );
});

it('draws its sky as the courtyard does, turning to HELL', () => {
  expect(domeSky('overcast', 0)).toEqual(DOME_SKIES.overcast);
  expect(domeSky('sunny', 0)).toEqual(DOME_SKIES.cumulus);
  expect(domeSky('night', 1).quake).toBe(1);
  expect(domeSky('night', 1).name).toBe('HELL');
});
