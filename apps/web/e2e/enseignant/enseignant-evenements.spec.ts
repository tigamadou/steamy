import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs, readApi } from "../support/session";

// LOT-5 étape 5.7 · Steamy Events de l'enseignant (WT09) et fiche WL23 dans son shell.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

// Jeu D2 : cet événement est déjà proposé à « 4e B · Robotique »
const PROPOSED = "defi-robots-cotonou";

test("WT09 : événements à venir, candidatures de mes élèves en lecture seule, fiche WL23 dans le shell", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
  const events = await readApi<{ results: { slug: string; title: string }[] }>(page, "/api/events/?upcoming=true&pageSize=50");
  expect(events.results.length).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 3 }).filter({ visible: true })).toHaveCount(events.results.length);

  const applications = await readApi<{ count: number }>(page, "/api/classrooms/event-applications/?pageSize=50");
  if (applications.count > 0) {
    await expect(page.getByRole("list", { name: "Candidatures de mes élèves" }).getByRole("listitem")).toHaveCount(applications.count);
  } else {
    await expect(page.getByText("Aucune candidature")).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Accepter|Refuser/ })).toHaveCount(0);
  await axe(page);

  // La fiche publique dans le shell enseignant
  const first = events.results[0];
  await page.getByRole("link", { name: first.title, exact: true }).first().click();
  await expect(page).toHaveURL(`/enseignant/evenements/${first.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
  await expect(page.getByRole("heading", { level: 2, name: first.title })).toBeVisible();
  await expect(page.getByRole("button", { name: /Proposer à une classe/ })).toBeVisible();
  await axe(page);

  await page.goto("/enseignant/evenements/evenement-inconnu");
  await expect(page.getByRole("heading", { level: 2, name: "Cet événement est introuvable" })).toBeVisible();
});

test("WT09 : proposer un événement déjà proposé à la même classe affiche le message du serveur", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto(`/enseignant/evenements/${PROPOSED}`);
  await page.getByRole("button", { name: /Proposer à une classe/ }).click();
  const dialog = page.getByRole("dialog");
  const classes = await readApi<{ results: { id: number; name: string }[] }>(page, "/api/classrooms/");
  const robotics = classes.results.find((classroom) => classroom.name === "4e B · Robotique")!;
  await dialog.getByRole("combobox", { name: /Classe/ }).selectOption(String(robotics.id));
  await dialog.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(dialog.getByText(/déjà/i)).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).toBeHidden();
});

// La proposition notifie les élèves et leurs parents : une seule fois par classe, sur « bureau »
test.describe("proposer à une classe", { tag: "@donnees-uniques" }, () => {
  test("WT09 : proposer à « 3e A · Code » notifie les élèves et leurs parents", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto(`/enseignant/evenements/${PROPOSED}`);
    await page.getByRole("button", { name: /Proposer à une classe/ }).click();
    const dialog = page.getByRole("dialog");
    const classes = await readApi<{ results: { id: number; name: string }[] }>(page, "/api/classrooms/");
    const code = classes.results.find((classroom) => classroom.name === "3e A · Code")!;
    await dialog.getByRole("combobox", { name: /Classe/ }).selectOption(String(code.id));
    await dialog.getByRole("button", { name: "Envoyer la proposition" }).click();
    await expect(dialog.getByRole("status")).toContainText("Les élèves et leurs parents ont été notifiés");
    await dialog.getByRole("button", { name: "Terminer" }).click();
    await expect(dialog).toBeHidden();
  });
});
