import { test, expect, type Page } from "@playwright/test";

/**
 * TrainingLab against the people who actually open it.
 *
 * Every other spec answers "does this feature work". These answer "does the
 * product hold for the way a person uses it", which is why each test is a whole
 * journey with its own rhythm rather than a click per control:
 *
 *   · estándar          — viene a registrar y cerrar. Nada más.
 *   · máximo provecho   — exprime el día: calentamiento, dos ejercicios, cierre.
 *   · curioso           — mira todo, no registra nada. No debe romperse mirando.
 *   · power user        — teclado y reordenar; el ratón no es su herramienta.
 *   · necesidades       — movimiento reducido, nombres accesibles, idioma.
 *
 * All five also fail on any uncaught page error: a persona that hits a blank
 * screen or a thrown exception is the bug, even when the assertions pass.
 */

const pageErrors: string[] = [];

function watch(page: Page): void {
  page.on("pageerror", (error) => pageErrors.push(String(error)));
}

test.beforeEach(() => {
  pageErrors.length = 0;
});

test.afterEach(() => {
  expect(pageErrors, "sin excepciones de página en el recorrido").toEqual([]);
});

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
    await warmup.evaluate((button: HTMLButtonElement) => button.click());
  }
  await expect(page.locator('[data-testid="log-set"]')).toBeVisible();
}

async function startSession(page: Page): Promise<void> {
  await page.goto("/#/sesion");
  await expect(page.getByRole("button", { name: "Salir de ZEN" })).toBeVisible();
  await passWarmup(page);
}

async function logSet(page: Page): Promise<void> {
  await page.locator('[data-testid="log-set"]').click();
}

test("estándar: registra la sesión del día, la cierra y la ve en Historial", async ({
  page,
}) => {
  watch(page);
  await finishOnboarding(page);

  // Llega, empieza, apunta tres series y se va. Sin explorar nada.
  await startSession(page);
  await logSet(page);
  await logSet(page);
  await logSet(page);
  await expect(page.getByText(/3 \/ \d+ series/).first()).toBeVisible();

  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page).toHaveURL(/#\/resumen/);

  await page.goto("/#/historial");
  await expect(page.getByText(/1 sesi/).first()).toBeVisible();
  await expect(page.getByText(/^3 series de trabajo/).first()).toBeVisible();
});

test("máximo provecho: calentamiento, dos ejercicios y cierre completo", async ({
  page,
}) => {
  watch(page);
  await finishOnboarding(page);

  await startSession(page);
  await logSet(page);
  await logSet(page);
  await logSet(page);

  // El primer ejercicio queda cerrado; sigue con el siguiente de la cola.
  await page.getByRole("button", { name: /Remo bajo Mesa/ }).first().click();
  await passWarmup(page);
  await logSet(page);
  await expect(page.getByText(/4 \/ \d+ series/).first()).toBeVisible();

  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page).toHaveURL(/#\/resumen/);

  // El trabajo queda contado donde importa: Historial y Progreso.
  await page.goto("/#/historial");
  await expect(page.getByText(/^4 series de trabajo/).first()).toBeVisible();
  await page.goto("/#/progreso");
  await expect(page.locator(".tl-ring strong").first()).toBeVisible();
  await expect(page.locator(".tl-ring strong").first()).toHaveText(/%/);
});

test("curioso: recorre las once superficies sin registrar nada", async ({
  page,
}) => {
  watch(page);
  await finishOnboarding(page);

  const destinations = [
    "#/hoy",
    "#/entrenamiento",
    "#/historial",
    "#/progreso",
    "#/ejercicios",
    "#/semana",
    "#/rutinas",
    "#/coach",
    "#/ajustes",
    "#/resumen",
    "#/sesion",
  ];
  for (const hash of destinations) {
    await page.goto(`/${hash}`);
    const marker =
      hash === "#/sesion"
        ? page.getByRole("button", { name: "Salir de ZEN" })
        : page.locator(".content");
    await expect(marker, `la ruta ${hash} dibuja su shell`).toBeVisible();
  }

  // Mirar no escribe: después de todo el recorrido sigue sin sesiones.
  await page.goto("/#/historial");
  await expect(page.getByText(/0 sesi|sin sesiones|aún no/i).first()).toBeVisible();
});

test("power user: reordena la semana con el teclado, no con el ratón", async ({
  page,
}) => {
  watch(page);
  await finishOnboarding(page);

  await page.goto("/#/semana");
  await expect(page.locator('[data-testid="week-drag-0"]')).toBeVisible();
  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".tl-day-row-head .tabular-nums")).map(
      (node) => node.textContent?.trim() ?? "",
    ),
  );
  expect(before[0]).not.toEqual("Descanso");
  expect(before[1]).toEqual("Descanso");

  // ArrowLeft en el segundo día: mueve la sesión del día anterior aquí, dejando el origen en descanso.
  const grip = page.locator('[data-testid="week-drag-1"]');
  await grip.focus();
  await grip.press("ArrowLeft");

  const after = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".tl-day-row-head .tabular-nums")).map(
      (node) => node.textContent?.trim() ?? "",
    ),
  );
  expect(after[0]).toEqual("Descanso");
  expect(after[1]).not.toEqual("Descanso");
});

test("necesidades distintas: movimiento reducido, nombres accesibles e idioma", async ({
  page,
}) => {
  watch(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finishOnboarding(page);
  await page.goto("/#/hoy");

  // Quien pide menos movimiento no debe recibir transiciones ni animaciones.
  const motion = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("button, a, .card"));
    const worst = { transition: 0, animation: 0 };
    for (const element of elements) {
      const style = getComputedStyle(element);
      for (const value of style.transitionDuration.split(",")) {
        worst.transition = Math.max(worst.transition, parseFloat(value) || 0);
      }
      for (const value of style.animationDuration.split(",")) {
        worst.animation = Math.max(worst.animation, parseFloat(value) || 0);
      }
    }
    return worst;
  });
  expect(motion.transition).toBeLessThan(0.05);
  expect(motion.animation).toBeLessThan(0.05);

  // Nada interactivo sin nombre para un lector de pantalla.
  const unnamed = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button, a[href], [role=button]")).filter(
      (element) =>
        !(
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent?.trim()
        ),
    ).length,
  );
  expect(unnamed).toBe(0);

  // El documento declara el idioma que está escrito: es lo que decide la
  // pronunciación del lector de pantalla.
  await expect(page.locator("html")).toHaveAttribute("lang", /^(es|en)$/);
});
