import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
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
