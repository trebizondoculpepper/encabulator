import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCrtSurface } from '../views/crt-surface';
import { combineUnletteredKeys } from '../views/unlettered-keys';
import { mergeStatic } from '../../core/views/merge-static';
import { bbcWorkstation } from './bbc-workstation';

/** Local asset comparison only; research assets are deliberately excluded from builds. */
export async function bbcImportedWorkstation(kit: PanelKit) {
  if (!import.meta.env.DEV) return null;
  const url = new URL(
    'resources/models/bbc-micro/virtualbeeb/beeb-low.glb',
    document.baseURI,
  );
  const gltf = await new GLTFLoader().loadAsync(url.href);
  const part = bbcWorkstation(kit);
  const model = gltf.scene;
  model.name = 'Ant Mercer BBC Micro and Cub — VirtualBeeb comparison';
  model.position.copy(part.view.bbc.group.position);
  part.view.bbc.group.removeFromParent();
  part.view.cub.group.removeFromParent();
  part.object.add(model);
  const screen = model.getObjectByName('SCREEN');
  const monitor = model.getObjectByName('Monitor');
  const rocker = model.getObjectByName('ON_OFF_SWITCH');
  // The source's curved glass has incompatible UVs for a rectangular live
  // display. Give the tube a dedicated picture surface inside its bezel.
  screen?.removeFromParent();
  model.getObjectByName('Keyboard_CLEAR_PLASTIC_BLOCK')?.removeFromParent();
  const black = new MeshBasicMaterial({ color: '#020302' });
  const tube = new Mesh(createCrtSurface(0.304, 0.246), black);
  tube.position.set(0.0007, 0.1368, 0.194);
  tube.name = 'Cub black tube';
  const picture = new Mesh<
    import('three').BufferGeometry,
    import('three').Material
  >(createCrtSurface(0.276, 0.207), black);
  picture.position.set(0.0007, 0.1368, 0.1945);
  picture.name = 'Cub Mode 7 display';
  monitor?.add(tube, picture);
  if (rocker) part.uses.set(rocker, part.model.power.flip);
  const keys: Mesh[] = [];
  const originals = new Set<import('three').BufferGeometry>();
  const originalMaterials = new Set<import('three').Material>();
  model.traverse((object) => {
    if (!(object instanceof Mesh) || object === picture || object === tube)
      return;
    originals.add(object.geometry);
    const material = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    originalMaterials.add(material);
    if (
      object.name.startsWith('JOINED_KEYBOARD') ||
      material.name === 'SPACE_BAR'
    )
      keys.push(object);
  });
  const keyboard = combineUnletteredKeys(model, keys);
  const replacements = new Map<
    import('three').Material,
    MeshStandardMaterial
  >();
  model.traverse((object) => {
    if (
      !(object instanceof Mesh) ||
      object === keyboard ||
      object === picture ||
      object === tube
    )
      return;
    const source = object.material as MeshStandardMaterial;
    let material = replacements.get(source);
    if (!material) {
      material = new MeshStandardMaterial({
        color: source.color,
        map: source.name === 'Message' ? null : source.map,
        roughness: 0.75,
        metalness: source.metalness,
      });
      replacements.set(source, material);
    }
    object.material = material;
  });
  mergeStatic(
    model,
    Infinity,
    new Set([
      picture,
      tube,
      ...(rocker ? [rocker] : []),
      ...(keyboard ? [keyboard] : []),
    ]),
  );
  const update = part.update;
  const dispose = part.dispose;
  return {
    ...part,
    update(delta: number) {
      update(delta);
      picture.material = part.model.power.state.value
        ? part.view.cub.screen.material
        : black;
    },
    dispose() {
      const textures = new Set<import('three').Texture>();
      const allMaterials = new Set<import('three').Material>();
      model.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material === part.view.cub.screen.material) continue;
          allMaterials.add(material);
          for (const value of Object.values(material))
            if (value && typeof value === 'object' && 'isTexture' in value)
              textures.add(value as import('three').Texture);
        }
      });
      for (const material of allMaterials) material.dispose();
      for (const texture of textures) texture.dispose();
      for (const geometry of originals) geometry.dispose();
      for (const material of originalMaterials) material.dispose();
      model.removeFromParent();
      dispose();
    },
  };
}
