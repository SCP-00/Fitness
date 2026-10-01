import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The same config drives two very different hosts:
 *
 *   * `pnpm dev` / `pnpm build` — the web app, also what the one-button LAN
 *     server (`scripts/serve-lan.mjs`) ships to a phone; and
 *   * `pnpm tauri dev` / `pnpm tauri build` — the desktop shell, which loads
 *     `http://localhost:5174` in dev and `../dist` in release.
 *
 * The two settings that only matter for the shell are called out below; the
 * port is pinned rather than auto-picked so `devUrl` in `tauri.conf.json` is
 * always right, and so it can never collide with BodyLab's 5173 while both dev
 * servers are running.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@fitness/bodylab-training': path.resolve(__dirname, '../../../bodylab/core/training/src'),
      '@fitness/bodylab-exercises': path.resolve(__dirname, '../../../bodylab/core/exercises/src'),
      '@fitness/bodylab-conditioning': path.resolve(__dirname, '../../../bodylab/core/conditioning/src'),
    },
  },
  // Tauri reads TAURI_* env vars at build time to inject the platform details.
  envPrefix: ['VITE_', 'TAURI_'],
  clearScreen: false,
  server: {
    port: 5174,
    // `strictPort` on purpose: silently moving to 5175 would leave the shell
    // pointing at a port nothing is listening on.
    strictPort: true,
    // Never watch the Rust tree — a rebuild there would trigger a pointless
    // full page reload of the WebView.
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    // WebView2 and every modern browser handle this; the app uses top-level
    // await-free ESM and no legacy syntax.
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('core/exercises')) {
            return 'catalog-exercises';
          }
        },
      },
    },
  },
});
