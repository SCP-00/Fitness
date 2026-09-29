/* tslint:disable */
/* eslint-disable */

/**
 * ## Recommended bootstrap: OHPK core pack
 *
 * ```ts
 * const bytes = new Uint8Array(await (await fetch(packUrl)).arrayBuffer());
 * const engine = OxiHumanEngine.from_core_pack_bytes(bytes);
 * engine.set_param("height", 0.7); // pack targets are driven by params
 * ```
 *
 * The pack's `age_floor_years` (if declared) clamps the `age` parameter;
 * read it via `engine.age_floor_years()`.
 *
 * ## Zero-copy per-frame geometry (no per-frame copies into JS)
 *
 * The engine owns persistent, stable-address geometry buffers inside WASM
 * linear memory. After changing params, call `refresh_geometry()` (cheap,
 * incremental, writes in place) and read the buffers through typed-array
 * views:
 *
 * ```ts
 * const memory: WebAssembly.Memory = wasm_memory();
 * let gen = engine.refresh_geometry();
 * let positions = new Float32Array(memory.buffer, engine.positions_ptr(), engine.positions_len());
 * let normals   = new Float32Array(memory.buffer, engine.normals_ptr(),   engine.normals_len());
 * let indices   = new Uint32Array (memory.buffer, engine.indices_ptr(),   engine.indices_len());
 *
 * function frame(t: number) {
 *   engine.set_param("weight", 0.5 + 0.5 * Math.sin(t));
 *   const g = engine.refresh_geometry();
 *   // Re-create views when (a) the mesh generation bumped (topology /
 *   // vertex-count change) or (b) WASM memory grew (buffer identity change
 *   // detaches all existing views).
 *   if (g !== gen || positions.buffer !== memory.buffer) {
 *     gen = g;
 *     positions = new Float32Array(memory.buffer, engine.positions_ptr(), engine.positions_len());
 *     normals   = new Float32Array(memory.buffer, engine.normals_ptr(),   engine.normals_len());
 *     indices   = new Uint32Array (memory.buffer, engine.indices_ptr(),   engine.indices_len());
 *   }
 *   // Upload `positions` / `normals` to WebGL/WebGPU without copying in JS.
 * }
 * ```
 */



/**
 * A single keyframe snapshot as produced by
 * `OxiHumanAnimPlayer.export_anim_json()`.
 *
 * Keys are param names (`"height"`, `"weight"`, `"muscle"`, `"age"`, and any
 * extra morph-target names); values are normalised floats in `[0.0, 1.0]`.
 */
export type OxiHumanAnimFrame = Record<string, number>;



/**
 * Configuration for the OxiHuman offline service worker.
 *
 * Pass to `generateSwJs()` or `generateCacheManifestJson()` to produce the
 * service-worker JavaScript and cache-manifest JSON respectively.
 */
export interface OxiHumanSwConfig {
    /** Name of the Cache Storage bucket, e.g. `"oxihuman-v1"`. */
    cacheName: string;
    /** List of asset URLs to pre-cache on install. */
    assetUrls: string[];
    /** Maximum total cache size in megabytes (soft limit). */
    maxCacheSizeMb: number;
    /**
     * Caching strategy:
     * - `"CacheFirst"` — serve from cache; fall back to network.
     * - `"NetworkFirst"` — try network first; fall back to cache.
     * - `"StaleWhileRevalidate"` — serve from cache immediately, then refresh.
     */
    cacheStrategy: "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate";
}

/**
 * A single entry in the cache manifest produced by
 * `generateCacheManifestJson()`.
 */
export interface OxiHumanCacheEntry {
    /** Full URL of the cached asset. */
    url: string;
    /** SHA-256 hex digest of the asset content at cache time. */
    sha256: string;
    /** Asset size in bytes. */
    sizeBytes: number;
    /** Unix timestamp (seconds) when the entry was last fetched. */
    lastFetchedUnix: number;
    /** Time-to-live in seconds; `0` means no expiry. */
    ttlSecs: number;
}

/**
 * Generate the text of a service-worker JavaScript file from the given
 * configuration.  Write the returned string to `service-worker.js` in your
 * web root.
 *
 * The generated script implements:
 * - An `install` event handler that pre-caches all `assetUrls`.
 * - An `activate` event handler that deletes stale caches.
 * - A `fetch` event handler implementing the chosen `cacheStrategy`.
 */
export function generateSwJs(config: OxiHumanSwConfig): string;

/**
 * Generate a JSON cache-manifest string for the given entries.
 *
 * The manifest can be fetched by the service worker at runtime to verify
 * asset integrity via the embedded `sha256` digests.
 */
export function generateCacheManifestJson(
config: OxiHumanSwConfig,
entries: OxiHumanCacheEntry[],
): string;



/**
 * Parsed representation of the binary mesh buffer returned by
 * `OxiHumanEngine.build_mesh_bytes()`.
 *
 * ## Wire format (OXIM v1 / legacy v1)
 *
 * The raw `Uint8Array` is laid out as follows (all multi-byte integers are
 * **little-endian**):
 *
 * | Offset (bytes) | Type        | Field          |
 * |---------------|-------------|----------------|
 * | 0             | u32         | version        |
 * | 4             | u32         | vertex_count N |
 * | 8             | u32         | index_count  M |
 * | 12            | f32[N × 3]  | positions XYZ  |
 * | 12 + N×12     | f32[N × 3]  | normals XYZ    |
 * | 12 + N×24     | f32[N × 2]  | uvs UV         |
 * | 12 + N×32     | u32[M]      | indices        |
 *
 * ## Parsing example
 * ```typescript
 * function parseMeshBytes(buf: Uint8Array): MeshBytes {
 *   const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
 *   let off = 0;
 *   const version      = view.getUint32(off, true); off += 4;
 *   const vertexCount  = view.getUint32(off, true); off += 4;
 *   const indexCount   = view.getUint32(off, true); off += 4;
 *
 *   const positions = new Float32Array(buf.buffer, buf.byteOffset + off, vertexCount * 3);
 *   off += vertexCount * 3 * 4;
 *   const normals   = new Float32Array(buf.buffer, buf.byteOffset + off, vertexCount * 3);
 *   off += vertexCount * 3 * 4;
 *   const uvs       = new Float32Array(buf.buffer, buf.byteOffset + off, vertexCount * 2);
 *   off += vertexCount * 2 * 4;
 *   const indices   = new Uint32Array(buf.buffer, buf.byteOffset + off, indexCount);
 *
 *   return { version, vertexCount, indexCount, positions, normals, uvs, indices };
 * }
 * ```
 */
export interface MeshBytes {
    /** Format version (currently `1`). */
    version: number;
    /** Number of vertices N. */
    vertexCount: number;
    /** Number of indices M (= triangles × 3). */
    indexCount: number;
    /** Flattened XYZ positions: length = N × 3. */
    positions: Float32Array;
    /** Flattened XYZ normals: length = N × 3. */
    normals: Float32Array;
    /** Flattened UV coordinates: length = N × 2. */
    uvs: Float32Array;
    /** Triangle indices: length = M. */
    indices: Uint32Array;
}



/**
 * Serialised form of the engine's morphing parameter state.
 *
 * All numeric fields are normalised to `[0.0, 1.0]` unless noted otherwise.
 *
 * Produced by `OxiHumanEngine.export_params_json()` and consumed by
 * `OxiHumanEngine.import_params_json()`.
 */
export interface OxiHumanParams {
    /** Body height (0 = minimum, 1 = maximum). */
    height: number;
    /** Body mass / adipose level (0 = lean, 1 = heavy). */
    weight: number;
    /** Muscle definition (0 = no muscle tone, 1 = very muscular). */
    muscle: number;
    /** Apparent age (0 = youth, 1 = elderly). */
    age: number;
    /**
     * Arbitrary extra morph parameters keyed by morph-target name.
     *
     * Each value drives the blend weight for the morph target of the same name,
     * in `[0.0, 1.0]`.
     */
    extra: Record<string, number>;
}



/**
 * Animation recording and playback controller.
 *
 * Obtain one from [`OxiHumanEngine::make_anim_player`].
 *
 * The player holds a shared handle (`Rc`) to the engine state — freeing
 * the engine object from JS does not invalidate the player.
 *
 * # Example (JavaScript)
 * ```js
 * const player = engine.make_anim_player();
 * engine.set_param("height", 0.2); player.record_frame();
 * engine.set_param("height", 0.8); player.record_frame();
 * player.set_fps(30);
 * console.log(player.frame_count()); // 2
 * const json = player.export_anim_json();
 * player.clear();
 * ```
 */
export class OxiHumanAnimPlayer {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Clear all recorded keyframes and reset the playhead.
     */
    clear(): void;
    /**
     * Serialize all keyframes to a JSON array.
     *
     * Each element is an object of `{param_name: value, ...}`.
     */
    export_anim_json(): string;
    /**
     * Return the number of recorded keyframes.
     */
    frame_count(): number;
    /**
     * Return the current playback FPS.
     */
    get_fps(): number;
    /**
     * Snapshot the engine's current params as an animation keyframe.
     */
    record_frame(): void;
    /**
     * Seek the engine to the given frame index.
     *
     * Out-of-range indices are silently ignored.
     */
    seek(frame: number): void;
    /**
     * Set animation playback speed in frames per second.
     */
    set_fps(fps: number): void;
    /**
     * Advance playback by `dt_seconds`.
     *
     * Returns the new frame index.
     */
    step(dt_seconds: number): number;
}

/**
 * The primary OxiHuman engine exposed to JavaScript.
 *
 * Wraps [`WasmEngine`] behind a shared `Rc<RefCell<..>>` handle and
 * exposes morphing, mesh export, animation and measurement APIs through
 * wasm-bindgen.
 *
 * # Usage
 * ```js
 * const engine = new OxiHumanEngine();
 * engine.set_param("height", 0.8);
 * const bytes = engine.build_mesh_bytes();
 * ```
 *
 * # Loading the core pack (recommended)
 * ```js
 * const bytes = new Uint8Array(await (await fetch(packUrl)).arrayBuffer());
 * const engine = OxiHumanEngine.from_core_pack_bytes(bytes);
 * ```
 */
export class OxiHumanEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The minimum modelled age in years declared by the loaded core
     * pack, or `undefined` when no floor applies.
     *
     * When set, `set_param("age", v)` clamps so the modelled age never
     * goes below the floor, and `get_param("age")` reflects the clamped
     * value.
     */
    age_floor_years(): number | undefined;
    /**
     * Return the number of recorded animation keyframes.
     */
    anim_frame_count(): number;
    /**
     * Blend two expression presets by weight `t` (0 = a, 1 = b).
     *
     * Returns `true` if both preset names are recognised.
     */
    apply_expression_blend(expr_a: string, expr_b: string, t: number): boolean;
    /**
     * Apply a named body preset (e.g. `"athletic"`, `"average"`, `"slender"`).
     *
     * Returns `true` if the preset was recognised and applied.
     */
    apply_preset(name: string): boolean;
    /**
     * Build the morphed mesh and return it as raw binary bytes.
     *
     * Uses the engine's incremental build path internally.
     *
     * Binary format — see [`crate::BUFFER_FORMAT_VERSION`] and `MeshBytes`:
     * - Bytes 0–3:   `version` (u32 LE, currently `1`)
     * - Bytes 4–7:   `vertex_count` N (u32 LE)
     * - Bytes 8–11:  `index_count`  M (u32 LE)
     * - Bytes 12..:  positions  f32\[N\*3\]
     * - Then:        normals    f32\[N\*3\]
     * - Then:        uvs        f32\[N\*2\]
     * - Then:        indices    u32\[M\]
     */
    build_mesh_bytes(): Uint8Array;
    /**
     * Clear all recorded animation keyframes.
     */
    clear_anim_frames(): void;
    /**
     * Create a particle emitter with the given emit rate and particle lifetime.
     */
    create_particle_system(emit_rate: number, lifetime: number): boolean;
    /**
     * Export all animation keyframes as a JSON array.
     */
    export_anim_json(): string;
    /**
     * Export the current morphed mesh as a binary GLB (glTF 2.0) byte buffer.
     *
     * Built entirely in memory via `oxihuman_export::glb::build_glb_bytes`
     * — never touches the filesystem (which does not exist on wasm32 and
     * used to *panic*, poisoning the engine object; see module docs).
     *
     * Throws a JavaScript `Error` if GLB serialization fails.
     */
    export_glb(): Uint8Array;
    /**
     * Export the current morphed mesh as a Wavefront OBJ string.
     *
     * Throws a JavaScript `Error` if serialization fails (previously
     * failures were silently swallowed into an empty string).
     */
    export_obj(): string;
    /**
     * Export current params as a JSON string.
     */
    export_params_json(): string;
    /**
     * Return quantized mesh bytes (QMSH format).
     */
    export_quantized_bytes(): Uint8Array;
    /**
     * Export the current morphed mesh as STL bytes.
     *
     * `binary = true` → binary STL; `binary = false` → ASCII STL text
     * (as UTF-8 bytes). Both are built entirely in memory and pass the
     * bodysuit export gate.
     */
    export_stl(binary: boolean): Uint8Array;
    /**
     * Export the current morphed mesh as a VRM 1.0 avatar (`.vrm` bytes,
     * a GLB container with the `VRMC_vrm` extension).
     *
     * Uses sensible defaults: name `"OxiHuman Avatar"`, CC-BY-4.0
     * licence metadata, and a minimal 17-bone required-humanoid
     * skeleton. Use [`Self::export_vrm_with_options`] to override the
     * metadata.
     */
    export_vrm(): Uint8Array;
    /**
     * Export as VRM 1.0 with metadata overrides from a JSON object.
     *
     * Recognised keys (all optional):
     * `{"name": string, "version": string, "authors": string[],
     *   "license_url": string,
     *   "commercial_usage": "personalNonProfit"|"personalProfit"|"corporation",
     *   "credit_notation": "required"|"unnecessary",
     *   "modification": "prohibited"|"allowModification"|"allowModificationRedistribution"}`
     *
     * Throws a JavaScript `Error` on malformed JSON or export failure.
     */
    export_vrm_with_options(options_json: string): Uint8Array;
    /**
     * Fit the engine's macro parameters so the re-measured mesh matches a
     * set of target measurements, then return a JSON fit report.
     *
     * Input JSON accepts any subset of
     * `{"height_cm":…, "chest_cm":…, "waist_cm":…, "hip_cm":…}` (plus an
     * optional `{"max_iterations":n}`). The fit runs Nelder–Mead directly
     * over the engine parameters (`height`, `weight`, `muscle`, `gender`),
     * re-measuring the morphed mesh at every step, and leaves the engine
     * set to the fitted parameters.
     *
     * Output JSON:
     * ```json
     * {"params":{"height":0.55,"weight":0.5,"muscle":0.5,"gender":0.5,"age":0.5},
     *  "results":[{"name":"height","target_cm":172.0,"measured_cm":171.8,"delta_cm":-0.2}],
     *  "iterations":47,"converged":true}
     * ```
     *
     * Each `delta_cm` is `measured_cm − target_cm` from a final precise
     * re-measurement of the fitted geometry — never an echo of the input.
     *
     * Throws a JavaScript `Error` on malformed JSON or when no valid
     * target is supplied.
     */
    fit_to_measurements(options_json: string): string;
    /**
     * Create an engine pre-loaded with an OHPK v1 core pack.
     *
     * The pack's base mesh replaces the stub mesh, every pack target is
     * loaded into the engine target store (driven by
     * `set_param("height"|"weight"|"muscle"|"age", v)` according to its
     * category), and `manifest.age_floor_years` is enforced on the `age`
     * parameter.
     *
     * ```js
     * const bytes = new Uint8Array(await (await fetch(packUrl)).arrayBuffer());
     * const engine = OxiHumanEngine.from_core_pack_bytes(bytes);
     * ```
     *
     * Throws a JavaScript `Error` if the pack is malformed.
     */
    static from_core_pack_bytes(bytes: Uint8Array): OxiHumanEngine;
    /**
     * Create an engine pre-loaded with the given OBJ file bytes.
     *
     * `bytes` must be valid UTF-8 OBJ data.
     *
     * Throws a JavaScript `Error` if parsing fails.
     */
    static from_obj_bytes(bytes: Uint8Array): OxiHumanEngine;
    /**
     * Return the current animation playback speed in FPS.
     */
    get_anim_fps(): number;
    /**
     * Return body proportion ratios as a JSON object.
     */
    get_body_proportions_json(): string;
    /**
     * Return capsule chains as a JSON string.
     */
    get_capsule_chains_json(): string;
    /**
     * Return current cloth simulation state as JSON.
     */
    get_cloth_state(): string;
    /**
     * Return per-vertex curvature as a JSON array of floats.
     */
    get_curvature_map(): string;
    /**
     * Return geodesic distances from `source_vertex` as a JSON array.
     */
    get_geodesic_distances(source_vertex: number): string;
    /**
     * Return a JSON array of the names of all JSON-loaded morph targets.
     */
    get_loaded_target_names(): string;
    /**
     * Return an LOD-reduced scene JSON.
     *
     * `lod_level`: `0` = full, `1` = half, `2` = quarter.
     */
    get_lod_scene_json(lod_level: number): string;
    /**
     * Return measurements for the current morphed body.
     *
     * All linear values are in **centimetres** and come from the precise
     * cross-section measurer (chest / waist / hip are tape circumferences,
     * height is stature); `weight_kg` is a mesh-volume mass. Consistent
     * with `get_measurements_json()`.
     *
     * Returns an [`OxiHumanMeasurements`] object.
     */
    get_measurements(): OxiHumanMeasurements;
    /**
     * Return measurements as a JSON string (all linear values in
     * centimetres; includes a `"units":"cm"` field).
     */
    get_measurements_json(): string;
    /**
     * Return mesh connectivity segments as a JSON object.
     *
     * `mode`: `"connected"` or `"normals"`.
     */
    get_mesh_segments(mode: string): string;
    /**
     * Get a named morphing parameter value.
     *
     * Returns `NaN` if the parameter name is not recognised.
     */
    get_param(name: string): number;
    /**
     * Return a compact JSON summary of current params.
     */
    get_param_summary_json(): string;
    /**
     * Return physics collision proxies as a JSON string.
     */
    get_physics_proxies_json(): string;
    /**
     * Return physics proxy data as JSON.
     */
    get_physics_proxy_json(): string;
    /**
     * Return physics rig as a JSON string.
     */
    get_physics_rig_json(): string;
    /**
     * Return the full scene as a JSON string (params + rig + vertex count).
     */
    get_scene_json(): string;
    /**
     * Get the blend weight of a JSON-loaded morph target.
     *
     * Returns `-1.0` if the target is not found.
     */
    get_target_weight(name: string): number;
    /**
     * Import params from a JSON string previously produced by
     * `export_params_json`.
     *
     * Throws a JavaScript `Error` if the JSON is malformed.
     */
    import_params_json(json: string): void;
    /**
     * Number of `u32` elements in the index buffer.
     */
    indices_len(): number;
    /**
     * Byte offset of the `u32` triangle index buffer inside WASM linear memory.
     */
    indices_ptr(): number;
    /**
     * Initialise a cloth simulation from the most recently built mesh.
     *
     * Does nothing when no mesh has been built yet.
     * `stiffness` is forwarded to all cloth springs; 0.0 = limp, 1.0 = rigid.
     */
    init_cloth(stiffness: number): void;
    /**
     * Return a list of built-in shader names as a JSON array.
     */
    list_builtin_shaders(): string;
    /**
     * Return a JSON array of the names of all engine-loaded morph targets.
     */
    list_loaded_targets(): string;
    /**
     * Load an OHPK v1 core pack into this engine, replacing the base
     * mesh and the whole morph-target store (see
     * [`Self::from_core_pack_bytes`]).
     *
     * Returns the number of morph targets loaded.
     * Throws a JavaScript `Error` if the pack is malformed.
     */
    load_core_pack_bytes(bytes: Uint8Array): number;
    /**
     * Load a morph target from raw `.target` file bytes.
     *
     * `name` is used to infer the morph category and auto-assign a weight
     * function.  Throws a JavaScript `Error` if parsing fails.
     */
    load_target_bytes(name: string, bytes: Uint8Array): void;
    /**
     * Load a morph target from a JSON descriptor.
     *
     * Expected format: `{"deltas":[[vid,dx,dy,dz],...]}`
     *
     * The target is applied by every mesh build once its weight is set
     * via `set_target_weight`.
     *
     * Returns `true` on success, `false` on parse error.
     */
    load_target_from_json(name: string, json: string): boolean;
    /**
     * Load a ZIP asset pack from raw bytes.
     *
     * The ZIP must contain one `.obj` file (base mesh) and any number of
     * `.target` files (morph targets). Prefer OHPK core packs
     * ([`Self::load_core_pack_bytes`]) for production.
     *
     * Returns the number of morph targets loaded.
     * Throws a JavaScript `Error` if the ZIP is malformed or contains no `.obj`.
     */
    load_zip_pack_bytes(bytes: Uint8Array): number;
    /**
     * Return the number of JSON-loaded morph targets.
     */
    loaded_target_count(): number;
    /**
     * Create an [`OxiHumanAnimPlayer`] sharing this engine's state.
     *
     * The player holds a shared handle (`Rc`) to the engine state, so it
     * remains valid even if this `OxiHumanEngine` object is freed from
     * JS — no dangling pointers.
     */
    make_anim_player(): OxiHumanAnimPlayer;
    /**
     * Current mesh generation. Bumps whenever the persistent geometry
     * buffers were (re)allocated (topology / vertex-count change) — JS
     * must re-create its typed-array views then. Also re-create views
     * after WebAssembly memory growth.
     */
    mesh_generation(): number;
    /**
     * Create a new engine with a minimal stub mesh.
     *
     * The stub mesh has 3 vertices (one degenerate triangle).  Call
     * `from_core_pack_bytes`, `from_obj_bytes` or `load_zip_pack_bytes`
     * to replace it with a real base mesh.
     */
    constructor();
    /**
     * Number of `f32` elements in the normals buffer (`3 * n_verts`).
     */
    normals_len(): number;
    /**
     * Byte offset of the flat `f32` normals buffer inside WASM linear memory.
     */
    normals_ptr(): number;
    /**
     * Advance animation by `dt_seconds` and return the new frame index.
     */
    play_anim_step(dt_seconds: number): number;
    /**
     * Number of `f32` elements in the positions buffer (`3 * n_verts`).
     */
    positions_len(): number;
    /**
     * Byte offset of the flat `f32` positions buffer (`3 * n_verts`
     * elements) inside WASM linear memory. Lazily refreshes the
     * geometry when dirty.
     *
     * ```js
     * const gen = engine.refresh_geometry();
     * let view = new Float32Array(memory.buffer, engine.positions_ptr(), engine.positions_len());
     * // Re-create `view` whenever engine.mesh_generation() != gen or
     * // memory.buffer changed identity (wasm memory growth detaches views).
     * ```
     */
    positions_ptr(): number;
    /**
     * Return vertex indices within `radius` of the given point as a JSON array.
     */
    query_sphere_near_point(x: number, y: number, z: number, radius: number): string;
    /**
     * Snapshot the current params as an animation keyframe.
     */
    record_anim_frame(): void;
    /**
     * Recompute the persistent geometry buffers (incremental path,
     * in-place) and return the current mesh generation.
     *
     * Call after `set_param(...)`; then read the buffers through the
     * `positions_ptr()` / `positions_len()` (etc.) views. No-op when
     * nothing changed.
     */
    refresh_geometry(): number;
    /**
     * Reset all parameters to their default mid-point values and
     * invalidate the mesh cache.
     */
    reset_params(): void;
    /**
     * Seek to a specific animation frame, restoring its params snapshot.
     */
    seek_anim_frame(frame: number): void;
    /**
     * Set animation playback speed in frames per second.
     */
    set_anim_fps(fps: number): void;
    /**
     * Set a named morphing parameter.
     *
     * Well-known names: `"height"`, `"weight"`, `"muscle"`, `"age"`.
     * Any other name is stored as an extra parameter and may drive a
     * matching morph target by name.
     *
     * Values are typically in `[0.0, 1.0]`. The `age` parameter is
     * clamped to the core pack's age floor when one is declared.
     */
    set_param(name: string, value: number): void;
    /**
     * Set the blend weight for a JSON-loaded morph target.
     *
     * Returns `true` if the target was found.
     */
    set_target_weight(name: string, weight: number): boolean;
    /**
     * Set the wind vector for physics simulation.
     */
    set_wind(x: number, y: number, z: number): void;
    /**
     * Advance the particle simulation by `dt` seconds.
     *
     * Returns JSON: `{"active": N, "positions": [[x,y,z], ...]}`.
     */
    step_particles(dt: number): string;
    /**
     * Step physics simulation by `dt` seconds.
     */
    step_physics(dt: number): void;
    /**
     * Return the number of engine-loaded morph targets.
     */
    target_count(): number;
    /**
     * Unload a previously JSON-loaded target by name.
     *
     * Returns `true` if the target existed.
     */
    unload_target(name: string): boolean;
    /**
     * Number of `f32` elements in the UV buffer (`2 * n_verts`).
     */
    uvs_len(): number;
    /**
     * Byte offset of the flat `f32` UV buffer inside WASM linear memory.
     */
    uvs_ptr(): number;
    /**
     * Number of vertices in the base mesh.
     */
    vertex_count(): number;
}

/**
 * Body measurements derived from the morphed mesh.
 *
 * All linear measurements are in centimetres; `weight_kg` is kilograms.
 *
 * Obtained via [`OxiHumanEngine::get_measurements`].
 */
export class OxiHumanMeasurements {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Chest circumference estimate in centimetres.
     */
    chest_cm(): number;
    /**
     * Standing height in centimetres.
     */
    height_cm(): number;
    /**
     * Hip circumference estimate in centimetres.
     */
    hip_cm(): number;
    /**
     * Waist circumference estimate in centimetres.
     */
    waist_cm(): number;
    /**
     * Estimated body mass in kilograms (body mesh volume × human mean
     * density).
     */
    weight_kg(): number;
}

/**
 * A morph slider binding for use in slider-based UIs.
 *
 * Obtain a slider from a param name via
 * [`OxiHumanMorphSlider::for_param`]. The slider holds a shared handle
 * (`Rc`) to the engine state — freeing the engine object from JS does
 * not invalidate the slider (no use-after-free is possible).
 *
 * # Example (JavaScript)
 * ```js
 * const slider = OxiHumanMorphSlider.for_param(engine, "height");
 * console.log(slider.name(), slider.min(), slider.max(), slider.value());
 * slider.set_value(0.8);
 * ```
 */
export class OxiHumanMorphSlider {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create a slider bound to `param_name` on `engine`.
     *
     * Well-known params (`height`, `weight`, `muscle`, `age`) have min=0,
     * max=1.  Unknown extra params default to min=0, max=1.
     */
    static for_param(engine: OxiHumanEngine, param_name: string): OxiHumanMorphSlider;
    /**
     * Return the maximum allowed value (always `1.0` for standard params).
     */
    max(): number;
    /**
     * Return the minimum allowed value (always `0.0` for standard params).
     */
    min(): number;
    /**
     * Return the parameter name this slider is bound to.
     */
    name(): string;
    /**
     * Set a new slider value and propagate it to the engine.
     *
     * Values outside `[min, max]` are clamped.
     */
    set_value(v: number): void;
    /**
     * Return the current slider value (read live from the engine).
     *
     * Returns `NaN` when the param is unknown.
     */
    value(): number;
}

/**
 * Generate a cache-manifest JSON string.
 *
 * `config_json` must match `OxiHumanSwConfig`; `entries_json` must be a
 * JSON array of `OxiHumanCacheEntry` objects.
 *
 * Throws a JavaScript `Error` if either argument is malformed.
 */
export function generateCacheManifestJson(config_json: string, entries_json: string): string;

/**
 * Generate service-worker JavaScript from a JSON configuration object.
 *
 * `config_json` must be a JSON string matching the `OxiHumanSwConfig`
 * TypeScript interface defined in this module.
 *
 * Returns the service-worker JavaScript as a string, ready to be written
 * to `service-worker.js` in your web root.
 *
 * Throws a JavaScript `Error` if `config_json` is malformed.
 */
export function generateSwJs(config_json: string): string;

/**
 * Return the crate version string (e.g. `"0.2.1"`).
 */
export function get_version(): string;

/**
 * Install `console.error` as the Rust panic hook.
 *
 * Call this once at startup before any other API call so that Rust panics
 * appear in the browser developer console rather than as cryptic
 * `unreachable` WebAssembly traps.
 */
export function set_panic_hook(): void;

/**
 * Return the module's `WebAssembly.Memory` object.
 *
 * Needed for the zero-copy geometry views
 * (`new Float32Array(wasm_memory().buffer, engine.positions_ptr(), engine.positions_len())`)
 * on targets whose JS glue does not re-export the memory (e.g.
 * `--target nodejs`). Re-create views whenever `memory.buffer` changes
 * identity (WebAssembly memory growth detaches old views) or
 * `engine.mesh_generation()` bumps.
 */
export function wasm_memory(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_oxihumananimplayer_free: (a: number, b: number) => void;
    readonly __wbg_oxihumanengine_free: (a: number, b: number) => void;
    readonly __wbg_oxihumanmeasurements_free: (a: number, b: number) => void;
    readonly __wbg_oxihumanmorphslider_free: (a: number, b: number) => void;
    readonly get_version: () => [number, number];
    readonly oxihumananimplayer_clear: (a: number) => [number, number];
    readonly oxihumananimplayer_export_anim_json: (a: number) => [number, number, number, number];
    readonly oxihumananimplayer_frame_count: (a: number) => [number, number, number];
    readonly oxihumananimplayer_get_fps: (a: number) => [number, number, number];
    readonly oxihumananimplayer_record_frame: (a: number) => [number, number];
    readonly oxihumananimplayer_seek: (a: number, b: number) => [number, number];
    readonly oxihumananimplayer_set_fps: (a: number, b: number) => [number, number];
    readonly oxihumananimplayer_step: (a: number, b: number) => [number, number, number];
    readonly oxihumanengine_age_floor_years: (a: number) => [number, number, number];
    readonly oxihumanengine_anim_frame_count: (a: number) => [number, number, number];
    readonly oxihumanengine_apply_expression_blend: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly oxihumanengine_apply_preset: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_build_mesh_bytes: (a: number) => [number, number, number, number];
    readonly oxihumanengine_clear_anim_frames: (a: number) => [number, number];
    readonly oxihumanengine_create_particle_system: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_export_anim_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_glb: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_obj: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_params_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_quantized_bytes: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_stl: (a: number, b: number) => [number, number, number, number];
    readonly oxihumanengine_export_vrm: (a: number) => [number, number, number, number];
    readonly oxihumanengine_export_vrm_with_options: (a: number, b: number, c: number) => [number, number, number, number];
    readonly oxihumanengine_fit_to_measurements: (a: number, b: number, c: number) => [number, number, number, number];
    readonly oxihumanengine_from_core_pack_bytes: (a: number, b: number) => [number, number, number];
    readonly oxihumanengine_from_obj_bytes: (a: number, b: number) => [number, number, number];
    readonly oxihumanengine_get_anim_fps: (a: number) => [number, number, number];
    readonly oxihumanengine_get_body_proportions_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_capsule_chains_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_cloth_state: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_curvature_map: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_geodesic_distances: (a: number, b: number) => [number, number, number, number];
    readonly oxihumanengine_get_loaded_target_names: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_lod_scene_json: (a: number, b: number) => [number, number, number, number];
    readonly oxihumanengine_get_measurements: (a: number) => [number, number, number];
    readonly oxihumanengine_get_measurements_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_mesh_segments: (a: number, b: number, c: number) => [number, number, number, number];
    readonly oxihumanengine_get_param: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_get_param_summary_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_physics_proxies_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_physics_proxy_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_physics_rig_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_scene_json: (a: number) => [number, number, number, number];
    readonly oxihumanengine_get_target_weight: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_import_params_json: (a: number, b: number, c: number) => [number, number];
    readonly oxihumanengine_indices_len: (a: number) => [number, number, number];
    readonly oxihumanengine_indices_ptr: (a: number) => [number, number, number];
    readonly oxihumanengine_init_cloth: (a: number, b: number) => [number, number];
    readonly oxihumanengine_list_builtin_shaders: (a: number) => [number, number, number, number];
    readonly oxihumanengine_list_loaded_targets: (a: number) => [number, number, number, number];
    readonly oxihumanengine_load_core_pack_bytes: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_load_target_bytes: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly oxihumanengine_load_target_from_json: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly oxihumanengine_load_zip_pack_bytes: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_loaded_target_count: (a: number) => [number, number, number];
    readonly oxihumanengine_make_anim_player: (a: number) => number;
    readonly oxihumanengine_mesh_generation: (a: number) => [number, number, number];
    readonly oxihumanengine_new: () => number;
    readonly oxihumanengine_normals_len: (a: number) => [number, number, number];
    readonly oxihumanengine_normals_ptr: (a: number) => [number, number, number];
    readonly oxihumanengine_play_anim_step: (a: number, b: number) => [number, number, number];
    readonly oxihumanengine_positions_len: (a: number) => [number, number, number];
    readonly oxihumanengine_positions_ptr: (a: number) => [number, number, number];
    readonly oxihumanengine_query_sphere_near_point: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly oxihumanengine_record_anim_frame: (a: number) => [number, number];
    readonly oxihumanengine_refresh_geometry: (a: number) => [number, number, number];
    readonly oxihumanengine_reset_params: (a: number) => [number, number];
    readonly oxihumanengine_seek_anim_frame: (a: number, b: number) => [number, number];
    readonly oxihumanengine_set_anim_fps: (a: number, b: number) => [number, number];
    readonly oxihumanengine_set_param: (a: number, b: number, c: number, d: number) => [number, number];
    readonly oxihumanengine_set_target_weight: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly oxihumanengine_set_wind: (a: number, b: number, c: number, d: number) => [number, number];
    readonly oxihumanengine_step_particles: (a: number, b: number) => [number, number, number, number];
    readonly oxihumanengine_step_physics: (a: number, b: number) => [number, number];
    readonly oxihumanengine_target_count: (a: number) => [number, number, number];
    readonly oxihumanengine_unload_target: (a: number, b: number, c: number) => [number, number, number];
    readonly oxihumanengine_uvs_len: (a: number) => [number, number, number];
    readonly oxihumanengine_uvs_ptr: (a: number) => [number, number, number];
    readonly oxihumanengine_vertex_count: (a: number) => [number, number, number];
    readonly oxihumanmeasurements_chest_cm: (a: number) => number;
    readonly oxihumanmeasurements_height_cm: (a: number) => number;
    readonly oxihumanmeasurements_hip_cm: (a: number) => number;
    readonly oxihumanmeasurements_waist_cm: (a: number) => number;
    readonly oxihumanmeasurements_weight_kg: (a: number) => number;
    readonly oxihumanmorphslider_for_param: (a: number, b: number, c: number) => number;
    readonly oxihumanmorphslider_name: (a: number) => [number, number];
    readonly oxihumanmorphslider_set_value: (a: number, b: number) => [number, number];
    readonly oxihumanmorphslider_value: (a: number) => number;
    readonly set_panic_hook: () => void;
    readonly oxihumanmorphslider_max: (a: number) => number;
    readonly oxihumanmorphslider_min: (a: number) => number;
    readonly wasm_memory: () => any;
    readonly generateCacheManifestJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly generateSwJs: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
