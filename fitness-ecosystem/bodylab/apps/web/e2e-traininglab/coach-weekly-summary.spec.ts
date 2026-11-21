import { expect, test } from "@playwright/test";

test("keeps weekly totals through an optional model summary and a failed request", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
  await page.route(/127\.0\.0\.1:\d+\/v1\/models/, (route) => route.abort());
  let requests = 0;
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "http://127.0.0.1:8080/v1/chat/completions",
    async (route) => {
      requests++;
      if (requests === 3) {
        await route.abort();
        return;
      }
      const delayed = requests === 2;
      if (delayed) await held;
      await route
        .fulfill({
          json: {
            choices: [
              {
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: delayed
                    ? "Texto de la semana anterior."
                    : "Aún no has cerrado sesiones en este periodo.",
                },
              },
            ],
          },
        })
        .catch(() => {});
    },
  );

  await page.goto("/#/hoy");
  for (const name of [
    "Hipertrofia",
    "Siguiente",
    "60 minutos por sesión",
    "Siguiente",
    "Empezar a entrenar",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.goto("/#/semana");
  const card = page.getByRole("region", { name: "Actividad semanal" });
  const generate = card.getByRole("button", {
    name: "Resumir con el coach local",
  });
  await expect(card.getByText("Series de trabajo")).toBeVisible();
  await expect(generate).toHaveCount(0);
  expect(requests).toBe(0);

  await page.goto("/#/ajustes");
  const headings = page
    .locator("summary")
    .filter({ hasText: "Coach local (opcional)" });
  await headings.nth(0).click();
  await headings.nth(1).click();
  await page.getByRole("checkbox", { name: "Activar modelo local" }).check();
  await page.goto("/#/semana");
  try {
    await generate.click();
    await expect(card.getByRole("status")).toContainText(
      "Aún no has cerrado sesiones en este periodo.",
    );
    await expect(card.getByText("Series de trabajo")).toBeVisible();

    await generate.click();
    await expect.poll(() => requests).toBe(2);
    await card.getByRole("button", { name: "Semana anterior" }).click();
    release();
    await expect(card.getByRole("status")).toBeEmpty();

    await generate.click();
    await expect(card.getByRole("status")).toContainText(
      "El resumen del coach no está disponible.",
    );
    await expect(
      card.getByText("Sesiones cerradas", { exact: true }),
    ).toBeVisible();
    await expect(card.getByText("Series de trabajo")).toBeVisible();
    expect(requests).toBe(3);
  } finally {
    release();
  }
});
