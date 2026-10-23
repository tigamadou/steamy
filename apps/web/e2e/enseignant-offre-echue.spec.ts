import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEMO_PASSWORD } from "./support/demo";
import { loginViaApi, readApi } from "./support/session";

// LOT-5 · offre d'école échue (C21) : l'enseignante du jeu D2 suit sa classe, mais le serveur refuse toute création de
// classe et tout ajout d'élève ; l'interface l'explique et désactive les actions sans les cacher.

const ECHUE = "esther.offre-echue@steamy.test";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("WT03, WT04, WT06 : offre échue, suivi ouvert, création et ajout bloqués et expliqués", async ({ page }) => {
  await loginViaApi(page, ECHUE, DEMO_PASSWORD);
  await page.goto("/enseignant/classes");
  const school = await readApi<{ offerExpired: boolean; classroomsLeft: number }>(page, "/api/classrooms/school/");
  expect(school.offerExpired).toBe(true);

  // WT03 : la classe reste listée et suivie ; « Créer une classe » est désactivé et le quota dit pourquoi
  const list = page.getByRole("list", { name: "Mes classes" });
  await expect(list.getByRole("link", { name: /6e A · Robotique/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer une classe" })).toHaveCount(0);
  const create = page.getByRole("button", { name: "Créer une classe" });
  await expect(create).toBeDisabled();
  await expect(page.getByText(/L'offre de votre établissement est échue : la création de classes est bloquée/)).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Quota de l'offre" })).toContainText("Échue depuis le 31 décembre 2025");
  await axe(page);

  // WT13 : le formulaire explique le blocage, « Créer la classe » est désactivé
  await page.goto("/enseignant/classes/nouvelle");
  await expect(page.getByText(/L'offre de votre établissement est échue : impossible de créer une nouvelle classe/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer la classe" })).toBeDisabled();

  // WT04 : le suivi reste ouvert, l'ajout d'élèves est désactivé avec son explication
  await page.goto("/enseignant/classes");
  await list.getByRole("link", { name: /6e A · Robotique/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "6e A · Robotique" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ajouter des élèves" })).toHaveCount(0);
  const add = page.getByRole("button", { name: "Ajouter des élèves" }).first();
  await expect(add).toBeDisabled();
  await expect(add).toHaveAccessibleDescription(/offre de votre établissement est échue/);
  await axe(page);

  // WT06 : les deux onglets l'annoncent et désactivent l'envoi
  const classId = new URL(page.url()).pathname.split("/").pop();
  await page.goto(`/enseignant/eleves/ajouter?classe=${classId}`);
  await expect(page.getByText(/L'offre de votre établissement est échue : l'ajout d'élèves est bloqué/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer la demande" })).toBeDisabled();
  await page.goto(`/enseignant/eleves/ajouter?classe=${classId}&onglet=lot`);
  await expect(page.getByText(/L'offre de votre établissement est échue : l'ajout d'élèves est bloqué/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Importer et envoyer les demandes" })).toBeDisabled();
});
