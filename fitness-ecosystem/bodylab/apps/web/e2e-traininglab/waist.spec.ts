import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("registra y corrige medidas comparables, conservando el historial tras recargar", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 20, 12));
  await page.goto("/#/hoy");
  await page.getByRole("button", { name: "Hipertrofia" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "60 minutos por sesión" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Empezar a entrenar" }).click();
  await page.goto("/#/progreso");

  const card = page.getByRole("region", { name: "Medir cintura" });
  await card.getByLabel("Fecha").fill("2026-11-08");
  await card.getByLabel("Perímetro (cm)").fill("84");
  await card.getByRole("button", { name: "Guardar medida" }).click();
  await expect(card.getByRole("status")).toHaveText("Medida guardada.");

  await card.getByLabel("Perímetro (cm)").fill("75,5");
  await card.getByRole("button", { name: "Guardar medida" }).click();
  await expect(card.getByText("Cambio en el periodo · -8,5 cm")).toBeVisible();
  await card
    .getByRole("listitem")
    .filter({ hasText: "2026-11-20" })
    .getByRole("button", { name: "Corregir" })
    .click();
  await card.getByLabel("Perímetro (cm)").fill("82");
  await card.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(card.getByText("Cambio en el periodo · -2 cm")).toBeVisible();

  await page.reload();
  await expect(card.getByRole("listitem")).toHaveCount(2);
  await expect(card.getByText("Cambio en el periodo · -2 cm")).toBeVisible();
  await card.getByLabel("Punto de medición").selectOption("narrowest");
  await expect(
    card.getByText("Sin medidas de este punto en el periodo."),
  ).toBeVisible();

  await page.goto("/#/ajustes");
  await page.getByText("Mis datos", { exact: true }).click();
  const pendingDownload = page.waitForEvent("download");
  await page.getByTestId("export-backup").getByRole("button").click();
  const backup = JSON.parse(
    await readFile(await (await pendingDownload).path(), "utf8"),
  );
  expect(backup.waistMeasurements).toHaveLength(2);
  const rejectedOverwrite = { ...backup.waistMeasurements[0], cm: 100 };
  const imported = {
    id: "waist-fixture",
    day: "2026-11-19",
    cm: 81.5,
    landmark: "navel",
  };
  const input = page.getByTestId("restore-backup").locator("input");
  await input.setInputFiles({
    name: "measurements.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...backup,
        waistMeasurements: [rejectedOverwrite, imported],
      }),
    ),
  });
  await expect(page.getByText(/Copia leída:/)).toBeVisible();
  await page.goto("/#/progreso");
  await expect(card.getByRole("listitem")).toHaveCount(3);
  await expect(card.getByText("81,5 cm", { exact: false })).toBeVisible();
  await expect(card.getByText("100 cm", { exact: false })).toHaveCount(0);
});
