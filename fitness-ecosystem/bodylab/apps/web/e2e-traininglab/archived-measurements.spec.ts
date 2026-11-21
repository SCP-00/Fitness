import { expect, test } from "@playwright/test";

test("BodyLab measurements show the selected profile and only compare weight with matching units and method", async ({
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
    const common = {
      profileId: "a",
      type: "weight",
      unit: "kg",
      method: "manual",
      confidence: "high",
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({
        id: "bodylab-private-archive",
        value: {
          data: {
            measurements: [
              {
                ...common,
                id: "w1",
                value: 80,
                timestamp: "2026-11-01T12:00:00",
              },
              {
                ...common,
                id: "w2",
                value: 78,
                timestamp: "2026-11-20T12:00:00",
              },
              {
                ...common,
                id: "w3",
                value: 100,
                method: "scan",
                timestamp: "2026-11-10T12:00:00",
              },
              {
                ...common,
                id: "arm",
                type: "biceps_left",
                value: 34,
                unit: "cm",
                timestamp: "2026-11-19T12:00:00",
              },
              {
                ...common,
                id: "other",
                profileId: "b",
                value: 90,
                timestamp: "2026-11-20T12:00:00",
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
  const card = page.getByRole("region", { name: "Medidas de BodyLab" });
  await card.getByLabel("Perfil original").selectOption("a");
  await expect(
    card.getByText("Cambio de peso · -2 kg · 2026-11-01 → 2026-11-20"),
  ).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(3);
  await card.getByLabel("Medida", { exact: true }).selectOption("biceps_left");
  await expect(
    card.getByText(/no identifica el punto anatómico/),
  ).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(1);
  await card.getByLabel("Perfil original").selectOption("b");
  await expect(card.getByRole("listitem")).toHaveCount(1);
  await expect(card.getByRole("listitem").first()).toContainText("90 kg");
  await expect(card.getByText(/Cambio de peso/)).toHaveCount(0);
});
