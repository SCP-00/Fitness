import { expect, test } from "@playwright/test";

test("shows the validated duration of an applied coach proposal", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
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

  await page.goto("/#/coach");
  await page.getByRole("textbox", { name: /Pega la respuesta/ }).fill(
    JSON.stringify({
      summary: "Sesión de prueba",
      slots: [
        {
          exerciseId: "push-ups",
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSec: 60,
        },
      ],
    }),
  );
  await page.getByRole("button", { name: "Validar y aplicar" }).click();

  await expect(
    page.getByText("Plan del coach aplicado (1 ejercicios)"),
  ).toBeVisible();
  await expect(
    page.getByText("~5,3 min estimados, descansos incluidos."),
  ).toBeVisible();
});
