import { expect, it } from 'vite-plus/test';
import { assertDropProfile, DEFAULT_BOARD_DROP } from './drop-profile';
import type { DropProfile } from './drop-profile';
import { MACHINE_COMPONENTS } from './machine-components';
import {
  MACHINE_DROP_PROFILES,
  FUSE_CARTRIDGE_DROP,
} from './machine-drop-profiles';
import { createBoardFall, createPortableBoard } from './portable-board';

it('every catalogue component has complete immutable settling and sound settings', () => {
  expect(Object.keys(MACHINE_DROP_PROFILES)).toHaveLength(
    MACHINE_COMPONENTS.length,
  );
  for (const profile of [
    ...Object.values(MACHINE_DROP_PROFILES),
    FUSE_CARTRIDGE_DROP,
  ]) {
    expect(() => assertDropProfile(profile)).not.toThrow();
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.sound)).toBe(true);
  }
  expect(() =>
    createPortableBoard({
      ...DEFAULT_BOARD_DROP,
      sound: undefined,
    } as unknown as DropProfile),
  ).toThrow(/sound/);
});

function drop(profile: DropProfile, dt = 1 / 120) {
  const fall = createBoardFall(0, 1.5, 0, 0.65, 0.2, profile, () => 0.9);
  let time = 0;
  let strikes = 0;
  while (!fall.body.settled && time < 8) {
    fall.step(
      dt,
      () => 0,
      () => strikes++,
    );
    time += dt;
  }
  expect(fall.body.settled).toBe(true);
  expect(fall.body.y).toBe(0);
  return { time, body: fall.body, strikes };
}

it('every pickable profile lands and settles, even at low frame rates', () => {
  for (const profile of [
    ...Object.values(MACHINE_DROP_PROFILES),
    FUSE_CARTRIDGE_DROP,
  ])
    for (const dt of [1 / 120, 1 / 30, 0.1]) drop(profile, dt);
});

it('flat boards stop quickly, boxes tumble/skitter, and fuses roll straight without chattering', () => {
  const flat = drop(MACHINE_DROP_PROFILES.backplane);
  const box = drop(MACHINE_DROP_PROFILES.overload);
  const round = drop(FUSE_CARTRIDGE_DROP);
  expect(box.time).toBeGreaterThan(flat.time);
  expect(round.time).toBeGreaterThan(flat.time);
  expect(box.body.angle).toBeGreaterThan(0.2);
  expect(round.body.angle).toBeGreaterThan(Math.PI * 2);
  expect(round.strikes).toBe(1);
  expect(round.body.z / round.body.x).toBeCloseTo(0.2 / 0.65);
  expect(box.body.z / box.body.x).not.toBeCloseTo(0.2 / 0.65, 2);
});
