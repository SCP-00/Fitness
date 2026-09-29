import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser E2E for BodyLab web.
 *
 * Covers what the headless vitest suites cannot: real rendering (2D body map,
 * GIF decoding/animation, WebGL + WASM 3D model generation) and route integrity.
 *
 * Run:  cd bodylab/apps/web && pnpm exec playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    viewport: { width: 1366, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      // Allow software WebGL (SwiftShader) in headless CI/desktop runs
      args: [
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite --port 5199 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
