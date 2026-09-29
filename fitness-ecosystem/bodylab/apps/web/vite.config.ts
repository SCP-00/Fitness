import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  },
})
