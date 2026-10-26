import { expect, test } from "@playwright/test";

import { expectNoUnhandledCall, signInAs } from "../support/fausse-api";

// Pilote des tests fonctionnels sur fixtures : la demande de paiement du parent, contre la fausse API.

test("chaîne : demande de parcours en attente, rendue par le serveur Next depuis la fixture", async ({ page, context }) => {
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto("/parent/demandes/501");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande de paiement");
  await expect(page.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeVisible();
  await expectNoUnhandledCall(session);
});

test("chaîne : la demande d'une autre famille est introuvable", async ({ page, context }) => {
  const session = await signInAs(context, "autre-famille");
  await page.goto("/parent/demandes/501");
  await expect(page.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
  await expectNoUnhandledCall(session);
});
