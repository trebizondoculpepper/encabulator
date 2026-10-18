/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * The toolkit is three layers, so that it can be lifted out of this game
 * into a package of its own: `controls` (how inputs work) imports nothing
 * else of ours; `components` (the simulated things) imports only
 * `controls`; `gallery` (the exhibition rooms) imports both. Nothing in the
 * toolkit imports the game. The game may import anything.
 */
const ROOT = 'src/toolkit';
const ORDER = ['controls', 'components', 'gallery'] as const;
type Layer = (typeof ORDER)[number] | 'game';

/**
 * Known exceptions, each to be removed before the toolkit is extracted.
 * The room chain lists the game's own rooms beside the gallery's, and
 * places the training room's door from its plan: the chain should become
 * something the game hands the gallery.
 */
const EXCEPTIONS = new Set([
  'src/toolkit/gallery/logic/dev-room-links.ts -> src/game/training-room-plan',
]);

const layerOf = (path: string): Layer => {
  const inside = relative(ROOT, path).split('/')[0];
  return (ORDER as readonly string[]).includes(inside)
    ? (inside as Layer)
    : 'game';
};
const allowed: Record<Layer, readonly Layer[]> = {
  controls: ['controls'],
  components: ['controls', 'components'],
  gallery: ['controls', 'components', 'gallery'],
  game: ['controls', 'components', 'gallery', 'game'],
};

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (path.endsWith('.ts')) yield path;
  }
}

describe('the toolkit layers', () => {
  it('import only downwards: controls, then components, then gallery', () => {
    const wrong: string[] = [];
    for (const file of sources(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(
        /(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"?]+)['"]/g,
      )) {
        const target = normalize(join(dirname(file), match[1]));
        const link = `${file} -> ${target}`;
        if (EXCEPTIONS.has(link)) continue;
        if (!allowed[layerOf(file)].includes(layerOf(target))) wrong.push(link);
      }
    }
    expect(wrong).toEqual([]);
  });
});
