import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Same single source as vite.config.ts: `bodylab/apps/desktop/package.json`.
// Without this, any test that loads `src/lib/db.ts` dies on an undefined
// `__BODYLAB_VERSION__` — see src/vite-env.d.ts.
const APP_VERSION = (
  JSON.parse(
    readFileSync(path.resolve(__dirname, '../desktop/package.json'), 'utf8'),
  ) as { version: string }
).version

// Mirrors resolve.alias in vite.config.ts + paths in tsconfig.app.json.
// Keep all three in sync — see docs/ARCHITECTURE.md.
const coreAliases = {
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
};

export default defineConfig({
  plugins: [react()],
  define: {
    __BODYLAB_VERSION__: JSON.stringify(APP_VERSION),
    // Any test that renders a screen showing the installed build (Ajustes)
    // needs this key defined here too — see src/vite-env.d.ts.
    __BUILD_STAMP__: JSON.stringify(
      (() => {
        const d = new Date()
        const p = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
      })(),
    ),
  },
  resolve: {
    alias: coreAliases,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
});
