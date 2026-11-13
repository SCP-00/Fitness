import { defineConfig, devices } from "@playwright/test";

/**
 * TrainingLab's minimum real-browser journey. Kept next to BodyLab's E2E
 * runner because that is where the installed Playwright dependency lives; the
 * app under test is still TrainingLab, served by its own Vite process.
 */
export default defineConfig({
  testDir: "./e2e-traininglab",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5198",
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command:
      "pnpm --dir ../../../traininglab/apps/desktop exec vite --port 5198 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5198",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
