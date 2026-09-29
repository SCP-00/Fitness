/**
 * Anatomy x-ray mode E2E — real Chromium, real GLB decode + WebGL overlay.
 *
 * Proves the static anatomy atlas (meshopt-compressed GLBs) actually loads,
 * attaches to the live scene, and that the layer controls work — in EN and ES.
 * Skips on machines without WebGL (headless environments without GPU).
 *
 * @module e2e/anatomy-xray
 */

import { test, expect, type Page } from '@playwright/test';

/** Skip the onboarding gate and give the 3D view a real profile to fit. */
async function seed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      const profile = {
        id: 'p-e2e', name: 'E2E User', height: 1.78, weight: 82, age: 30,
        biologicalSex: 'male', units: 'metric',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const mk = (type: string, value: number, unit: string) => ({
        id: `m-${type}`, profileId: 'p-e2e', type, value, unit,
        timestamp: '2026-01-01T00:00:00.000Z', method: 'manual', confidence: 'high',
      });
      const measurements = [
        mk('weight', 82, 'kg'), mk('chest', 100, 'cm'),
        mk('waist', 80, 'cm'), mk('hips', 95, 'cm'),
      ];
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
      window.localStorage.setItem('bodylab-profile', JSON.stringify(profile));
      window.localStorage.setItem('bodylab-measurements', JSON.stringify(measurements));
    } catch { /* storage unavailable */ }
  });
}

/**
 * WebGL guard: the 3D viewer requires a real GL context. CI runners may lack
 * one — skip instead of failing on infrastructure, never on product code.
 */
async function webglAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      return false;
    }
  });
}

/** Navigate with HashRouter ('/body' → '/#/body'), relative to baseURL. */
async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`);
}

/**
 * Reach the live 3D viewer. /body defaults to the 2D tab — the 3D tab must be
 * clicked explicitly (same as the product suite). First dev-server hit compiles
 * the three.js graph on the fly, hence the generous 90 s wait.
 */
async function openBody3D(page: Page, lang: 'en' | 'es'): Promise<void> {
  await gotoRoute(page, '/body');
  if (lang === 'es') await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('button', { name: /X-ray|Rayos X/ })).toBeVisible({ timeout: 90_000 });
}

for (const lang of ['en', 'es'] as const) {
  test.describe(`x-ray mode (${lang})`, () => {
    test('loads the anatomy atlas and toggles x-ray layer controls', async ({ page }) => {
      await seed(page);
      await gotoRoute(page, '/body');
      if (!(await webglAvailable(page))) test.skip(true, 'WebGL unavailable in this environment');

      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await openBody3D(page, lang);

      // Toggle x-ray → the atlas (~8 MB of GLBs) must load and the sliders appear
      await page.getByRole('button', { name: /X-ray|Rayos X/ }).click();

      const musclesLabel = lang === 'es' ? /Músculos/ : /Muscles/;
      const skeletonLabel = lang === 'es' ? /Esqueleto/ : /Skeleton/;
      await expect(page.getByLabel(musclesLabel)).toBeVisible({ timeout: 60_000 });
      await expect(page.getByLabel(skeletonLabel)).toBeVisible();

      // Sliders are wired to real state: set to 0 and back
      const slider = page.getByLabel(musclesLabel);
      await slider.fill('0');
      await expect(page.getByLabel(musclesLabel)).toHaveValue('0');
      await slider.fill('70');

      // Toggle off → controls disappear, toggle returns to off state
      await page.getByRole('button', { name: /X-ray|Rayos X/ }).click();
      await expect(page.getByLabel(musclesLabel)).toHaveCount(0);

      expect(errors).toEqual([]);
    });
  });
}
