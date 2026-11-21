import { expect, test } from "@playwright/test";
import JSZip from "jszip";

test("opens historic BodyLab archives and keeps a v1 link after reload", async ({
  page,
}) => {
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

  await page.goto("/#/ajustes");
  const input = page.getByTestId("bodylab-migration-file");
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({ format: "bodylab" }));
  zip.file("measurements.json", JSON.stringify([{ id: "legacy-waist" }]));
  await input.setInputFiles({
    name: "legacy.bodylab",
    mimeType: "application/zip",
    buffer: await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    }),
  });
  await expect(
    page.getByText(/Esta copia no incluye.*Series.*Esfuerzos máximos/),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: "Medidas 1 0 0" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar copia privada" }).click();
  await expect(page.getByText("Copia privada guardada.")).toBeVisible();

  await input.setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "bodylab",
        data: { measurements: [{ id: "legacy-waist" }] },
      }),
    ),
  });
  await expect(page.getByRole("row", { name: "Medidas 0 1 0" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();

  const link = {
    format: "bodylab-traininglab-link",
    version: 1,
    profile: {
      height: 178,
      weight: 82,
      age: 30,
      biologicalSex: "male",
      units: "metric",
    },
    exerciseCatalog: [
      {
        id: "barbell-squat",
        name: "Barbell Back Squat",
        equipment: "Barbell + Squat Rack",
        muscles: [{ muscle: "quadriceps", intensity: 3 }],
      },
    ],
    measurements: [],
    muscleScores: [],
    muscleLoad: [],
  };
  await input
    .locator("xpath=ancestor::details")
    .locator('input[accept="application/json,.json"]')
    .setInputFiles({
      name: "link-v1.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(link)),
    });
  await expect(page.getByText(/178 cm.*82 kg/)).toBeAttached();
  await page.reload();
  await expect(page.getByText(/178 cm.*82 kg/)).toBeAttached();
  await page.goto("/#/hoy");
  await expect(
    page.getByRole("heading", { name: "Ejercicios de la sesión" }),
  ).toBeVisible();
});
