/**
 * Product E2E — real Chromium, real rendering.
 *
 * Covers the full user journey surface that headless tests cannot reach:
 *   1. Every route boots without runtime errors
 *   2. 2D body explorer → muscle inspection → real GIF asset decodes (naturalWidth > 0)
 *   3. 3D parametric model: WebGL context + WASM engine + .ohpk model pack actually render
 *
 * @module e2e/product
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

/** Skip the onboarding gate so each test starts at a routed screen. */
async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
    } catch { /* storage may be unavailable on some origins */ }
  });
}

/** Navigate to an app route. HashRouter → '/body' becomes '/#/body'. */
async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`);
}

/** Collect runtime + console errors; callers decide what to fail on. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

/** Seed a profile + measurements through the app's own localStorage migration path. */
async function seedProfile(page: Page, opts?: { weight?: number; chest?: number; waist?: number; hips?: number }): Promise<void> {
  await page.addInitScript(({ weight = 82, chest = 100, waist = 80, hips = 95 } = {}) => {
    const profile = {
      id: 'p-e2e', name: 'E2E User', height: 1.78, weight, age: 30,
      biologicalSex: 'male', units: 'metric',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const mk = (type: string, value: number, unit: string) => ({
      id: `m-${type}`, profileId: 'p-e2e', type, value, unit,
      timestamp: '2026-01-01T00:00:00.000Z', method: 'manual', confidence: 'high',
    });
    const measurements = [
      mk('weight', weight, 'kg'), mk('chest', chest, 'cm'),
      mk('waist', waist, 'cm'), mk('hips', hips, 'cm'),
    ];
    window.localStorage.setItem('bodylab-onboarding-done', 'true');
    window.localStorage.setItem('bodylab-profile', JSON.stringify(profile));
    window.localStorage.setItem('bodylab-measurements', JSON.stringify(measurements));
  }, opts);
}

/** Values for the 10 guided steps, in order: weight, chest, waist, hips, biceps, shoulders, thigh, calf, neck, wrist. */
const GUIDE_VALUES: { value: string; unit: string }[] = [
  { value: '81', unit: 'kg' }, { value: '101', unit: 'cm' }, { value: '79', unit: 'cm' },
  { value: '96', unit: 'cm' }, { value: '38', unit: 'cm' }, { value: '122', unit: 'cm' },
  { value: '60', unit: 'cm' }, { value: '38', unit: 'cm' }, { value: '39', unit: 'cm' },
  { value: '17', unit: 'cm' },
];

// Content markers (EN/ES) that prove each screen actually rendered its UI
// (markers taken from the real rendered pages, not just the i18n dictionary)
const ROUTES: { path: string; marker: RegExp }[] = [
  { path: '/', marker: /Welcome to BodyLab|Bienvenido a BodyLab|No measurements yet|Sin mediciones aún/ },
  { path: '/measure', marker: /New measurement session|Nueva sesión de medición|Measurement Session|Sesión de Medición/ },
  { path: '/body', marker: /Click a muscle to inspect|Haz clic en un músculo para inspeccionar/ },
  { path: '/progress', marker: /Track your changes|Sigue tus cambios/ },
  { path: '/references', marker: /Define how your measurements are interpreted|Define cómo se interpretan tus mediciones/ },
  { path: '/data', marker: /Your data stays on this device|Tus datos permanecen en este dispositivo/ },
  { path: '/settings', marker: /Customize BodyLab|Personaliza BodyLab/ },
];

// ============================================================================
// 1. ROUTE INTEGRITY — every screen boots without crashing
// ============================================================================

test.describe('Route integrity', () => {
  for (const route of ROUTES) {
    test(`boots ${route.path} without runtime errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await skipOnboarding(page);
      await gotoRoute(page, route.path);
      await expect(page.locator('body')).not.toBeEmpty();
      // The screen's unique content rendered (EN or ES variant)
      await expect(page.locator('body')).toContainText(route.marker, { timeout: 15_000 });
      // No uncaught exceptions during initial render
      expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
    });
  }
});

// ============================================================================
// 2. 2D BODY EXPLORER + REAL GIF ASSET
// ============================================================================

test.describe('2D body explorer + exercise GIF', () => {
  test('inspects a muscle and decodes its real animated GIF', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);
      await gotoRoute(page, '/body');

    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /^Body$|^Cuerpo$/ })).toBeVisible();

    // Sidebar muscle list → open Chest (Pectoralis Major)
    await page.getByRole('button', { name: /Chest|Pecho/ }).first().click();
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /Chest|Pecho/ }).first()).toBeVisible();

    // Expand the Training section (exercise log for chest_upper)
    await page.getByRole('button', { name: /Training|Entrenamiento/ }).click();
    await expect(page.getByText(/Available exercises|Ejercicios disponibles/)).toBeVisible();

    // Open Barbell Bench Press → its GIF must render from the real asset file
    await page.getByRole('button', { name: /Barbell Bench Press|Press con Barra/ }).click();
    // The GIF lazy-loads via IntersectionObserver: scroll the expanded detail
    // into view (as a real user would) so the observer fires and the <img> mounts.
    await page.getByText(/Lie flat, lower bar to mid-chest|Acostado en banco|lower bar/i).scrollIntoViewIfNeeded();
    const benchGif = page.locator('img[alt="Barbell Bench Press"], img[alt="Press con Barra"]');
    await expect(benchGif).toBeVisible();
    const src = await benchGif.getAttribute('src');
    expect(src).toMatch(/\/exercises\/gifs\/barbell-bench-press\.gif$/);

    // The GIF bytes were served and decoded (naturalWidth > 0 proves real image data)
    await expect
      .poll(async () => benchGif.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    // No network/runtime failures on this flow
    expect(errors).toEqual([]);
  });
});

// ============================================================================
// 3. 3D PARAMETRIC MODEL — WebGL + WASM + .ohpk
// ============================================================================

test.describe('3D model generation', () => {
  // RESOLVED (2026-09-04): the P0 was a pack/engine format mismatch — the OHPK v1
  // pack (SHA 09c4bb…, canonical v0.2.1 release) requires the 0.2.1 engine
  // (`from_core_pack_bytes`), but the app shipped the 0.2.0 wasm (ZIP-pack API),
  // which trapped with `RuntimeError: unreachable`. The 0.2.1 engine build is
  // vendored from the vendor's hosted release demo (cooljapan.tech/bodylab),
  // byte-for-byte, under public/wasm/. This test now runs for real.
  test('loads the WASM engine and renders the parametric body on a WebGL canvas', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);
      await gotoRoute(page, '/body');

    // Switch 2D → 3D (toolbar segmented control)
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: /Parametric 3D Model|Modelo 3D Paramétrico/ })).toBeVisible();

    // First dev-server hit compiles the three.js graph on the fly — allow generous time.
    // The engine must finish loading: the graceful error state is now a hard failure.
    const errorState = page.getByText(/3D model unavailable|Modelo 3D no disponible/);
    const canvas = page.locator('canvas');
    await expect
      .poll(async () => (await canvas.count()) > 0 || (await errorState.count()) > 0, { timeout: 90_000 })
      .toBe(true);
    if ((await errorState.count()) > 0) {
      throw new Error('3D engine failed to initialize: ' + (errors.join(' | ') || 'no console errors recorded'));
    }

    // Real WebGL context was created and the viewer painted into the DOM
    await expect(canvas).toHaveCount(1);
    const glOk = await canvas.evaluate((el: HTMLCanvasElement) => {
      return !!(el.getContext('webgl2') || el.getContext('webgl') || el.getContext('experimental-webgl'));
    });
    expect(glOk).toBe(true);
    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(dims.w).toBeGreaterThan(0);
    expect(dims.h).toBeGreaterThan(0);

    // Loading overlay is gone and the camera preset controls rendered → viewer is live
    // (the 2D view toggle also has a Front button — the 3D preset row is the last one)
    await expect(page.getByText(/Preparing 3D model…|Preparando modelo 3D…/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Front$|^Frontal$/ }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Front$|^Frontal$/ }).last()).toBeEnabled();

    // No failures in the WASM/asset/WebGL init path
    expect(errors).toEqual([]);
  });

  test('fits the 3D body to the profile\'s real measurements (fit solver)', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);

    // Seed a full profile + measurements through the app's own localStorage
    // migration path (store.tsx migrates bodylab-* keys into IndexedDB on mount)
    await page.addInitScript(() => {
      const profile = {
        id: 'p-e2e-fit', name: 'E2E Fit', height: 1.78, weight: 82, age: 30,
        biologicalSex: 'male', units: 'metric',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const measurements = [
        { id: 'm-chest', profileId: 'p-e2e-fit', type: 'chest', value: 101, unit: 'cm', timestamp: '2026-01-01T00:00:00.000Z', method: 'manual', confidence: 'high' },
        { id: 'm-waist', profileId: 'p-e2e-fit', type: 'waist', value: 78, unit: 'cm', timestamp: '2026-01-01T00:00:00.000Z', method: 'manual', confidence: 'high' },
        { id: 'm-hips', profileId: 'p-e2e-fit', type: 'hips', value: 95, unit: 'cm', timestamp: '2026-01-01T00:00:00.000Z', method: 'manual', confidence: 'high' },
      ];
      window.localStorage.setItem('bodylab-profile', JSON.stringify(profile));
      window.localStorage.setItem('bodylab-measurements', JSON.stringify(measurements));
    });
      await gotoRoute(page, '/body');
    await page.getByRole('button', { name: '3D', exact: true }).click();

    // Viewer must be live before the Fit action can run
    const errorState = page.getByText(/3D model unavailable|Modelo 3D no disponible/);
    const canvas = page.locator('canvas');
    await expect
      .poll(async () => (await canvas.count()) > 0 || (await errorState.count()) > 0, { timeout: 90_000 })
      .toBe(true);
    if ((await errorState.count()) > 0) {
      throw new Error('3D engine failed to initialize: ' + (errors.join(' | ') || 'no console errors recorded'));
    }
    await expect(page.getByText(/Preparing 3D model…|Preparando modelo 3D…/)).toHaveCount(0);

    // The Fit action is enabled (profile + measurements present) → run it
    const fitButton = page.getByRole('button', { name: /Fit body|Ajustar cuerpo/ });
    await expect(fitButton).toBeEnabled();
    await fitButton.click();

    // Solver report: fitted badge + one delta chip per target segment
    // (engine reports the hip segment as "hip" — the chip label normalizes to "hips")
    await expect(page.getByText(/Body fitted|Cuerpo ajustado/), { timeout: 60_000 }).toBeVisible();
    for (const seg of ['chest', 'waist', 'hips']) {
      await expect(page.getByText(new RegExp(`${seg}: [+-]?[0-9]+([.][0-9]+)? cm`))).toBeVisible();
    }

    // Model measurements panel still live after the rebuild
    await expect(page.getByText(/Model Measurements|Medidas del Modelo/)).toBeVisible();

    // The fit must not have failed (fit errors are surfaced both in-state and console)
    expect(await page.getByText(/Fit failed|Error al ajustar/).count()).toBe(0);
    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });
});

// ============================================================================
// 4. MEASURE FLOW — guided session, ghost previous value, delta, save
// ============================================================================

test.describe('Measure flow (guided session)', () => {
  test('runs a full guided session with ghost values, deltas, Enter-to-advance, and save', async ({ page }) => {
    const errors = collectErrors(page);
    await seedProfile(page); // previous values: weight 82 kg, chest 100, waist 80, hips 95
    await gotoRoute(page, '/measure');

    // Setup view → start the guided flow
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /New measurement session|Nueva sesión de medición/ })).toBeVisible();
    await page.getByRole('button', { name: /Start measuring|Comenzar a medir/ }).click();

    // Step 1 — Weight: ghost previous value (82 kg) is shown
    await expect(page.getByText('Previous', { exact: true })).toBeVisible();
    await expect(page.getByText('82 kg')).toBeVisible();

    // Typing a value shows the delta vs the ghost (81 vs 82 → down 1.0)
    const input = page.locator('input[type=number]');
    await input.fill('81');
    await expect(page.getByText(/↓ 1\.0 kg/)).toBeVisible();

    // Enter advances to the next step (shortcut contract from the spec)
    await input.press('Enter');
    await expect(page.getByText(/Wrap tape around the fullest part of chest|Envuelve la cinta alrededor de la parte más amplia del pecho/)).toBeVisible();

    // Step 2 — Chest: ghost shows the previous chest (100 cm), delta vs 101
    await expect(page.getByText('100 cm')).toBeVisible();
    await input.fill('101');
    await expect(page.getByText(/↑ 1\.0 cm/)).toBeVisible();
    await input.press('Enter'); // advance chest → waist

    // Walk the remaining steps. The input node is reused across steps, so
    // before filling we wait for it to be empty — i.e. React has committed the
    // NEW step — otherwise the fill can land on the previous step's closure
    // (a real race that silently overwrote the neck value). Clicking the
    // Next/Review button (rather than Enter) additionally waits for the value
    // to register, since the button stays disabled until then.
    for (const step of GUIDE_VALUES.slice(2)) {
      await expect(input).toHaveValue('');
      await input.fill(step.value);
      await page.getByRole('button', { name: /Next|Siguiente|Review|Revisar/ }).click();
    }

    // Review view: every recorded value is listed with its diff vs previous
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Review session|Revisar sesión/ })).toBeVisible();
    await expect(page.getByText('101')).toBeVisible();
    await expect(page.getByText('+1.0').first()).toBeVisible(); // chest & hips diffs vs previous
    await expect(page.getByText(/-1\.0/).first()).toBeVisible(); // weight & waist diffs vs previous


    // Save → confirmation + redirect home
    await page.getByRole('button', { name: /Save session|Guardar sesión/ }).click();
    await expect(page.getByText(/Session saved!|¡Sesión guardada!/)).toBeVisible();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });
});

// ============================================================================
// 6. DESIGN-SYSTEM REGRESSION — chips/pills must contain their own text
//    (guards the @layer-base reset contract: an unlayered `* { padding: 0 }`
//    once beat Tailwind's @layer utilities and crushed every chip app-wide)
// ============================================================================

test.describe('Chip containment (design-system guard)', () => {
  test('timeline metric chips fully contain their labels on /progress', async ({ page }) => {
    await skipOnboarding(page);
    await seedProfile(page);
    await gotoRoute(page, '/progress');

    const card = page.locator('div').filter({ has: page.getByRole('heading', { level: 2, name: /Timeline|Línea de tiempo/ }) }).first();
    await expect(card.getByRole('button', { name: /Chest|Pecho/ })).toBeVisible();

    const escaped = await card.evaluate((cardEl) => {
      const out: string[] = [];
      for (const btn of Array.from(cardEl.querySelectorAll('button'))) {
        const label = (btn.textContent || '').trim();
        if (!label) continue;
        const b = btn.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(btn);
        const t = range.getBoundingClientRect();
        if (b.width > 0 && (t.width > b.width + 0.5 || t.height > b.height + 0.5)) {
          out.push(`${label} (${t.width.toFixed(1)}x${t.height.toFixed(1)} in ${b.width.toFixed(1)}x${b.height.toFixed(1)})`);
        }
      }
      return out;
    });
    expect(escaped).toEqual([]);
  });
});

// ============================================================================
// 5. EXPORT / IMPORT ROUNDTRIP — real .bodylab ZIP leaves and comes back
// ============================================================================

test.describe('Export / import roundtrip', () => {
  test('exports a real .bodylab ZIP with the seeded data, then imports it into a fresh app', async ({ page, browser }) => {
    const errors = collectErrors(page);
    await seedProfile(page);
    await gotoRoute(page, '/data');

    // Export → capture the real download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export backup/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^bodylab-backup-.*\.bodylab$/);
    // Save under a real .bodylab name: download.path() temp files lose the
    // extension, which would send the import down the legacy-JSON branch.
    const zipPath = path.join(os.tmpdir(), 'bodylab-roundtrip.bodylab');
    await download.saveAs(zipPath);

    // The download is a real ZIP with the expected schema (verify in Node)
    const zip = await JSZip.loadAsync(await readFile(zipPath));
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.format).toBe('bodylab');
    expect(manifest.contains).toContain('measurements');
    const profile = JSON.parse(await zip.file('profile.json')!.async('string'));
    expect(profile.name).toBe('E2E User');
    const measurements = JSON.parse(await zip.file('measurements.json')!.async('string'));
    expect(measurements).toHaveLength(4);

    // Roundtrip: import the same file into a brand-new context (no seed data)
    const fresh: BrowserContext = await browser.newContext();
    const importPage = await fresh.newPage();
    await importPage.addInitScript(() => {
      window.localStorage.setItem('bodylab-onboarding-done', 'true');
    });
    const freshErrors = collectErrors(importPage);
      await gotoRoute(importPage, '/data');
    await expect(importPage.getByText('0').first()).toBeVisible(); // empty stats before import

    await importPage.setInputFiles('input[type=file]', zipPath!);
    await expect(importPage.getByText(/Backup imported|Backup importado/)).toBeVisible();

    // Stats now reflect the imported data (profile + 4 measurements + snapshot count)
    await expect(importPage.getByText('4').first()).toBeVisible();
    expect(freshErrors.filter(e => e.startsWith('pageerror'))).toEqual([]);
    await fresh.close();

    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });
});

// ============================================================================
// 7. EXERCISE LOG PERSISTENCE — store → IndexedDB roundtrip + Epley 1RM
// ============================================================================

test.describe('Exercise log persistence', () => {
  test('logs sets, computes an Epley 1RM, and survives a full reload', async ({ page }) => {
    const errors = collectErrors(page);
    await skipOnboarding(page);
      await gotoRoute(page, '/body');

    // Chest → Training → Barbell Bench Press
    await page.getByRole('button', { name: /Chest|Pecho/ }).first().click();
    await page.getByRole('button', { name: /Training|Entrenamiento/ }).click();
    await expect(page.getByText(/Available exercises|Ejercicios disponibles/)).toBeVisible();
    await page.getByRole('button', { name: /Barbell Bench Press|Press con Barra/ }).click();

    // Open the log form: inputs are, in DOM order, weight / reps / sets / RPE
    await page.getByRole('button', { name: /Log set|Registrar serie/ }).click();
    const nums = page.locator('input[type=number]');
    await expect(nums).toHaveCount(4);
    await nums.nth(0).fill('100'); // kg
    await nums.nth(1).fill('5'); // reps
    await nums.nth(2).fill('2'); // sets

    // Live Epley preview: 100 × (1 + 5/30) = 116.7 kg
    await expect(page.getByText('116.7 kg')).toBeVisible();
    await page.getByRole('button', { name: /^Save$|^Guardar$/ }).click();

    // The two sets are listed for the exercise
    await expect(page.getByText('100kg × 5')).toHaveCount(2);

    // Reload → data must come back from IndexedDB, not component state
    await page.reload();
    await page.getByRole('button', { name: /Chest|Pecho/ }).first().click();
    await page.getByRole('button', { name: /Training|Entrenamiento/ }).click();
    await page.getByRole('button', { name: /Barbell Bench Press|Press con Barra/ }).click();
    await expect(page.getByText('100kg × 5')).toHaveCount(2);

    // The persisted max-effort badge shows the rounded 1RM (regression guard:
    // it used to render the raw float 116.66666666666666 kg)
    await expect(page.getByText('116.7 kg')).toBeVisible();

    expect(errors.filter(e => e.startsWith('pageerror'))).toEqual([]);
  });
});
