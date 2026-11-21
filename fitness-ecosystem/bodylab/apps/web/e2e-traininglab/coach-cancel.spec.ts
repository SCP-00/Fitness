import { expect, test } from "@playwright/test";

test("cancels a local coach request and keeps the current plan", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
  await page.route(/127\.0\.0\.1:\d+\/v1\/models/, (route) => route.abort());
  let requests = 0;
  let releaseCommit = () => {};
  const heldCommit = new Promise<void>((resolve) => {
    releaseCommit = resolve;
  });
  await page.route(
    "http://127.0.0.1:8080/v1/chat/completions",
    async (route) => {
      requests += 1;
      if (requests === 1) {
        await route.fulfill({
          json: {
            choices: [
              {
                finish_reason: "stop",
                message: { role: "assistant", content: "Listo." },
              },
            ],
          },
        });
        return;
      }
      await heldCommit;
      await route
        .fulfill({
          json: {
            choices: [
              {
                finish_reason: "tool_calls",
                message: {
                  role: "assistant",
                  tool_calls: [
                    {
                      id: "late",
                      type: "function",
                      function: {
                        name: "propose_session",
                        arguments: '{"slots":[]}',
                      },
                    },
                  ],
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
  const exercises = page.locator(".exrow-name");
  await expect(exercises.first()).toBeVisible();
  const original = await exercises.allTextContents();

  try {
    await page.goto("/#/ajustes");
    const headings = page
      .locator("summary")
      .filter({ hasText: "Coach local (opcional)" });
    await headings.nth(0).click();
    await headings.nth(1).click();
    await page.getByRole("checkbox", { name: "Activar modelo local" }).check();
    const request = page.getByPlaceholder("Hoy tengo 45 min y solo mancuernas…");
    await request.fill("Propón una sesión equilibrada.");
    const ask = page.getByRole("button", {
      name: "Pedir al coach",
      exact: true,
    });
    await ask.click();
    await expect.poll(() => requests).toBe(2);
    await request.press("Enter");
    await page
      .getByRole("button", { name: "Cancelar consulta", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Consulta cancelada. Tu plan sigue disponible." }),
    ).toBeVisible();
    await expect(ask).toBeEnabled();

    releaseCommit();
    await page.goto("/#/hoy");
    await expect(exercises).toHaveText(original);
    expect(requests).toBe(2);
  } finally {
    releaseCommit();
  }
});
