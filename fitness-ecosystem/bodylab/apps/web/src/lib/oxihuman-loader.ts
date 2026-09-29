/**
 * OxiHuman WASM loader — vendor glue (0.2.1, "BodyLab production" release)
 *
 * History / why this exists:
 *   - The app originally hand-rolled a wasm-bindgen ABI wrapper around the raw
 *     npm `@cooljapan/oxihuman@0.2.0` wasm because vite-plugin-wasm is
 *     incompatible with Vite 8 (Rolldown). That wrapper was fragile and, worse,
 *     the engine it wrapped could not read the OHPK v1 core pack that ships in
 *     this repo (0.2.0 speaks ZIP packs → `RuntimeError: unreachable`).
 *   - The asset pack `public/oxihuman-core-v1.ohpk` is the canonical v0.2.1
 *     release pack (SHA-256 verified against the upstream `assets/packs/`).
 *     OHPK v1 requires the 0.2.1 engine (`OxiHumanEngine.from_core_pack_bytes`).
 *   - 0.2.1 was never published to npm and has no CI artifacts, so the matching
 *     engine build is taken from the vendor's own hosted demo
 *     (cooljapan.tech/bodylab — the release's verified headless-Chrome build)
 *     and vendored verbatim under `public/wasm/`:
 *         oxihuman_wasm.js        web-target glue (imports this file)
 *         oxihuman_wasm_bg.wasm   engine binary
 *         oxihuman_wasm.d.ts      upstream TS types
 *   - The web-target glue self-locates its wasm via
 *     `new URL('oxihuman_wasm_bg.wasm', import.meta.url)` — but only when
 *     `init()` is called without arguments. We always pass the wasm URL, so the
 *     glue never depends on its own import.meta.url.
 *   - Serving both from `public/wasm/` needs no bundler support, and the glue
 *     has zero static imports, so it can be loaded as text and re-imported as a
 *     data-URL module. This keeps the engine 100% outside the Vite/Rolldown
 *     module graph (dev serves public/ raw; production serves it as a static
 *     asset — no WASM plugin, no `?import` transform, no bundler incompatibility).
 *
 * Load order (mirrors the upstream demo app.js boot flow):
 *   1. fetch glue text → import as data-URL module → 2. `init(wasmUrl)`
 *   → 3. `set_panic_hook()` → 4. caller fetches the .ohpk pack and calls
 *      `OxiHumanEngine.from_core_pack_bytes(packBytes)`.
 */

import type { OxiHumanEngine } from './morph-mapper';

/**
 * Constructor shape of the vendor `OxiHumanEngine` class — only what callers
 * of this loader use. Instance methods are typed by `morph-mapper.OxiHumanEngine`
 * (structural), which the vendor class satisfies at runtime.
 */
export interface OxiHumanEngineCtor {
  new (): OxiHumanEngine;
  /** Create an engine pre-loaded with an OHPK v1 core pack (0.2.1+). */
  from_core_pack_bytes(bytes: Uint8Array): OxiHumanEngine;
}

export interface OxiHumanModule {
  OxiHumanEngine: OxiHumanEngineCtor;
  get_version(): string;
  set_panic_hook(): void;
}

/**
 * Public-dir URLs — the browser fetches them verbatim (dev + prod).
 * BASE_URL-aware so the app also works when hosted under a subpath
 * (e.g. GitHub Pages project sites, where base is '/<repo>/').
 */
function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}/${path}`;
}
const VENDOR_GLUE_URL = assetUrl('wasm/oxihuman_wasm.js');
/** URL of the engine binary, passed to init() explicitly. */
const VENDOR_WASM_URL = assetUrl('wasm/oxihuman_wasm_bg.wasm');

/** Runtime shape of the vendor glue module (superset of OxiHumanModule). */
interface VendorGlueModule extends OxiHumanModule {
  /** Web-target wasm-bindgen init — accepts a wasm URL/path explicitly. */
  default?: (initInput?: unknown) => Promise<unknown>;
}

/**
 * Import the vendor glue as a module without the bundler touching it.
 * Vite dev 500s on `import('/public/…js')` (public files are not in the module
 * graph), and the bundler must never see this file in production either. The
 * glue has no static imports, so fetching it as text and re-importing it as a
 * data-URL module is behaviourally identical — except `import.meta.url` is a
 * data: URL, which is why init() must receive the wasm path explicitly.
 */
async function importVendorGlue(): Promise<VendorGlueModule> {
  const resp = await fetch(VENDOR_GLUE_URL);
  if (!resp.ok) throw new Error(`OxiHuman glue fetch failed: ${resp.status} ${resp.statusText}`);
  const source = await resp.text();
  // UTF-8 → binary string → base64 (btoa itself only accepts Latin1)
  const bytes = new TextEncoder().encode(source);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const dataUrl = `data:text/javascript;base64,${btoa(binary)}`;
  return (await import(/* @vite-ignore */ dataUrl)) as unknown as VendorGlueModule;
}

let cachedModule: OxiHumanModule | null = null;

export async function loadOxiHuman(): Promise<OxiHumanModule> {
  if (cachedModule) return cachedModule;

  console.log('[3D] Loading OxiHuman glue (vendor 0.2.1)…');

  const mod = await importVendorGlue();

  // Web-target wasm-bindgen glue: `default` is the async init(). Pass the wasm
  // URL so the glue never falls back to `new URL(…, import.meta.url)` (a data: URL).
  if (typeof mod.default === 'function') {
    await mod.default(VENDOR_WASM_URL);
  }

  // Surface Rust panics on the console instead of silently trapping.
  if (typeof mod.set_panic_hook === 'function') {
    mod.set_panic_hook();
  }

  const version = typeof mod.get_version === 'function' ? mod.get_version() : 'unknown';
  console.log('[3D] OxiHuman engine ready, version:', version);

  cachedModule = {
    OxiHumanEngine: mod.OxiHumanEngine,
    get_version: mod.get_version,
    set_panic_hook: mod.set_panic_hook,
  };
  return cachedModule;
}
