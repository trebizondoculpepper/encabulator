import { expect, it } from 'vite-plus/test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { createSmokeDamage } from './smoke-damage';

it('blackens what is inside, unevenly, and cleans it back exactly', () => {
  const shared = new MeshStandardMaterial({ color: '#c0c8d0', roughness: 0.3 });
  const works = new Group();
  const low = new Mesh(new BoxGeometry(), shared);
  const high = new Mesh(new BoxGeometry(), shared);
  high.position.y = 1;
  works.add(low, high);
  // Something outside sharing the same material is not touched.
  const outside = new Mesh(new BoxGeometry(), shared);
  const damage = createSmokeDamage(works);
  damage.set(0.8);
  const shade = (m: Mesh) =>
    (m.material as MeshStandardMaterial).color.getHSL({ h: 0, s: 0, l: 0 }).l;
  expect(shade(low)).toBeLessThan(shade(outside));
  // Smoke gathers higher up.
  expect(shade(high)).toBeLessThan(shade(low));
  expect((high.material as MeshStandardMaterial).roughness).toBeGreaterThan(
    0.3,
  );
  expect(outside.material).toBe(shared);
  damage.set(0);
  expect(low.material).toBe(shared);
  expect(high.material).toBe(shared);
  expect(shared.color.getHexString()).toBe('c0c8d0');
});
