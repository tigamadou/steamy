import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs, readApi } from "../support/session";

// LOT-5 étape 5.6 · parcours encadrés (WT02), détail (WT10) et mission en lecture seule.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type Page_<T> = { results: T[] };
type Course = { slug: string; title: string; classroomCount: number; learnerCount: number };

test("WT02 : Koffi ne voit que les parcours de ses classes, avec les effectifs de l'API", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/parcours");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes parcours encadrés");
  const { results } = await readApi<Page_<Course>>(page, "/api/classrooms/courses/");
  expect(results.length).toBeGreaterThan(0);

  const list = page.getByRole("list", { name: "Mes parcours encadrés" });
  await expect(list.getByRole("listitem")).toHaveCount(results.length);
  for (const course of results) {
    const card = list.getByRole("article").filter({ has: page.getByRole("link", { name: course.title, exact: true }) });
    await expect(card).toContainText(`${course.classroomCount} classe`);
    await expect(card.getByRole("link", { name: course.title, exact: true })).toHaveAttribute(
      "href",
      `/enseignant/parcours/${course.slug}`,
    );
  }
  await axe(page);
});

test("WT10 : arbre du parcours avec compteurs, panneau de suivi, mission en lecture seule", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/parcours");
  const { results } = await readApi<Page_<Course>>(page, "/api/classrooms/courses/");
  const course = results[0];
  await page.getByRole("list", { name: "Mes parcours encadrés" }).getByRole("link", { name: course.title, exact: true }).click();
  await expect(page).toHaveURL(`/enseignant/parcours/${course.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Parcours encadré");
  await expect(page.getByRole("heading", { level: 2, name: course.title })).toBeVisible();

  const detail = await readApi<{
    classrooms: { name: string }[];
    projects: { levels: { missions: { id: number; completedCount: number }[] }[] }[];
  }>(page, `/api/classrooms/courses/${course.slug}/`);
  const missions = detail.projects.flatMap((project) => project.levels.flatMap((level) => level.missions));
  const links = page.getByRole("link", { name: /^Mission \d+/ }).filter({ visible: true });
  await expect(links).toHaveCount(missions.length);
  await expect(links.first()).toHaveAttribute("href", `/enseignant/parcours/${course.slug}/missions/${missions[0].id}`);
  await expect(links.first()).toContainText(/élève/);

  const panel = page.getByRole("complementary", { name: "Suivi du parcours" });
  for (const classroom of detail.classrooms) {
    await expect(panel.getByRole("progressbar", { name: `Progression : ${classroom.name}` })).toBeVisible();
  }
  await expect(panel.getByRole("region", { name: "Taux de réussite" })).toBeVisible();
  await axe(page);

  // Mission : contenu en lecture seule, ni bouton de progression ni quiz
  await links.first().click();
  await expect(page).toHaveURL(new RegExp(`/enseignant/parcours/${course.slug}/missions/${missions[0].id}$`));
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Marquer comme terminée/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Retour au parcours" })).toHaveAttribute(
    "href",
    `/enseignant/parcours/${course.slug}`,
  );
  await axe(page);
});

test("WT10 : un parcours que Koffi n'encadre pas est introuvable (page « introuvable », jamais « interdit »)", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/parcours");
  const supervised = (await readApi<Page_<Course>>(page, "/api/classrooms/courses/")).results.map((c) => c.slug);
  const catalog = await readApi<Page_<{ slug: string }>>(page, "/api/catalog/courses/?pageSize=50");
  const other = catalog.results.find((course) => !supervised.includes(course.slug));
  expect(other, "le jeu D2 contient un parcours hors de l'offre de l'école").toBeDefined();

  await page.goto(`/enseignant/parcours/${other!.slug}`);
  await expect(page.getByRole("heading", { level: 2, name: "Ce contenu est introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Voir mes parcours" }).click();
  await expect(page).toHaveURL("/enseignant/parcours");
});
