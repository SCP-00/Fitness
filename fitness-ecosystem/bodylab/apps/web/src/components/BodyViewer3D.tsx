import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Move, ZoomIn, Wand2, Loader2, CheckCircle2, AlertTriangle, Bone, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/store';
import { parseOximBinary } from '../lib/oxim-parser';
import {
  loadAnatomyAtlas,
  fitAtlasToBody,
  setLayerOpacity,
  disposeAtlas,
  refitAtlas,
  type AnatomyAtlas,
} from '../lib/anatomy-loader';

/** Shell opacity while x-ray mode is active (skin becomes translucent glass). */
const XRAY_SHELL_OPACITY = 0.14;
import {
  applyToEngine,
  collectFitTargets,
  fitSegmentLabel,
  fitToMeasurements,
  type FitReportSegment,
  type ModelMeasurements,
  type OxiHumanEngine,
} from '../lib/morph-mapper';

// Lazy-loaded Three.js references
let THREE: typeof import('three') | null = null;
let OrbitControlsClass: (new (
  camera: import('three').Camera,
  domElement: HTMLElement
) => import('three').EventDispatcher & { target: import('three').Vector3; enableDamping: boolean; dampingFactor: number; minDistance: number; maxDistance: number; maxPolarAngle: number; update(): void }) | null = null;

/** Skin tone palette for the body material (persisted viewer preference). */
const SKIN_TONES: { id: string; color: string; label: { en: string; es: string } }[] = [
  { id: 'porcelain', color: '#f2d6c3', label: { en: 'Porcelain', es: 'Porcelana' } },
  { id: 'fair', color: '#e6b89c', label: { en: 'Fair', es: 'Clara' } },
  { id: 'medium', color: '#d4a574', label: { en: 'Medium', es: 'Media' } },
  { id: 'tan', color: '#b97f57', label: { en: 'Tan', es: 'Morena' } },
  { id: 'brown', color: '#8d5a3a', label: { en: 'Brown', es: 'Bruna' } },
  { id: 'deep', color: '#5d3a26', label: { en: 'Deep', es: 'Oscura' } },
];
const SKIN_TONE_KEY = 'bodylab-skin-tone';

function loadSkinToneId(): string {
  try {
    const id = localStorage.getItem(SKIN_TONE_KEY);
    if (id && SKIN_TONES.some((t) => t.id === id)) return id;
  } catch { /* storage unavailable */ }
  return 'medium';
}

function skinToneColor(id: string): string {
  return (SKIN_TONES.find((t) => t.id === id) ?? SKIN_TONES[2]).color;
}

/** Radial-gradient "stage" disc texture from the theme's border color. */
function makeStageTexture(): import('three').CanvasTexture {
  // Called only after the lazy three.js module has loaded; the guard also
  // narrows the module-level `THREE | null` for TypeScript.
  if (!THREE) throw new Error('Three.js is not loaded yet');
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const hex = cssVarHex('--color-border');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `${hex}88`);
  grad.addColorStop(1, `${hex}00`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface BodyViewer3DProps {
  width?: number;
  height?: number;
}

type CameraPreset = 'front' | 'back' | 'side';

const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  front: { position: [0, 0.9, 6], target: [0, 0.9, 0] },
  back: { position: [0, 0.9, -6], target: [0, 0.9, 0] },
  side: { position: [6, 0.9, 0], target: [0, 0.9, 0] },
};

/** Resolve a CSS custom color (e.g. `--color-bg`) to a hex string Three.js understands. */
function cssVarHex(name: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  } catch {}
  return name === '--color-bg' ? '#f6f7fb' : '#161d27';
}

export default function BodyViewer3D({ width = 600, height = 700 }: BodyViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OxiHumanEngine | null>(null);
  const sceneRef = useRef<import('three').Scene | null>(null);
  const rendererRef = useRef<import('three').WebGLRenderer | null>(null);
  const cameraRef = useRef<import('three').PerspectiveCamera | null>(null);
  const controlsRef = useRef<import('three').EventDispatcher | null>(null);
  const meshRef = useRef<import('three').Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const envTextureRef = useRef<import('three').Texture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelMeasurements, setModelMeasurements] = useState<ModelMeasurements | null>(null);
  const [showHints, setShowHints] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('front');
  const [isFitting, setIsFitting] = useState(false);
  const [fitSegments, setFitSegments] = useState<FitReportSegment[] | null>(null);
  const [fitConverged, setFitConverged] = useState<boolean | null>(null);
  const [fitIterations, setFitIterations] = useState<number | null>(null);
  const [fitError, setFitError] = useState<string | null>(null);
  const [skinToneId, setSkinToneId] = useState(loadSkinToneId);
  const skinToneRef = useRef(skinToneId);

  // ── Anatomy x-ray mode (lazy atlas: ~8 MB GLBs load only on first toggle) ──
  const atlasRef = useRef<AnatomyAtlas | null>(null);
  const [xrayMode, setXrayMode] = useState(false);
  const xrayModeRef = useRef(false);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [xrayError, setXrayError] = useState<string | null>(null);
  const [muscleOpacity, setMuscleOpacity] = useState(70);
  const [boneOpacity, setBoneOpacity] = useState(90);

  const { state } = useApp();
  const { profile, measurements } = state;
  const lang = state.language;

  // Hide hints after first interaction
  useEffect(() => {
    if (!showHints) return;
    const timer = setTimeout(() => setShowHints(false), 5000);
    return () => clearTimeout(timer);
  }, [showHints]);

  // Frame the whole body inside the viewport (fit-to-view, not clip-to-face)
  const frameToFit = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current as { target: import('three').Vector3; update(): void } | null;
    const mesh = meshRef.current;
    if (!camera || !controls || !mesh?.geometry || !THREE) return;

    mesh.geometry.computeBoundingSphere();
    const sph = mesh.geometry.boundingSphere;
    if (!sph || sph.radius <= 0) return;

    // Aim at the model's center of mass, low enough to keep feet in frame
    controls.target.copy(sph.center);

    const fovRad = (camera.fov * Math.PI) / 180;
    const fitDist = (sph.radius / Math.sin(fovRad / 2)) * 1.22;
    const dir = camera.position.clone().sub(sph.center);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    camera.position.copy(sph.center).addScaledVector(dir, fitDist);
    camera.near = Math.max(0.05, fitDist / 40);
    camera.far = Math.max(100, fitDist * 8);
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  // Paint the studio background + stage gradient to match the active theme
  const applyThemeToScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !THREE) return;
    scene.background = new THREE.Color(cssVarHex('--color-bg'));
    const stage = scene.getObjectByName('stage') as import('three').Mesh | undefined;
    if (stage) {
      const mat = stage.material as import('three').MeshBasicMaterial;
      mat.map?.dispose();
      mat.map = makeStageTexture();
      mat.needsUpdate = true;
    }
  }, []);

  const buildMesh = useCallback(async () => {
    if (!engineRef.current || !sceneRef.current || !THREE) return;

    const engine = engineRef.current;        const scene = sceneRef.current;

        // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      if (meshRef.current.geometry) meshRef.current.geometry.dispose();
      if (meshRef.current.material) {
        const mat = meshRef.current.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
      meshRef.current = null;
    }

    // Build new mesh
    engine.refresh_geometry();
    const bytes: Uint8Array = engine.build_mesh_bytes();
    const parsedMesh = parseOximBinary(bytes);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(parsedMesh.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(parsedMesh.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(parsedMesh.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(parsedMesh.indices, 1));

    // Physical skin: sheen fakes soft dermal scattering, the low clearcoat a
    // subtle oil highlight; tone comes from the persisted palette.
    const toneColor = new THREE.Color(skinToneColor(skinToneRef.current));
    const material = new THREE.MeshPhysicalMaterial({
      color: toneColor,
      roughness: 0.48,
      metalness: 0.0,
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: toneColor.clone().lerp(new THREE.Color(0xffffff), 0.35),
      clearcoat: 0.08,
      clearcoatRoughness: 0.5,
      specularIntensity: 0.6,
    });

    const threeMesh = new THREE.Mesh(geometry, material);
    threeMesh.castShadow = true;
    threeMesh.receiveShadow = true;
    threeMesh.name = 'bodyMesh';
    scene.add(threeMesh);
    meshRef.current = threeMesh;

    // Rebuilds while x-ray mode is active must keep the shell translucent and
    // re-align the atlas layers to the new bounding box.
    if (xrayModeRef.current) {
      material.transparent = true;
      material.opacity = XRAY_SHELL_OPACITY;
      material.depthWrite = false;
    }
    if (atlasRef.current) refitAtlas(atlasRef.current, scene, THREE);

    frameToFit();
  }, [frameToFit]);

  // Move camera to preset (framing is computed from the model's bounding sphere)
  const moveCamera = useCallback((preset: CameraPreset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current as { target: import('three').Vector3; update(): void } | null;
    if (!camera || !controls) return;

    const p = CAMERA_PRESETS[preset];
    camera.position.set(...p.position);
    controls.target.set(...p.target);
    controls.update();
    setCameraPreset(preset);
    requestAnimationFrame(() => frameToFit());
  }, [frameToFit]);

  // Reset camera
  const resetCamera = useCallback(() => {
    moveCamera('front');
  }, [moveCamera]);

  // Live-update the body material to the selected skin tone (no mesh rebuild)
  const applySkinTone = useCallback((id: string) => {
    skinToneRef.current = id;
    setSkinToneId(id);
    try { localStorage.setItem(SKIN_TONE_KEY, id); } catch { /* storage unavailable */ }
    if (!THREE) return;
    const mat = meshRef.current?.material as import('three').MeshPhysicalMaterial | undefined;
    if (mat) {
      const color = new THREE.Color(skinToneColor(id));
      mat.color.copy(color);
      mat.sheenColor.copy(color).lerp(new THREE.Color(0xffffff), 0.35);
    }
  }, []);

  // ── X-ray mode: enable/disable + per-layer opacity ───────────────────
  const enableXray = useCallback(async () => {
    if (atlasRef.current) {
      xrayModeRef.current = true;
      setXrayMode(true);
      return;
    }
    if (xrayLoading) return;
    setXrayLoading(true);
    setXrayError(null);
    try {
      if (!THREE) throw new Error('3D engine is not ready yet');
      const atlas = await loadAnatomyAtlas();
      if (atlasRef.current) return; // double-toggle race: first load won
      atlasRef.current = atlas;
      const scene = sceneRef.current;
      const body = scene?.getObjectByName('bodyMesh') as import('three').Mesh | undefined;
      if (scene && body) {
        fitAtlasToBody(atlas, body, THREE);
        scene.add(atlas.muscles, atlas.skeleton);
        setLayerOpacity(atlas.muscles, muscleOpacity / 100);
        setLayerOpacity(atlas.skeleton, boneOpacity / 100);
      }
      xrayModeRef.current = true;
      setXrayMode(true);
    } catch (err) {
      console.error('[3D] Anatomy atlas load failed:', err);
      setXrayError(err instanceof Error ? err.message : 'Failed to load anatomy');
    } finally {
      setXrayLoading(false);
    }
  }, [xrayLoading, muscleOpacity, boneOpacity]);

  const disableXray = useCallback(() => {
    xrayModeRef.current = false;
    setXrayMode(false);
    if (atlasRef.current && THREE) {
      setLayerOpacity(atlasRef.current.muscles, 0);
      setLayerOpacity(atlasRef.current.skeleton, 0);
    }
  }, []);

  // Shell translucency follows x-ray mode (and survives tone changes).
  useEffect(() => {
    if (!THREE) return;
    const mat = meshRef.current?.material as import('three').MeshPhysicalMaterial | undefined;
    if (!mat) return;
    if (xrayMode) {
      mat.transparent = true;
      mat.opacity = XRAY_SHELL_OPACITY;
      mat.depthWrite = false;
    } else {
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
    }
    mat.needsUpdate = true;
  }, [xrayMode]);

  // Slider → layer opacity (live, no remount).
  useEffect(() => {
    if (!atlasRef.current || !THREE) return;
    setLayerOpacity(atlasRef.current.muscles, muscleOpacity / 100);
  }, [muscleOpacity, xrayMode]);
  useEffect(() => {
    if (!atlasRef.current || !THREE) return;
    setLayerOpacity(atlasRef.current.skeleton, boneOpacity / 100);
  }, [boneOpacity, xrayMode]);

  // Run the engine's fit solver against the profile's real measurements
  const runFit = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || isFitting || loading || error) return;

    const targets = collectFitTargets(profile, measurements);
    if (Object.keys(targets).length === 0) return;

    setFitError(null);
    setIsFitting(true);
    // Let the "Fitting…" state paint before the blocking (~1.3 s) solve runs
    await new Promise(r => setTimeout(r, 50));
    try {
      const report = fitToMeasurements(engine, targets);
      await buildMesh();
      const m = engine.get_measurements();
      setModelMeasurements({
        heightCm: m.height_cm(),
        chestCm: m.chest_cm(),
        waistCm: m.waist_cm(),
        hipCm: m.hip_cm(),
        weightKg: m.weight_kg(),
      });
      setFitSegments(report.results);
      setFitConverged(report.converged);
      setFitIterations(report.iterations);
    } catch (err) {
      console.error('[3D] Fit failed:', err);
      setFitError(err instanceof Error ? err.message : 'Fit failed');
    } finally {
      setIsFitting(false);
    }
  }, [isFitting, loading, error, profile, measurements, buildMesh]);

  // Initialize
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    let disposed = false;
    // The renderer is created asynchronously inside `init`; keep a local handle
    // so the cleanup closes over the instance instead of reading a ref.
    let createdRenderer: import('three').WebGLRenderer | null = null;

    // Timeout: if 3D doesn't load in 20 seconds, show error
    const timeoutId = setTimeout(() => {
      if (!disposed && loading) {
        setError('3D model timed out — check console for details');
        setLoading(false);
      }
    }, 20000);

    async function init() {
      try {
        const [threeMod, controlsMod, envMod] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
        ]);

        if (disposed) return;

        THREE = threeMod;
        OrbitControlsClass = controlsMod.OrbitControls;

        // Load OxiHuman (vendor 0.2.1 glue — the engine that can read OHPK v1)
        const { loadOxiHuman } = await import('../lib/oxihuman-loader');
        const oxiMod = await loadOxiHuman();

        // Load asset pack (canonical v0.2.1 OHPK — SHA-verified against upstream).
        // BASE_URL-aware: works at domain root and under a subpath (project pages).
        const base = import.meta.env.BASE_URL ?? '/';
        const resp = await fetch(`${base.replace(/\/$/, '')}/oxihuman-core-v1.ohpk`);
        if (!resp.ok) throw new Error(`Asset pack fetch failed: ${resp.status}`);
        const packBytes = new Uint8Array(await resp.arrayBuffer());
        console.log('[3D] Asset pack loaded:', packBytes.length, 'bytes');

        // 0.2.1 API: OHPK core pack replaces the stub mesh in one call
        const engine = oxiMod.OxiHumanEngine.from_core_pack_bytes(packBytes);
        console.log('[3D] Engine created from core pack (38 targets wired)');
        engineRef.current = engine;

        // Apply initial params
        if (profile) {
          applyToEngine(engine, profile, measurements);
          try {
            const m = engine.get_measurements();
            setModelMeasurements({
              heightCm: m.height_cm(),
              chestCm: m.chest_cm(),
              waistCm: m.waist_cm(),
              hipCm: m.hip_cm(),
              weightKg: m.weight_kg(),
            });
          } catch {}
        }

        // Setup Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(cssVarHex('--color-bg'));
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(0, 0.9, 6);
        camera.lookAt(0, 0.9, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        if (containerRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }
        rendererRef.current = renderer;
        createdRenderer = renderer;

        // IBL — RoomEnvironment through PMREM gives the skin real ambient
        // reflections (the single biggest realism win over flat lights only).
        // Needs the renderer, so it runs after renderer creation.
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new envMod.RoomEnvironment();
        const envTexture = pmrem.fromScene(envScene, 0.04).texture;
        pmrem.dispose();
        envScene.dispose();
        scene.environment = envTexture;
        scene.environmentIntensity = 0.55;
        envTextureRef.current = envTexture;

        const controls = new OrbitControlsClass(camera, renderer.domElement);
        controls.target.set(0, 0.9, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 1.2;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI * 0.8;
        controls.update();
        controlsRef.current = controls;

        // Hide hints on interaction
        const hideHints = () => setShowHints(false);
        renderer.domElement.addEventListener('pointerdown', hideHints, { once: true });

        // Lighting — IBL carries ambient; direct lights only shape + shadow.
        // (Rebalanced down from the pre-IBL values so skin doesn't blow out.)
        const ambient = new THREE.AmbientLight(0xffffff, 0.12);
        scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xfff2e4, 1.25);
        keyLight.position.set(2.5, 5, 4);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 20;
        keyLight.shadow.camera.left = -2;
        keyLight.shadow.camera.right = 2;
        keyLight.shadow.camera.top = 3;
        keyLight.shadow.camera.bottom = -1;
        keyLight.shadow.camera.updateProjectionMatrix();
        keyLight.shadow.bias = -0.0002;
        keyLight.shadow.normalBias = 0.02;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xcdd7ff, 0.35);
        fillLight.position.set(-3.5, 2.5, -2);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 1.5, -6);
        scene.add(rimLight);

        // Stage: soft radial-gradient disc + invisible shadow-catcher. The
        // gradient grounds the body without a hard "coaster" edge; the
        // ShadowMaterial plane shows only the contact shadow and stays
        // transparent to the theme background.
        const stage = new THREE.Mesh(
          new THREE.CircleGeometry(5, 64),
          new THREE.MeshBasicMaterial({ map: makeStageTexture(), transparent: true, depthWrite: false })
        );
        stage.name = 'stage';
        stage.rotation.x = -Math.PI / 2;
        stage.position.y = 0.001;
        scene.add(stage);

        const catcher = new THREE.Mesh(
          new THREE.CircleGeometry(5, 64),
          new THREE.ShadowMaterial({ opacity: 0.3 })
        );
        catcher.name = 'shadowCatcher';
        catcher.rotation.x = -Math.PI / 2;
        catcher.position.y = 0.002;
        catcher.receiveShadow = true;
        scene.add(catcher);

        // React to theme changes while the viewer is mounted
        const themeObserver = new MutationObserver(() => applyThemeToScene());
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        (renderer as unknown as { _themeObserver?: MutationObserver })._themeObserver = themeObserver;

        await buildMesh();

        function animate() {
          frameRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        setLoading(false);
        clearTimeout(timeoutId);
      } catch (err) {
        console.error('[3D] Init failed:', err);
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Failed to initialize 3D viewer');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    }

    init();

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameRef.current);
      rendererRef.current?.dispose();
      envTextureRef.current?.dispose();
      envTextureRef.current = null;
      (rendererRef.current as unknown as { _themeObserver?: MutationObserver })?. _themeObserver?.disconnect();
      disposeAtlas(atlasRef.current);
      atlasRef.current = null;
      xrayModeRef.current = false;
      engineRef.current?.free();
      if (containerEl && createdRenderer?.domElement) {
        try { containerEl.removeChild(createdRenderer.domElement); } catch {}
      }
    };
    // Intentionally runs once per mount (and on size changes): re-creating the
    // WebGL scene whenever profile/measurements change would thrash the canvas.
    // Those updates are applied incrementally by the effects below.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, buildMesh]);

  // Update body params when profile or measurements change
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !profile) return;

    applyToEngine(engine, profile, measurements);

    try {
      const m = engine.get_measurements();
      setModelMeasurements({
        heightCm: m.height_cm(),
        chestCm: m.chest_cm(),
        waistCm: m.waist_cm(),
        hipCm: m.hip_cm(),
        weightKg: m.weight_kg(),
      });
    } catch {}

    buildMesh();
  }, [profile, measurements, buildMesh]);

  // Auto-fit the body to the profile's real measurements once the engine is
  // live, so the model is personal from the start (not a generic reference).
  // Re-runs on remount (e.g. switching 2D ⇄ 3D); the manual "Fit body" button
  // re-fits after the user edits measurements mid-session.
  const autoFitDoneRef = useRef(false);
  useEffect(() => {
    const engine = engineRef.current;
    if (loading || !engine || !profile) return;
    if (autoFitDoneRef.current) return;
    autoFitDoneRef.current = true;

    const targets = collectFitTargets(profile, measurements);
    if (Object.keys(targets).length === 0) return;

    (async () => {
      try {
        const report = fitToMeasurements(engine, targets);
        await buildMesh();
        const m = engine.get_measurements();
        setModelMeasurements({
          heightCm: m.height_cm(),
          chestCm: m.chest_cm(),
          waistCm: m.waist_cm(),
          hipCm: m.hip_cm(),
          weightKg: m.weight_kg(),
        });
        setFitSegments(report.results);
        setFitConverged(report.converged);
        setFitIterations(report.iterations);
      } catch (err) {
        console.warn('[3D] Auto-fit skipped:', err);
      }
    })();
  }, [loading, profile, measurements, buildMesh]);

  // ── Error overlay ────────────────────────────────────────────────────
  const errorOverlay = error ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-input-bg)] rounded-2xl border border-[var(--color-input-border)]">
      <div className="text-center p-8 max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-slate-700 dark:text-[var(--color-text)] font-semibold mb-1">
          {lang === 'es' ? 'Modelo 3D no disponible' : '3D model unavailable'}
        </p>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {lang === 'es'
            ? 'Tu cuerpo y mediciones 2D siguen disponibles.'
            : 'Your body and 2D measurements remain available.'}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Loading overlay ──────────────────────────────────────────────────
  const loadingOverlay = loading ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-input-bg)] rounded-2xl border border-[var(--color-input-border)]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-[var(--color-primary-light)] dark:border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-slate-600 dark:text-[var(--color-text-secondary)] font-medium text-sm">
          {lang === 'es' ? 'Preparando modelo 3D…' : 'Preparing 3D model…'}
        </p>
        <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] mt-1">OxiHuman WASM</p>
      </div>
    </div>
  ) : null;

  // ── 3D Viewer ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Camera controls + Fit action — visible only when the viewer is live */}
      {!loading && !error && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[var(--color-surface)] p-1 rounded-lg">
            {([
              { preset: 'front' as const, label: lang === 'es' ? 'Frontal' : 'Front' },
              { preset: 'back' as const, label: lang === 'es' ? 'Posterior' : 'Back' },
              { preset: 'side' as const, label: lang === 'es' ? 'Lateral' : 'Side' },
            ]).map(p => (
              <button
                key={p.preset}
                onClick={() => moveCamera(p.preset)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  cameraPreset === p.preset
                    ? 'bg-white dark:bg-[var(--color-surface-elevated)] text-slate-900 dark:text-[var(--color-text)] shadow-sm'
                    : 'text-slate-500 dark:text-[var(--color-text-muted)] hover:text-slate-700 dark:hover:text-[var(--color-text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Anatomy x-ray toggle — lazy-loads the atlas on first use */}
            <button
              onClick={() => (xrayMode ? disableXray() : void enableXray())}
              disabled={xrayLoading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                xrayMode
                  ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98]'
                  : 'bg-slate-100 dark:bg-[var(--color-surface)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-slate-200 dark:hover:bg-[var(--color-surface-elevated)] active:scale-[0.98]'
              }`}
              title={lang === 'es' ? 'Ver la anatomía dentro de tu cuerpo' : 'See the anatomy inside your body'}
            >
              {xrayLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : xrayMode ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <Bone className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Rayos X' : 'X-ray'}
            </button>
            {/* Fit body to the profile's measurements (0.2.1 fit solver, ~1.3 s) */}
            <button
              onClick={runFit}
              disabled={isFitting || Object.keys(collectFitTargets(profile, measurements)).length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isFitting
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] cursor-wait'
                  : 'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:scale-[0.98]'
              }`}
              title={lang === 'es' ? 'Ajusta el modelo 3D a tus medidas reales' : 'Fit the 3D model to your real measurements'}
            >
              {isFitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {lang === 'es' ? 'Ajustando…' : 'Fitting…'}
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  {lang === 'es' ? 'Ajustar cuerpo' : 'Fit body'}
                </>
              )}
            </button>
            <button
              onClick={resetCamera}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              title={lang === 'es' ? 'Resetear cámara' : 'Reset camera'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* X-ray layer sliders — only while the mode is live */}
      {xrayMode && !loading && !error && (
        <div className="flex items-center gap-5 flex-wrap bg-[var(--color-surface)] rounded-xl px-4 py-2.5 border border-slate-100 dark:border-transparent">
          {xrayError ? (
            <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="w-3.5 h-3.5" /> {xrayError}
            </span>
          ) : (
            <>
              <label htmlFor="xray-muscle-opacity" className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                {lang === 'es' ? 'Músculos' : 'Muscles'}
                <input
                  id="xray-muscle-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={muscleOpacity}
                  onChange={(e) => setMuscleOpacity(Number(e.target.value))}
                  className="w-28 accent-indigo-600"
                />
                <span className="w-8 text-right tabular-nums text-slate-400">{muscleOpacity}%</span>
              </label>
              <label htmlFor="xray-bone-opacity" className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                {lang === 'es' ? 'Esqueleto' : 'Skeleton'}
                <input
                  id="xray-bone-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={boneOpacity}
                  onChange={(e) => setBoneOpacity(Number(e.target.value))}
                  className="w-28 accent-indigo-600"
                />
                <span className="w-8 text-right tabular-nums text-slate-400">{boneOpacity}%</span>
              </label>
            </>
          )}
        </div>
      )}

      {/* Fit report — solver outcome, one chip per fitted segment */}
      {(fitSegments || fitError) && !loading && !error && (
        <div className="flex items-start gap-2 flex-wrap">
          {fitError ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {lang === 'es' ? 'Error al ajustar: ' : 'Fit failed: '}{fitError}
            </span>
          ) : (
            <>
              <span
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  fitConverged
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
                }`}
              >
                {fitConverged ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {lang === 'es' ? 'Cuerpo ajustado' : 'Body fitted'}
                {fitIterations !== null && (
                  <span className="opacity-70 font-normal">· {fitIterations} {lang === 'es' ? 'iters' : 'iters'}</span>
                )}
              </span>
              {fitSegments?.map(s => {
                const abs = Math.abs(s.delta_cm);
                const tone = abs < 0.5
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : abs < 2
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-300';
                const name = fitSegmentLabel(s.name);
                return (
                  <span key={s.name} className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium ${tone}`} title={`${s.target_cm.toFixed(1)} → ${s.measured_cm.toFixed(1)} cm`}>
                    {name}: {s.delta_cm > 0 ? '+' : ''}{s.delta_cm.toFixed(1)} cm
                  </span>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* 3D mount — the ref container MUST be mounted from the very first render
          (loading included) so the init effect finds containerRef.current and the
          WebGL canvas gets appended into a live, visible element. */}
      <div className="relative">
        <div
          ref={containerRef}
          style={{ width, height }}
          className="rounded-2xl overflow-hidden border border-slate-200 dark:border-transparent"
        />
        {loadingOverlay}
        {errorOverlay}

        {/* Skin tone palette — live material update */}
        {!loading && !error && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-slate-200 dark:border-transparent">
            {SKIN_TONES.map(tone => (
              <button
                key={tone.id}
                onClick={() => applySkinTone(tone.id)}
                className={`w-5 h-5 rounded-full transition-all ${
                  skinToneId === tone.id
                    ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-white dark:ring-offset-[var(--color-surface-elevated)] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: tone.color }}
                title={tone.label[lang]}
                aria-label={tone.label[lang]}
              />
            ))}
          </div>
        )}

        {/* Interaction hints — first 5 seconds, only while the viewer is live */}
        {!loading && !error && showHints && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-slate-200 dark:border-transparent flex items-center gap-4 text-xs text-slate-500 dark:text-[var(--color-text-muted)] pointer-events-none">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Arrastra para girar' : 'Drag to rotate'}
            </span>
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Scroll para zoom' : 'Scroll to zoom'}
            </span>
          </div>
        )}
      </div>

      {/* Model Measurements Panel */}
      {modelMeasurements && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-transparent">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-[var(--color-text)]">
              {lang === 'es' ? 'Medidas del Modelo' : 'Model Measurements'}
            </h3>
            <span className="text-xs text-slate-400 bg-[var(--color-input-bg)] px-2 py-0.5 rounded-lg">
              {profile?.biologicalSex === 'male' ? '♂' : '♀'} {profile?.height}m / {profile?.weight}kg
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {([
              { label: lang === 'es' ? 'Altura' : 'Height', value: modelMeasurements.heightCm, unit: 'cm', key: 'height' },
              { label: lang === 'es' ? 'Pecho' : 'Chest', value: modelMeasurements.chestCm, unit: 'cm', key: 'chest' },
              { label: lang === 'es' ? 'Cintura' : 'Waist', value: modelMeasurements.waistCm, unit: 'cm', key: 'waist' },
              { label: lang === 'es' ? 'Cadera' : 'Hips', value: modelMeasurements.hipCm, unit: 'cm', key: 'hips' },
              { label: lang === 'es' ? 'Peso' : 'Weight', value: modelMeasurements.weightKg, unit: 'kg', key: 'weight' },
            ]).map(item => {
              const userM = measurements.find(m => m.type === item.key);
              const diff = userM ? userM.value - item.value : null;
              return (
                <div key={item.key} className="text-center">
                  <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-[var(--color-text)]">
                    {item.value.toFixed(1)}<span className="text-xs font-normal text-slate-400 dark:text-[var(--color-text-muted)]">{item.unit}</span>
                  </p>
                  {diff !== null && (
                    <p className={`text-xs mt-0.5 ${Math.abs(diff) < 2 ? 'text-emerald-600' : Math.abs(diff) < 5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} {lang === 'es' ? 'vs tuyo' : 'vs you'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
