/**
 * Anatomy atlas loader — x-ray mode backend.
 *
 * The atlas is STATIC reference geometry (788 muscles / 1,243 bone pieces,
 * calibrated to a 175.3 cm male) loaded from `public/anatomy/*.glb` with
 * EXT_meshopt_compression. It is intentionally NOT a replacement for the
 * parametric OxiHuman body (which is morphed by the user's real measurements
 * via the fit solver): it is an overlay layer so the user can see the anatomy
 * inside their own fitted body — the same "reference profile, not ideal body"
 * principle, applied to the 3D view.
 *
 * Both layers are scaled and grounded to the live body's bounding box, so the
 * x-ray reads correctly for any height/weight the engine produces.
 */

import type { Group, Scene } from 'three';

/** Public-dir asset URL, honoring any Vite `base` (GitHub Pages subpaths). */
function assetUrl(path: string): string {
  // import.meta.env.BASE_URL is '/' or '/repo/' — join without double slashes.
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}/${path}`;
}

const MUSCLES_URL = assetUrl('anatomy/anatomy-muscles.glb');
const SKELETON_URL = assetUrl('anatomy/anatomy-skeleton.glb');

export type AtlasStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AnatomyAtlas {
  muscles: Group;
  skeleton: Group;
}

/**
 * Load both anatomy layers. Uses dynamic imports so the GLTF/meshopt code
 * (and the ~8 MB of GLB data) never load unless the user enables x-ray mode.
 */
export async function loadAnatomyAtlas(): Promise<AnatomyAtlas> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder); // anatomy GLBs use EXT_meshopt_compression

  const load = (url: string) =>
    new Promise<Group>((resolve, reject) => {
      loader.load(url, (g) => resolve(g.scene as Group), undefined, reject);
    });

  const [muscles, skeleton] = await Promise.all([load(MUSCLES_URL), load(SKELETON_URL)]);
  muscles.name = 'atlasMuscles';
  skeleton.name = 'atlasSkeleton';

  // The reference body is hidden by default in the atlas; here BOTH layers
  // start hidden and become visible per the x-ray sliders.
  muscles.visible = false;
  skeleton.visible = false;

  return { muscles, skeleton };
}

/**
 * Uniformly scale + center an atlas layer onto the body mesh's bounding box.
 * The atlas is calibrated to 175.3 cm; we match total height and ground line
 * so the overlay aligns with the fitted body regardless of its dimensions.
 */
export function fitAtlasToBody(
  atlas: AnatomyAtlas,
  body: import('three').Mesh,
  THREEmod: typeof import('three'),
): void {
  if (!body.geometry) return;
  body.geometry.computeBoundingBox();
  const bb = body.geometry.boundingBox;
  if (!bb) return;

  const bodyHeight = bb.max.y - bb.min.y;
  if (bodyHeight <= 0) return;

  const fit = (group: Group) => {
    // Atlas height from its own bounding box (after its root transforms).
    const box = new THREEmod.Box3().setFromObject(group);
    const atlasHeight = box.max.y - box.min.y;
    if (atlasHeight <= 0) return;

    const s = bodyHeight / atlasHeight;
    group.scale.setScalar(s);

    // Re-measure after scaling and move so the layer stands on the same
    // ground line (min.y) as the body, centered on X/Z.
    const box2 = new THREEmod.Box3().setFromObject(group);
    const center = new THREEmod.Vector3();
    box2.getCenter(center);
    group.position.x -= center.x;
    group.position.z -= center.z;
    group.position.y += bb.min.y - box2.min.y;
  };

  fit(atlas.muscles);
  fit(atlas.skeleton);
}

/**
 * Apply per-layer opacity (0..1) with correct transparency flags.
 * Mirrors the corpus reference implementation: depthWrite off below 0.6 so
 * transparent layers don't punch holes in each other's sort order.
 */
export function setLayerOpacity(group: Group, opacity: number): void {
  group.traverse((o) => {
    const mesh = o as import('three').Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as import('three').MeshStandardMaterial;
      mat.transparent = opacity < 0.999;
      mat.opacity = opacity;
      mat.depthWrite = opacity > 0.6;
      mat.needsUpdate = true;
    }
  });
  group.visible = opacity > 0.01;
}

/** Dispose every geometry/material under a group (cleanup on unmount). */
export function disposeAtlas(atlas: AnatomyAtlas | null): void {
  if (!atlas) return;
  atlas.muscles.traverse((o) => {
    const mesh = o as import('three').Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => (m as import('three').Material).dispose());
  });
  atlas.skeleton.traverse((o) => {
    const mesh = o as import('three').Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => (m as import('three').Material).dispose());
  });
}

/** Re-fit both layers after the body mesh is rebuilt (morph changed the box). */
export function refitAtlas(atlas: AnatomyAtlas | null, scene: Scene, THREEmod: typeof import('three')): void {
  if (!atlas) return;
  const body = scene.getObjectByName('bodyMesh') as import('three').Mesh | undefined;
  if (!body) return;
  fitAtlasToBody(atlas, body, THREEmod);
}
