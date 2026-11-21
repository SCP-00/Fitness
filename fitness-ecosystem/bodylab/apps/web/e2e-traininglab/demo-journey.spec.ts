import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * T04.2 — the eight-week walkthrough, end to end in a real browser.
 *
 * This is the journey the owner walks on a new machine, and the one that decides
 * whether the unified app is usable before any screen is judged on its own:
 *
 *   1. A clean profile loads the sample history from Ajustes (eight weeks, the
 *      same generator the demo button uses in production).
 *   2. Hoy offers a session, ZEN logs exactly one set, and closing the session
 *      leaves it in Historial — after a reload, from disk.
 *   3. Progreso records a waist measurement typed with a decimal comma, and it
 *      survives a reload.
 *   4. Removing the sample data leaves the measurement (and the set the user
 *      logged) untouched. The removal filter is the `demo-` prefix, and this is
 *      the only test that asserts it from the interface.
 *
 * The clock is fixed at noon on a Monday: the demo anchors its block to "today",
 * not to a weekday, but a fixed clock keeps the eight generated weeks identical
 * between runs and makes the assertions about counts exact.
 *
 * Nothing here reads internal state: every expectation is on text or on an
 * accessibility attribute the screen already publishes.
 */

const MONDAY_NOON = new Date(2026, 10, 16, 12, 0, 0);

/** The Ajustes section that owns the demo buttons (`<details>` + `<summary>`). */
function demoSection(page: Page): Locator {
  return page.locator("details").filter({
    has: page.getByRole("heading", { name: "Datos de ejemplo", exact: true }),
  });
}

async function openDemoSection(page: Page): Promise<Locator> {
  const section = demoSection(page);
  await expect(section).toBeVisible();
  if (!(await section.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await section.locator("summary").click();
  }
  await expect(section.getByTestId("load-demo")).toBeVisible();
  return section;
}

/** First run: three questions so the onboarding dialog stops covering Ajustes. */
async function passOnboarding(page: Page): Promise<void> {
  await page.goto("/#/hoy");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Hipertrofia" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "60 minutos por sesión" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Empezar a entrenar" }).click();
  await expect(dialog).toBeHidden();
}

/** Session-wide working-set counter, read from the badge's own aria-label. */
async function readWorkingSets(page: Page): Promise<{ done: number; total: number }> {
  const label = await page.locator(".zen-progress").getAttribute("aria-label");
  const match = label?.match(/^(\d+)\s*\/\s*(\d+)/);
  expect(label, `aria-label of the ZEN progress badge: ${label}`).toBeTruthy();
  return { done: Number(match![1]), total: Number(match![2]) };
}

test("el recorrido completo con las ocho semanas de ejemplo", async ({ page }) => {
  test.setTimeout(30_000);
  await page.clock.setFixedTime(MONDAY_NOON);

  /* ── 1. Clean profile → Ajustes → load the sample history ─────────────── */
  await passOnboarding(page);
  await page.goto("/#/ajustes");
  const demo = await openDemoSection(page);
  await demo.getByTestId("load-demo").getByRole("button").click();
  await expect(
    page.getByRole("status").filter({ hasText: /Historial de ejemplo añadido: \d+ series\./ }),
  ).toBeVisible();

  /* ── 2. Hoy offers a session and ZEN logs exactly one set ─────────────── */
  await page.goto("/#/hoy");
  const planRows = page.locator(".exrow");
  await expect(planRows.first()).toBeVisible();
  expect(await planRows.count()).toBeGreaterThan(0);

  const openZen = page.locator('a[href="#/sesion"]').first();
  await expect(openZen).toBeVisible();
  await openZen.click();

  await expect(page.getByRole("button", { name: "Salir de ZEN" })).toBeVisible();

  /*
   * The active row may open on its ramp instead of the set form. The ramp is
   * four steps (50 / 70 / 85 % and then work) and its button only advances one,
   * so it has to be walked through, not dismissed: one click leaves three.
   * `click()` inside `evaluate` on purpose — at 390 px the fixed top bar can sit
   * over this in-flow button once the browser scrolls to it.
   */
  const warmup = page.getByRole("button", { name: "Calentamiento hecho" });
  const logSet = page.locator('[data-testid="log-set"]');
  for (let step = 0; step < 6; step += 1) {
    if ((await logSet.count()) > 0) break;
    if ((await warmup.count()) === 0) {
      // Neither the ramp nor the form: give the lazy screen the beat it needs.
      await page.waitForTimeout(200);
      continue;
    }
    await warmup.evaluate((button: HTMLButtonElement) => button.click());
    await page.waitForTimeout(150);
  }
  await expect(logSet).toBeVisible();

  const before = await readWorkingSets(page);
  await expect(logSet).toBeEnabled();
  await logSet.click();
  await expect
    .poll(async () => (await readWorkingSets(page)).done)
    .toBe(before.done + 1);

  // Close the session from ZEN, at phone width, where the fixed CTA used to
  // cover the finish button.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page).toHaveURL(/#\/resumen/);

  /* ── 3. Historial has the closed session, before and after a reload ───── */
  // 8 weeks × 5 training days = 40 closed sessions once today's is closed
  // (the sample leaves today open on purpose).
  const closed = page.getByText(/^40 sesiones cerradas/).first();
  await page.goto("/#/historial");
  await expect(closed).toBeVisible();
  const cards = page.getByTestId("history-card");
  await expect(cards).toHaveCount(40);
  // The journey's own session is the newest: exactly the set logged in ZEN.
  // (The card's textContent runs the stats together — "1 serie1 ejercicio" —
  // so a word boundary after "serie" never matches; exclude the plural only.)
  await expect(cards.first()).toContainText(/1 serie(?!s)/);

  await page.reload();
  await expect(page.getByText(/^40 sesiones cerradas/).first()).toBeVisible();
  await expect(page.getByTestId("history-card")).toHaveCount(40);
  await expect(page.getByTestId("history-card").first()).toContainText(/1 serie(?!s)/);

  await page.goto("/#/semana");
  const summary = page.getByRole("region", { name: "Actividad semanal" });
  const sessions = summary.getByText("Sesiones cerradas", { exact: true }).locator("..").locator("dd");
  const sets = summary.getByText("Series de trabajo", { exact: true }).locator("..").locator("dd");
  await expect(sessions).toHaveText("1");
  await expect(sets).toHaveText("1");
  await expect(summary.getByRole("button", { name: "Semana siguiente" })).toBeDisabled();
  await summary.getByRole("button", { name: "Semana anterior" }).click();
  await expect(sessions).toHaveText("5");
  await expect(sets).not.toHaveText("1");
  await summary.getByRole("button", { name: "Semana siguiente" }).click();
  await expect(sessions).toHaveText("1");
  await expect(sets).toHaveText("1");

  /* ── 4. Progreso: a decimal-comma waist measurement survives a reload ── */
  await page.goto("/#/progreso");
  const waist = page.getByRole("region", { name: "Medir cintura" });
  await expect(waist).toBeVisible();
  await waist.getByLabel("Fecha").fill("2026-11-16");
  await waist.getByLabel("Perímetro (cm)").fill("88,4");
  await waist.getByRole("button", { name: "Guardar medida" }).click();
  await expect(waist.getByRole("status")).toHaveText("Medida guardada.");
  const rows = waist.getByRole("listitem");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("88,4 cm");

  await page.reload();
  await expect(waist.getByRole("listitem")).toHaveCount(1);
  await expect(waist.getByRole("listitem").first()).toContainText("88,4 cm");

  /* ── 5. Remove the sample data: the measurement and the set stay ──────── */
  await page.goto("/#/ajustes");
  const demoAgain = await openDemoSection(page);
  await demoAgain.getByTestId("clear-demo").getByRole("button").click();
  await expect(
    page.getByRole("status").filter({ hasText: /Historial de ejemplo eliminado: \d+ series\./ }),
  ).toBeVisible();

  await page.goto("/#/progreso");
  await expect(waist.getByRole("listitem")).toHaveCount(1);
  await expect(waist.getByRole("listitem").first()).toContainText("88,4 cm");

  // And the removal filter only took demo rows: the session closed in ZEN —
  // its own ids, its own set — is still the one closed session on record.
  await page.goto("/#/historial");
  await expect(page.getByText(/^1 sesión cerrada/).first()).toBeVisible();
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await expect(page.getByTestId("history-card").first()).toContainText(/1 serie(?!s)/);
});
