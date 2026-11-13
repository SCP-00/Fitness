import { test, expect, type Locator, type Page } from "@playwright/test";

async function finishOnboarding(page: Page): Promise<void> {
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

async function passWarmup(page: Page): Promise<void> {
  const warmup = page.getByRole("button", { name: "Calentamiento hecho" });
  if ((await warmup.count()) > 0) {
    // At 390 px the fixed top bar can cover this in-flow button after the
    // browser scrolls it into view; use the node's own click, not a coordinate.
    await warmup.evaluate((button: HTMLButtonElement) => button.click());
  }
  await expect(page.locator('[data-testid="log-set"]')).toBeVisible();
}

async function startSession(page: Page): Promise<void> {
  await page.goto("/#/sesion");
  // The screen is lazy-loaded; wait for its own chrome before deciding whether
  // the warm-up phase is present (otherwise the check runs against an empty
  // Suspense fallback and skips the ramp).
  await expect(page.getByRole("button", { name: "Salir de ZEN" })).toBeVisible();
  await passWarmup(page);
}

async function logSet(page: Page): Promise<void> {
  await page.locator('[data-testid="log-set"]').click();
}

type PlanView = { names: string[]; sets: number; minutes: number };

/** The four surfaces that can show today's session, read from what is drawn. */
async function readTodayPlan(page: Page): Promise<PlanView> {
  await page.goto("/#/hoy");
  await expect(page.locator(".exrow").first()).toBeVisible();
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".exrow"));
    const body = document.body.innerText;
    return {
      names: rows.map((row) =>
        row.querySelector(".exrow-name")?.textContent?.trim() ?? "",
      ),
      sets: rows.reduce((total, row) => {
        const match = row.textContent?.match(/(\d+) series/);
        return total + Number(match?.[1] ?? 0);
      }, 0),
      minutes: Number(body.match(/([\d.]+) min\n·\n\d+ ejercicios/)?.[1]),
    };
  });
}

async function readTrainingPlan(page: Page): Promise<PlanView> {
  await page.goto("/#/entrenamiento");
  await expect(page.locator(".ent-row").first()).toBeVisible();
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".ent-row"));
    const body = document.body.innerText;
    const summary = body.match(/· ([\d.]+) min · \d+ ejercicios · (\d+) series/);
    return {
      names: rows.map(
        (row) => row.querySelector(".ent-name")?.textContent?.trim() ?? "",
      ),
      sets: rows.reduce((total, row) => {
        const match = row.querySelector(".ent-rx")?.textContent?.match(/^(\d+) ×/);
        return total + Number(match?.[1] ?? 0);
      }, 0),
      minutes: Number(summary?.[1]),
    };
  });
}

async function readWeekToday(page: Page): Promise<PlanView> {
  await page.goto("/#/semana");
  const today = page.locator('[aria-current="date"]');
  await expect(today).toBeVisible();
  return today.evaluate((article) => {
    const detail = article.textContent?.match(/(\d+) series · ([\d.]+) min/);
    return {
      names: Array.from(article.querySelectorAll(".tl-day-row-preview li")).map(
        (item) => item.textContent?.trim() ?? "",
      ),
      sets: Number(detail?.[1]),
      minutes: Number(detail?.[2]),
    };
  });
}

async function readZenPlan(page: Page): Promise<PlanView> {
  await page.goto("/#/sesion");
  await expect(page.getByRole("button", { name: "Salir de ZEN" })).toBeVisible();
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".upnext-item"));
    const body = document.body.innerText;
    return {
      names: items.map(
        (item) => item.querySelector("b")?.textContent?.trim() ?? "",
      ),
      sets: items.reduce((total, item) => {
        const match = item.querySelector("small")?.textContent?.match(/(\d+) ×/);
        return total + Number(match?.[1] ?? 0);
      }, 0),
      minutes: Number(body.match(/Sesión en curso · ([\d.]+) min/)?.[1]),
    };
  });
}

test("a finished session cannot reuse its sets, and the mobile finish button is reachable", async ({
  page,
}) => {
  await finishOnboarding(page);

  await startSession(page);
  await logSet(page);
  await logSet(page);
  await logSet(page);
  await expect(page.getByText(/3 \/ \d+ series/).first()).toBeVisible();

  // P1-1: at 390×844 the fixed ZEN CTA used to cover "Terminar sesión".
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const clearance = await page.evaluate(() => {
    const finish = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Terminar sesión"),
    );
    const cta = document.querySelector('[data-testid="log-set"]');
    if (!finish || !cta) return null;
    const f = finish.getBoundingClientRect();
    const c = cta.getBoundingClientRect();
    return {
      finishBottom: f.bottom,
      ctaTop: c.top,
      hit: document.elementFromPoint(f.left + f.width / 2, f.top + 6)?.textContent,
    };
  });
  expect(clearance).not.toBeNull();
  expect(clearance!.finishBottom).toBeLessThan(clearance!.ctaTop - 8);
  expect(clearance!.hit).toContain("Terminar sesión");

  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page).toHaveURL(/#\/resumen/);
  await expect(page.getByRole("heading", { name: "Descanso" })).toHaveCount(0);
  await expect(page.locator(".tl-page")).toHaveCount(0);
  await expect(page.locator("header.topbar")).toHaveCount(1);
  await expect(page.locator(".content")).toHaveCount(1);

  // A second session may continue the day, but must not enclose the same sets.
  await page.goto("/#/sesion");
  await expect(page.getByRole("button", { name: "Salir de ZEN" })).toBeVisible();
  // The first exercise is already complete; move to the next one to log a set.
  await page.getByRole("button", { name: /Remo bajo Mesa/ }).first().click();
  await passWarmup(page);
  await logSet(page);
  await expect(page.getByText(/4 \/ \d+ series/).first()).toBeVisible();
  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page).toHaveURL(/#\/resumen/);

  await page.goto("/#/historial");
  await expect(page.getByText(/^2 sesiones cerradas/).first()).toBeVisible();
  await expect(page.getByText(/^4 series de trabajo/).first()).toBeVisible();
});

test("Hoy, Entrenamiento, Semana and ZEN project the same session — and the same rest day", async ({
  page,
}) => {
  await finishOnboarding(page);

  // Every destination draws the shared shell. `.tl-page` belonged to the old
  // wrapper, so its reappearance on any route means a screen went back to it.
  const destinations: Array<[string, Locator]> = [
    ["#/hoy", page.locator(".content")],
    ["#/entrenamiento", page.locator(".content")],
    ["#/historial", page.locator(".content")],
    ["#/semana", page.locator('[aria-current="date"]')],
    ["#/progreso", page.locator(".content")],
    ["#/ejercicios", page.locator(".content")],
    ["#/rutinas", page.locator(".content")],
    ["#/coach", page.locator(".content")],
    ["#/ajustes", page.locator(".content")],
    ["#/resumen", page.locator(".content")],
    ["#/sesion", page.getByRole("button", { name: "Salir de ZEN" })],
  ];
  for (const [hash, marker] of destinations) {
    await page.goto(`/${hash}`);
    await expect(marker).toBeVisible();
    await expect(page.locator(".tl-page")).toHaveCount(0);
  }

  // Progreso and Ajustes are the last two ports: both must expose the same
  // topbar + content as the destinations that landed before them.
  for (const hash of ["#/progreso", "#/ajustes"]) {
    await page.goto(`/${hash}`);
    await expect(page.locator("header.topbar")).toHaveCount(1);
    await expect(page.locator(".content")).toHaveCount(1);
  }

  // A real Ajustes write must survive a reload, then be restored so the rest of
  // this test reads the same unit the plan was built in.
  await page.goto("/#/ajustes");
  await page.getByText("Preferencias del plan", { exact: true }).click();
  await page.getByRole("button", { name: "lb (USA)" }).click();
  await expect(
    page.getByRole("button", { name: "lb (USA)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByText("Preferencias del plan", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "lb (USA)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "kg", exact: true }).click();
  await expect(page.getByRole("button", { name: "kg", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const today = await readTodayPlan(page);
  expect(today.names.length).toBeGreaterThan(0);
  expect(today.sets).toBeGreaterThan(0);
  expect(today.minutes).toBeGreaterThan(0);

  expect(await readTrainingPlan(page)).toEqual(today);
  expect(await readWeekToday(page)).toEqual(today);
  // Semana is ported: the old `.tl-page` wrapper must not come back.
  await expect(page.locator(".tl-page")).toHaveCount(0);
  await expect(page.locator("header.topbar")).toHaveCount(1);
  await expect(page.locator(".content")).toHaveCount(1);
  await expect(page.getByTestId("week-drag-0")).toBeVisible();
  expect(await readZenPlan(page)).toEqual(today);

  // Progreso and Historial are retrospective: neither offers a second today.
  await page.goto("/#/progreso");
  await expect(page.locator('a[href="#/sesion"]')).toHaveCount(0);
  await page.goto("/#/historial");
  await expect(page.locator('a[href="#/sesion"]')).toHaveCount(0);

  // Make today rest from Semana, then require every session surface to agree.
  await page.goto("/#/semana");
  const weekToday = page.locator('[aria-current="date"]');
  await weekToday.getByRole("button", { name: /Editar/ }).click();
  await weekToday.getByRole("button", { name: "Descansar", exact: true }).click();
  await expect(weekToday).toContainText("Descanso");
  await expect(weekToday.locator(".tl-day-row-preview")).toHaveCount(0);

  await page.goto("/#/hoy");
  await expect(page.locator(".exrow")).toHaveCount(0);
  await expect(page.getByText("Descanso").first()).toBeVisible();

  await page.goto("/#/entrenamiento");
  await expect(page.locator(".ent-row")).toHaveCount(0);
  await expect(page.getByText("Día de descanso").first()).toBeVisible();

  await page.goto("/#/sesion");
  await expect(page.locator(".upnext-item")).toHaveCount(0);
  await expect(page.getByText(/No se pudo construir ninguna sesión/)).toBeVisible();
});
