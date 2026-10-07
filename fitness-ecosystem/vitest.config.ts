import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import path from 'path';

// Both apps inject their version at build time from their own package.json
// (see each app's vite.config.ts). The root suite loads app sources too —
// `bodylab/apps/web/src/__tests__/data-integrity.test.ts` pulls in `lib/db.ts`
// — so it must define the same keys or those tests die on an undefined global.
const appVersion = (file: string) =>
  (JSON.parse(readFileSync(path.resolve(__dirname, file), 'utf8')) as {
    version: string;
  }).version;

// Same treatment for the build stamp, for the same reason: app sources that
// render it (both Ajustes screens) must not die on an undefined global here.
// Tests never assert its value, so a test-run timestamp is fine.
const buildStamp = (() => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
})();

export default defineConfig({
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp),
    __BODYLAB_VERSION__: JSON.stringify(appVersion('bodylab/apps/desktop/package.json')),
    __TRAININGLAB_VERSION__: JSON.stringify(
      appVersion('traininglab/apps/desktop/package.json'),
    ),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['bodylab/core/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/index.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@fitness/bodylab-anthropometry': path.resolve(__dirname, 'bodylab/core/anthropometry/src'),
      '@fitness/bodylab-measurements': path.resolve(__dirname, 'bodylab/core/measurements/src'),
      '@fitness/bodylab-references': path.resolve(__dirname, 'bodylab/core/references/src'),
      '@fitness/bodylab-composition': path.resolve(__dirname, 'bodylab/core/composition/src'),
      '@fitness/bodylab-progress': path.resolve(__dirname, 'bodylab/core/progress/src'),
      '@fitness/bodylab-validation': path.resolve(__dirname, 'bodylab/core/validation/src'),
      '@fitness/bodylab-export': path.resolve(__dirname, 'bodylab/core/export/src'),
      '@fitness/bodylab-analytics': path.resolve(__dirname, 'bodylab/core/analytics/src'),
      '@fitness/bodylab-conditioning': path.resolve(__dirname, 'bodylab/core/conditioning/src'),
      '@fitness/bodylab-training': path.resolve(__dirname, 'bodylab/core/training/src'),
      '@fitness/bodylab-exercises': path.resolve(__dirname, 'bodylab/core/exercises/src'),
    },
  },
});
