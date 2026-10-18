import { Mesh, MeshBasicMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { bbcWorkstation } from './bbc-workstation';

/** Local asset comparison only; research assets are deliberately excluded from builds. */
export async function bbcImportedWorkstation(kit: PanelKit) {
  if (!import.meta.env.DEV) return null;
  const url = new URL(
    'resources/models/bbc-micro/virtualbeeb/beeb.glb',
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
  const rocker = model.getObjectByName('ON_OFF_SWITCH');
  if (screen instanceof Mesh) {
    screen.material = part.view.cub.screen.material;
    screen.visible = false;
  }
  if (rocker) part.uses.set(rocker, part.model.power.flip);
  // Replace the source demo's baked screen text with our actual screen state.
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const replace = (material: import('three').Material) =>
      material.name === 'Message'
        ? new MeshBasicMaterial({ color: '#050706' })
        : material;
    object.material = Array.isArray(object.material)
      ? object.material.map(replace)
      : replace(object.material);
  });
  const update = part.update;
  const dispose = part.dispose;
  return {
    ...part,
    update(delta: number) {
      update(delta);
      if (screen) screen.visible = part.model.power.state.value;
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
      model.removeFromParent();
      dispose();
    },
  };
}
