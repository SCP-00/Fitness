import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// BodyLab's version has ONE home: `bodylab/apps/desktop/package.json`, the
// package that actually ships (it must match `src-tauri/tauri.conf.json` for
// Tauri). `apps/web/package.json` stays `0.0.0` on purpose — it is a private
// workspace entry, not the product, so treating it as the version would give
// the web build a version nobody releases.
//
// Exposed to the app as `__BODYLAB_VERSION__`; declared in `src/vite-env.d.ts`.
// Never hardcode a version string in `src/` — that is how the UI ended up
// saying `v1.0.0-rc` while the exports said `1.0.0` and the product was
// `1.0.0-beta.8`.
export const APP_VERSION = (
  JSON.parse(
    readFileSync(path.resolve(__dirname, '../desktop/package.json'), 'utf8'),
  ) as { version: string }
).version

// When this bundle was produced, minute resolution, local time. Version alone
// cannot tell two builds apart when nobody bumps it; the stamp can. Declared in
// `src/vite-env.d.ts` and rendered in Ajustes.
const BUILD_STAMP = (() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
})()

// Mirrored in `vitest.config.ts` so tests see the same value — keep both in sync.
export const bodylabVersionDefine = {
  __BODYLAB_VERSION__: JSON.stringify(APP_VERSION),
  __BUILD_STAMP__: JSON.stringify(BUILD_STAMP),
}

// Production-only CSP injected into index.html at build time. Dev is left
// open because Vite HMR needs ws:// + inline eval that the policy forbids.
// The Tauri build mirrors this policy in tauri.conf.json (app.security.csp) —
// keep both in sync when changing it.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline': the inline theme-bootstrap script + React style props.
  // 'wasm-unsafe-eval': the OxiHuman engine compiles WASM at runtime.
  // data:: the vendor glue is imported as a data-URL module (oxihuman-loader.ts).
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' data:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function cspMeta(): import('vite').Plugin {
  return {
    name: 'csp-meta-prod-only',
    transformIndexHtml(html, ctx) {
      if (ctx.server) return html; // dev — HMR would violate the policy
      return html.replace(
        '</head>',
        `    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  </head>`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // NOTE: no WASM plugin. The OxiHuman 0.2.1 engine is vendored under public/wasm/
  // and loaded at runtime (oxihuman-loader.ts) — the bundler never sees the .wasm.
  plugins: [react(), tailwindcss(), cspMeta()],
  define: bodylabVersionDefine,
  resolve: {
    alias: {
      '@': '/src',
      // Core module aliases — single source of truth
      '@fitness/bodylab-anthropometry': path.resolve(__dirname, '../../core/anthropometry/src'),
      '@fitness/bodylab-measurements': path.resolve(__dirname, '../../core/measurements/src'),
      '@fitness/bodylab-references': path.resolve(__dirname, '../../core/references/src'),
      '@fitness/bodylab-composition': path.resolve(__dirname, '../../core/composition/src'),
      '@fitness/bodylab-progress': path.resolve(__dirname, '../../core/progress/src'),
      '@fitness/bodylab-validation': path.resolve(__dirname, '../../core/validation/src'),
      '@fitness/bodylab-export': path.resolve(__dirname, '../../core/export/src'),
      '@fitness/bodylab-analytics': path.resolve(__dirname, '../../core/analytics/src'),
      '@fitness/bodylab-conditioning': path.resolve(__dirname, '../../core/conditioning/src'),
      '@fitness/bodylab-training': path.resolve(__dirname, '../../core/training/src'),
      '@fitness/bodylab-exercises': path.resolve(__dirname, '../../core/exercises/src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/jszip')) {
            return 'vendor-jszip';
          }
        },
      },
    },
  },
})
