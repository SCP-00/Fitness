/**
 * Body Viewer 3D
 *
 * Wraps OxiHuman + Three.js for 3D body visualization.
 * Provides a clean interface for BodyLab's 3D view.
 *
 * NOTE: This component requires a browser environment with WebGL support.
 * It cannot be used in Node.js/test environments directly.
 *
 * @module integrations/oxihuman/body-viewer-3d
 */

import type { BodyParameters, ExportFormat } from './adapter';
import { bodyParamsToOxiParams, getExportExtension, getExportMimeType } from './adapter';

/**
 * 3D viewer configuration
 */
export interface BodyViewer3DConfig {
  /** Container element ID or reference */
  containerId: string;
  /** Initial body parameters */
  initialParams?: BodyParameters;
  /** Enable orbit controls */
  orbitControls?: boolean;
  /** Enable grid */
  showGrid?: boolean;
  /** Background color */
  backgroundColor?: number;
  /** Camera position */
  cameraPosition?: { x: number; y: number; z: number };
}

/**
 * 3D viewer state
 */
export interface BodyViewer3DState {
  /** Current body parameters */
  parameters: BodyParameters;
  /** Whether the model is loaded */
  isLoaded: boolean;
  /** Current camera position */
  cameraPosition: { x: number; y: number; z: number };
  /** Whether controls are enabled */
  controlsEnabled: boolean;
}

/**
 * Callback for parameter changes
 */
export type ParameterChangeCallback = (params: BodyParameters) => void;

/**
 * Callback for model load
 */
export type ModelLoadCallback = () => void;

/**
 * Body Viewer 3D class
 *
 * Wraps OxiHuman engine + Three.js renderer for 3D body visualization.
 *
 * @example
 * ```typescript
 * const viewer = new BodyViewer3D({
 *   containerId: 'body-3d',
 *   initialParams: { height: 1.75, weight: 75 },
 *   orbitControls: true,
 * });
 *
 * await viewer.initialize();
 *
 * // Update parameters
 * viewer.setParameters({ height: 1.80, weight: 80 });
 *
 * // Export as GLB
 * const glb = await viewer.export('glb');
 * ```
 */
export class BodyViewer3D {
  private config: BodyViewer3DConfig;
  private state: BodyViewer3DState;
  private engine: unknown; // OxiHumanEngine instance
  private scene: unknown; // Three.js Scene
  private camera: unknown; // Three.js Camera
  private renderer: unknown; // Three.js Renderer
  private controls: unknown; // OrbitControls
  private mesh: unknown; // Three.js Mesh
  private parameterCallbacks: ParameterChangeCallback[] = [];
  private loadCallbacks: ModelLoadCallback[] = [];

  constructor(config: BodyViewer3DConfig) {
    this.config = {
      orbitControls: true,
      showGrid: true,
      backgroundColor: 0xf0f0f0,
      cameraPosition: { x: 0, y: 1, z: 3 },
      ...config,
    };

    this.state = {
      parameters: config.initialParams ?? { height: 1.75, weight: 75 },
      isLoaded: false,
      cameraPosition: this.config.cameraPosition!,
      controlsEnabled: this.config.orbitControls!,
    };
  }

  /**
   * Initialize the viewer (call after DOM is ready)
   *
   * NOTE: This method requires browser environment with WebGL.
   * In test environment, it will be mocked.
   */
  async initialize(): Promise<void> {
    if (typeof document === 'undefined') {
      throw new Error('BodyViewer3D requires browser environment');
    }

    const container = document.getElementById(this.config.containerId);
    if (!container) {
      throw new Error(`Container not found: ${this.config.containerId}`);
    }

    // Dynamic imports for Three.js and OxiHuman
    const THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const init = (await import('oxihuman-wasm')).default;
    const { OxiHumanEngine, wasm_memory } = await import('oxihuman-wasm');

    // Initialize OxiHuman WASM
    await init();

    // Load asset pack
    const packResponse = await fetch('./packs/oxihuman-core-v1.ohpk');
    const packBuffer = new Uint8Array(await packResponse.arrayBuffer());
    const engine = OxiHumanEngine.from_core_pack_bytes(packBuffer);

    this.engine = engine;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.config.backgroundColor);
    this.scene = scene;

    // Set up camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(
      this.config.cameraPosition!.x,
      this.config.cameraPosition!.y,
      this.config.cameraPosition!.z
    );
    this.camera = camera;

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Set up orbit controls
    if (this.config.orbitControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 1, 0);
      this.controls = controls;
    }

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Set up grid
    if (this.config.showGrid) {
      const grid = new THREE.GridHelper(10, 20);
      scene.add(grid);
    }

    // Generate initial mesh
    await this.updateMesh();

    // Start render loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    this.state.isLoaded = true;
    this.loadCallbacks.forEach((cb) => cb());
  }

  /**
   * Update the mesh with current parameters
   */
  private async updateMesh(): Promise<void> {
    const engine = this.engine as {
      set_param: (name: string, value: number) => void;
      refresh_geometry: () => void;
      positions_ptr: () => number;
      positions_len: () => number;
    };

    if (!engine) return;

    // Convert BodyLab params to OxiHuman params
    const oxiParams = bodyParamsToOxiParams(this.state.parameters);

    // Set parameters on engine
    for (const [name, value] of Object.entries(oxiParams)) {
      engine.set_param(name, value);
    }

    // Refresh geometry
    engine.refresh_geometry();

    // Get geometry from WASM memory
    const wasm_memory_fn = (await import('oxihuman-wasm')).wasm_memory;
    const memory = wasm_memory_fn();
    const positions = new Float32Array(
      memory.buffer,
      engine.positions_ptr(),
      engine.positions_len()
    );

    // Create Three.js geometry
    const THREE = await import('three');
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create or update mesh
    if (this.mesh) {
      const oldMesh = this.mesh as { geometry: THREE.BufferGeometry };
      oldMesh.geometry.dispose();
      oldMesh.geometry = geometry;
    } else {
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.7,
        metalness: 0.1,
      });
      this.mesh = new THREE.Mesh(geometry, material);
      (this.scene as THREE.Scene).add(this.mesh as THREE.Mesh);
    }
  }

  /**
   * Animation loop
   */
  private animate(): void {
    const renderer = this.renderer as { render: (scene: unknown, camera: unknown) => void };
    const scene = this.scene;
    const camera = this.camera;

    const controls = this.controls as { update: () => void } | undefined;

    const loop = () => {
      requestAnimationFrame(loop);
      controls?.update();
      renderer.render(scene, camera);
    };

    loop();
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const container = document.getElementById(this.config.containerId);
    if (!container) return;

    const camera = this.camera as {
      aspect: number;
      updateProjectionMatrix: () => void;
    };
    const renderer = this.renderer as {
      setSize: (width: number, height: number) => void;
    };

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /**
   * Set body parameters and update mesh
   *
   * @param params - New body parameters
   */
  async setParameters(params: Partial<BodyParameters>): Promise<void> {
    this.state.parameters = { ...this.state.parameters, ...params };
    await this.updateMesh();
    this.parameterCallbacks.forEach((cb) => cb(this.state.parameters));
  }

  /**
   * Get current body parameters
   */
  getParameters(): BodyParameters {
    return { ...this.state.parameters };
  }

  /**
   * Get current state
   */
  getState(): BodyViewer3DState {
    return { ...this.state };
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    const camera = this.camera as { position: { set: (x: number, y: number, z: number) => void } };
    camera.position.set(
      this.config.cameraPosition!.x,
      this.config.cameraPosition!.y,
      this.config.cameraPosition!.z
    );

    const controls = this.controls as { target: { set: (x: number, y: number, z: number) => void } };
    controls?.target.set(0, 1, 0);
  }

  /**
   * Reset parameters to defaults
   */
  resetParameters(): void {
    this.state.parameters = this.config.initialParams ?? { height: 1.75, weight: 75 };
    this.updateMesh();
  }

  /**
   * Enable/disable orbit controls
   */
  setControlsEnabled(enabled: boolean): void {
    this.state.controlsEnabled = enabled;
    const controls = this.controls as { enabled: boolean };
    if (controls) {
      controls.enabled = enabled;
    }
  }

  /**
   * Export mesh in specified format
   *
   * @param format - Export format (glb, vrm, stl, obj)
   * @returns Exported data as Uint8Array or string
   */
  async export(format: ExportFormat): Promise<Uint8Array | string> {
    const engine = this.engine as {
      export_glb: () => Uint8Array;
      export_vrm: () => Uint8Array;
      export_stl: (binary: boolean) => Uint8Array;
      export_obj: () => string;
    };

    if (!engine) {
      throw new Error('Engine not initialized');
    }

    switch (format) {
      case 'glb':
        return engine.export_glb();
      case 'vrm':
        return engine.export_vrm();
      case 'stl':
        return engine.export_stl(true);
      case 'obj':
        return engine.export_obj();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Download mesh in specified format
   *
   * @param format - Export format
   * @param filename - Download filename (without extension)
   */
  async download(format: ExportFormat, filename: string): Promise<void> {
    const data = await this.export(format);
    const extension = getExportExtension(format);
    const mimeType = getExportMimeType(format);

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${extension}`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Register callback for parameter changes
   */
  onParameterChange(callback: ParameterChangeCallback): void {
    this.parameterCallbacks.push(callback);
  }

  /**
   * Register callback for model load
   */
  onModelLoad(callback: ModelLoadCallback): void {
    this.loadCallbacks.push(callback);
  }

  /**
   * Set camera position
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.state.cameraPosition = { x, y, z };
    const camera = this.camera as { position: { set: (x: number, y: number, z: number) => void } };
    camera.position.set(x, y, z);
  }

  /**
   * Set camera target
   */
  setCameraTarget(x: number, y: number, z: number): void {
    const controls = this.controls as { target: { set: (x: number, y: number, z: number) => void } };
    controls?.target.set(x, y, z);
  }

  /**
   * Take screenshot
   */
  screenshot(): string {
    const renderer = this.renderer as { domElement: HTMLCanvasElement };
    return renderer.domElement.toDataURL('image/png');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Dispose Three.js resources
    if (this.mesh) {
      const mesh = this.mesh as { geometry: { dispose: () => void }; material: { dispose: () => void } };
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    const renderer = this.renderer as { dispose: () => void; domElement: HTMLCanvasElement };
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    this.parameterCallbacks = [];
    this.loadCallbacks = [];
  }
}
