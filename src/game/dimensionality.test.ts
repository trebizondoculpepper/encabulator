import { describe, expect, it } from 'vite-plus/test';
import {
  BUILD_SECONDS,
  achievedDimension,
  allowedDimension,
  hypercube,
  projectStage,
  stepDimension,
} from './dimensionality';

const all = {
  control: true,
  automation: true,
  drive: true,
  phase: true,
  flow: true,
  arm: true,
};

describe('dimensionality', () => {
  it('allows each stage only with every condition before it', () => {
    expect(allowedDimension(all)).toBe(6);
    expect(allowedDimension({ ...all, phase: false })).toBe(3);
    // A later condition alone does not jump the progression.
    expect(allowedDimension({ ...all, control: true, automation: false })).toBe(
      1,
    );
    expect(allowedDimension({ ...all, control: false })).toBe(0);
  });

  it('builds a dimension at a time and settles where its conditions stop', () => {
    let progress = 0;
    for (let t = 0; t < BUILD_SECONDS * 2.5; t += 0.1)
      progress = stepDimension(progress, 3, 0.1);
    expect(achievedDimension(progress)).toBe(2);
    for (let t = 0; t < BUILD_SECONDS * 10; t += 0.1)
      progress = stepDimension(progress, 3, 0.1);
    expect(progress).toBe(3);
  });

  it('collapses when a condition goes, and is lost without its supply', () => {
    let progress = 4;
    progress = stepDimension(progress, 2, 0.5);
    expect(progress).toBe(3);
    progress = stepDimension(progress, 2, 5);
    expect(progress).toBe(2);
    expect(stepDimension(progress, 2, 0.01, false)).toBe(0);
  });

  it('makes n-cubes with 2^n corners and n 2^(n-1) edges', () => {
    for (let n = 1; n <= 6; n++) {
      const cube = hypercube(n);
      expect(cube.vertices).toHaveLength(2 ** n);
      expect(cube.edges).toHaveLength(n * 2 ** (n - 1));
    }
  });

  it('draws the stage being built, growing its newest axis', () => {
    expect(projectStage(0.5, 0).n).toBe(1);
    expect(projectStage(3, 0).n).toBe(3);
    expect(projectStage(3.5, 0).edges).toHaveLength(32);
    expect(projectStage(6, 2).n).toBe(6);
    for (const [a, b] of projectStage(5.7, 3).edges)
      for (const value of [...a, ...b])
        expect(Math.abs(value)).toBeLessThanOrEqual(1);
  });
});
