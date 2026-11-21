import { expect, test } from "@playwright/test";

test("importa series de BodyLab sin duplicar el historial", async ({ page }) => {
  await page.goto("/#/hoy");
  for (const name of ["Hipertrofia", "Siguiente", "60 minutos por sesión", "Siguiente", "Empezar a entrenar"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("traininglab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["sets", "sessions"], "readwrite");
      tx.objectStore("sets").add({ id: "existing-set", exerciseId: "barbell-bench-press", timestamp: "2026-10-01T12:00:00Z", dayId: "day-existing", weight: 40, reps: 10 });
      tx.objectStore("sessions").add({ id: "existing-session", dayId: "day-existing", startedAt: "2026-10-01T12:00:00Z", completedAt: "2026-10-01T12:01:00Z", setIds: ["existing-set"], title: "Sesión existente" });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.goto("/#/ajustes");
  const archive = {
    format: "bodylab-traininglab-migration",
    version: 1,
    exportedAt: "2026-11-20T12:00:00Z",
    data: {
      profiles: [], measurements: [], snapshots: [],
      exerciseSets: [{ id: "fixture", exerciseId: "barbell-bench-press", timestamp: "2026-10-10T12:00:00Z", weight: 50, reps: 8 }],
      maxEfforts: [], metadata: [], localPreferences: [],
    },
  };
  await page.getByTestId("bodylab-migration-file").setInputFiles({
    name: "bodylab.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(archive)),
  });
  await expect(page.getByRole("table", { name: "Revisión de la copia" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar copia privada" }).click();
  await expect(page.getByText("Copia privada guardada.")).toBeVisible();

  await page.getByRole("button", { name: "Revisar series de BodyLab" }).click();
  await expect(page.getByText(/1 listas para importar/)).toBeVisible();
  await page.getByRole("button", { name: "Importar series revisadas" }).click();
  await expect(page.getByText("Importadas 1 series de BodyLab.")).toBeVisible();
  await page.getByRole("button", { name: "Revisar series de BodyLab" }).click();
  await expect(page.getByText(/0 listas para importar · 1 ya importadas/)).toBeVisible();
  await page.goto("/#/historial");
  await expect(page.getByText("BodyLab", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sesión existente", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("BodyLab", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sesión existente", { exact: true })).toBeVisible();
});
