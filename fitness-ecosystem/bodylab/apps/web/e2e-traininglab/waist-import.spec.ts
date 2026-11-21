import { expect, test } from "@playwright/test";

test("BodyLab waist requires an explicit landmark and imports once", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 20, 12));
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
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("traininglab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({
        id: "bodylab-private-archive",
        value: {
          data: {
            measurements: [
              {
                id: "old-waist",
                type: "waist",
                method: "manual",
                value: 84,
                unit: "cm",
                timestamp: "2026-11-10T12:00:00",
              },
            ],
          },
        },
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto("/#/progreso");
  const card = page.getByRole("region", { name: "Medir cintura" });
  await card.getByLabel("Registro de BodyLab").selectOption("old-waist");
  await expect(
    card.getByRole("button", { name: "Incorporar medida" }),
  ).toBeDisabled();
  await card.getByLabel("¿Dónde tomaste esta medida?").selectOption("navel");
  await card.getByRole("button", { name: "Incorporar medida" }).click();
  await expect(card.getByText("Medida de BodyLab incorporada.")).toBeVisible();
  await expect(card.getByRole("listitem")).toContainText(["84 cm"]);
  await page.reload();
  await expect(card.getByRole("listitem")).toHaveCount(1);
  await expect(card.getByLabel("Registro de BodyLab")).toHaveCount(0);
});
