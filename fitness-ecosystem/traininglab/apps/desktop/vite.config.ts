import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TrainingLab consumes core/training via the same alias convention as the web
// app (keep in sync with tsconfig.app.json paths and root vitest.config.ts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@fitness/bodylab-training': path.resolve(__dirname, '../../../bodylab/core/training/src'),
      '@fitness/bodylab-exercises': path.resolve(__dirname, '../../../bodylab/core/exercises/src'),
    },
  },
  build: {
    target: 'esnext',
  },
});
