/**
 * ADVERSARIAL E2E — zero-trust, real Chromium.
 *
 * The existing product suite proves the happy path works. This suite assumes a
 * hostile user and corrupt data instead:
 *
 *   1. garbage file renamed `.bodylab`            → controlled error, no crash
 *   2. ZIP missing manifest.json                  → controlled error, no crash
 *   3. ZIP with a valid manifest but corrupt data → must not crash the app
 *   4. stored XSS in the profile name             → must render as text
 *   5. hostile numeric input in the measure flow  → must not crash
 *
 * @module e2e/adversarial
 */

import { test, expect, type Page } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import JSZip from 'jszip';

async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
    } catch { /* storage may be unavailable */ }
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

/**
 * Navigate to an app route. HashRouter → '/data' becomes '/#/data'.
 * Always resolves relative to baseURL, independent of the current URL.
 */
async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`);
}

const IMPORT_ERROR = /Failed to read file|Error al leer el archivo|Invalid file format|Formato no válido/;

async function importFile(page: Page, filePath: string): Promise<void> {
  await gotoRoute(page, '/data');
  await page.setInputFiles('input[type=file]', filePath);
}

// ============================================================================
// 1 & 2 — MALFORMED BACKUPS
// ============================================================================

test.describe('ADVERSARIAL: malformed backups', () => {
  test('rejects a non-ZIP file renamed .bodylab without crashing', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);

    const badPath = path.join(os.tmpdir(), `bodylab-garbage-${Date.now()}.bodylab`);
    await writeFile(badPath, 'this is definitely not a zip archive — adversarial input');

    await importFile(page, badPath);
    await expect(page.getByText(IMPORT_ERROR)).toBeVisible();
    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });

  test('rejects a ZIP missing manifest.json without crashing', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);

    const zip = new JSZip();
    zip.file('profile.json', JSON.stringify({ id: 'p', name: 'No Manifest' }));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = path.join(os.tmpdir(), `bodylab-nomanifest-${Date.now()}.bodylab`);
    await writeFile(zipPath, buf);

    await importFile(page, zipPath);
    await expect(page.getByText(IMPORT_ERROR)).toBeVisible();
    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });

  test('does not crash when a valid manifest carries structurally corrupt data', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({ format: 'bodylab', schemaVersion: 1, contains: ['measurements'] }));
    zip.file('measurements.json', JSON.stringify({ not: 'an array' })); // hostile shape
    zip.file('profile.json', JSON.stringify({ name: 42, height: 'tall' })); // hostile shape
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = path.join(os.tmpdir(), `bodylab-corrupt-${Date.now()}.bodylab`);
    await writeFile(zipPath, buf);

    await importFile(page, zipPath);

    // Give the app a beat to (not) explode while it consumes the payload.
    await page.waitForTimeout(1500);
    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================================================
// 3 — STORED XSS
// ============================================================================

test.describe('ADVERSARIAL: stored XSS via profile', () => {
  test('a script-bearing profile name is rendered as inert text', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async d => {
      dialogs.push(d.message());
      await d.dismiss();
    });

    const hostile = '<img src=x onerror="window.__bodylabXss=1">';
    await page.addInitScript((name: string) => {
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
      window.localStorage.setItem('bodylab-profile', JSON.stringify({
        id: 'p-xss', name, height: 1.78, weight: 82, age: 30,
        biologicalSex: 'male', units: 'metric',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      }));
    }, hostile);

    for (const route of ['/', '/progress', '/settings']) {
      await gotoRoute(page, route);
      await expect(page.locator('body')).toBeVisible();
    }

    const executed = await page.evaluate(() => (window as unknown as Record<string, unknown>).__bodylabXss);
    expect(executed).toBeUndefined();
    expect(dialogs).toEqual([]);
    // The injected <img> must not exist as a DOM element.
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    // The hostile text survives as literal text in the settings name input.
    const nameValue = await page.locator('input[type="text"]').first().inputValue();
    expect(nameValue).toBe(hostile);
  });
});

// ============================================================================
// 4 — HOSTILE NUMERIC INPUT
// ============================================================================

test.describe('ADVERSARIAL: hostile measurement input', () => {
  test('negative, zero and absurd values do not crash the guided flow', async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
    });
    await gotoRoute(page, '/measure');

    await page.getByRole('button', { name: /Start measuring|Comenzar a medir/ }).click();
    const input = page.locator('input[type=number]');

    for (const hostile of ['-999', '0', '1e9', '0.0001', '1e-9']) {
      await input.fill(hostile);
      await input.press('Enter');
      // The layout must survive: if the handler threw, the tree would unmount.
      await expect(page.getByRole('link', { name: /Overview|Resumen/ })).toBeVisible();
    }

    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });
});
