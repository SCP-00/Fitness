import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
