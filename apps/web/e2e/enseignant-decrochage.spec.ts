import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs, readApi } from "./support/session";

// LOT-5 étape 5.9 · décrochage (D66) : Sèna (jeu D2) n'a rien fait depuis 10 jours, au-delà du seuil de 7 jours.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("Décrochage : l'élève inactif est signalé dans WT01, WT04 et le lien mène à son profil (WT05)", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant");
  const dashboard = await readApi<{ dropoutCount: number; dropouts: { learner: { id: number; firstName: string }; classroom: { id: number } }[] }>(
    page,
    "/api/classrooms/dashboard/",
  );
  const sena = dashboard.dropouts.find((dropout) => dropout.learner.firstName.startsWith("S"))!;
  expect(sena, "le jeu D2 contient un élève en décrochage").toBeDefined();

  // WT01 : section « Décrochage » avec l'élève et sa classe
  const list = page.getByRole("list", { name: "Élèves en décrochage" });
  await expect(list.getByRole("listitem")).toHaveCount(dashboard.dropouts.length);
  const row = list.getByRole("listitem").filter({ hasText: "Sèna Kpadé" });
  await expect(row).toContainText("3e A · Code");
  await expect(row.getByText("Décrochage")).toBeVisible();
  await axe(page);

  // WT04 : le badge « Décrochage » du serveur sur la ligne de l'élève
  await page.goto(`/enseignant/classes/${sena.classroom.id}`);
  const member = page.getByRole("list", { name: "Élèves de la classe" }).getByRole("listitem").filter({ hasText: "Sèna Kpadé" });
  await expect(member.getByText("Décrochage")).toBeVisible();

  // Lien vers le profil de l'élève (WT05), avec le badge
  await member.getByRole("link", { name: /Sèna Kpadé/ }).click();
  await expect(page).toHaveURL(`/enseignant/eleves/${sena.learner.id}?classe=${sena.classroom.id}`);
  await expect(page.getByText("Décrochage").first()).toBeVisible();
});

// La notification (WT12) vient de la tâche quotidienne `detect_dropouts` (7 h, tâche planifiée) : la planification n'est
// pas jouée par la stack e2e. Si elle a tourné, la notification pointe vers le profil de l'élève.
test("Décrochage : si la tâche quotidienne a tourné, la notification mène au profil de l'élève (WT12)", async ({ page }) => {
  await loginAs(page, "teacher");
  const { results } = await readApi<{ results: { type: string; url: string }[] }>(page, "/api/notifications/?pageSize=50");
  const alert = results.find((notification) => notification.type === "classroom.dropout");
  test.skip(!alert, "La tâche planifiée detect_dropouts n'a pas tourné sur cette stack");
  await page.goto("/enseignant/notifications");
  await page.getByText(/décroche/).first().click();
  await expect(page).toHaveURL(new RegExp(`^${alert!.url.replace("?", "\\?")}$`));
});
