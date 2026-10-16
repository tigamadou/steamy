import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { apiSession } from "./support/api";
import { DEMO, DEMO_PASSWORD } from "./support/demo";
import { loginAs } from "./support/session";

// LOT-3 étape 3.3a · Mes parcours (WD23), arbre (WC06a/b), projet (WJ01), niveau (WJ02), mission (WJ03).
// Jeu D2 : Léa suit « Découverte de la robotique » (en cours) et a terminé « Initiation à Scratch ».

const COURSE = "decouverte-robotique";

type TreeMission = { id: number; title: string; state: string };
type Tree = {
  next: { type: string; id: number | null; title: string | null };
  projects: Array<{ id: number; title: string; levels: Array<{ id: number; title: string; missions: TreeMission[] }> }>;
};

/** Arbre du parcours de Léa, lu dans l'API (identifiants, missions verrouillées). */
async function learnerTree(): Promise<Tree> {
  const session = await apiSession();
  await session.post("/api/auth/login/", { identifier: DEMO.learner.identifier, password: DEMO_PASSWORD });
  const tree = (await session.get(`/api/learning/enrollments/${COURSE}/tree/`)) as Tree;
  await session.api.dispose();
  return tree;
}

/** Vidéos : `player.vimeo.com` servi par une page factice (ni réseau, ni domaine autorisé, ADR 0004). */
async function fakeVimeo(page: Page) {
  await page.route("https://player.vimeo.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Vidéo factice</title><p>Vidéo</p>" }),
  );
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("WD23 : parcours en cours et terminés, onglets adressables", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/parcours");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes parcours");
  const current = page.getByRole("link", { name: /En cours \(\d+\)/ });
  await expect(current).toHaveAttribute("aria-current", "page");
  const card = page.getByRole("article").filter({ hasText: "Découverte de la robotique" });
  await expect(card.getByRole("progressbar")).toBeVisible();
  await expect(card.getByRole("link", { name: /Continuer/ })).toHaveAttribute("href", /\/apprenant\/parcours\/decouverte-robotique\//);
  await axe(page);

  await page.getByRole("link", { name: /Terminés \(\d+\)/ }).click();
  await expect(page).toHaveURL("/apprenant/parcours?onglet=termines");
  const done = page.getByRole("article").filter({ hasText: "Initiation à Scratch" });
  await expect(done.getByText(/Terminé · 100 %/)).toBeVisible();
  await expect(done.getByRole("link", { name: "Voir ma certification ›" })).toBeVisible();
  await axe(page);
});

test("WC06a/WC06b : l'arbre se déplie par l'URL, une étape verrouillée n'est pas un lien", async ({ page }) => {
  const tree = await learnerTree();
  const [first, second] = tree.projects;
  await loginAs(page, "learner");
  await page.goto("/apprenant/parcours");
  await page.getByRole("link", { name: "Découverte de la robotique", exact: true }).click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}`);
  await expect(page.getByRole("navigation", { name: "Fil d'Ariane" })).toContainText("Mes parcours");
  await expect(page.getByRole("heading", { level: 2, name: "Découverte de la robotique" })).toBeVisible();
  await expect(page.getByRole("link", { name: second.title })).toHaveCount(0);

  await page.getByRole("link", { name: new RegExp(first.title) }).click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}?projet=${first.id}`);
  await expect(page.getByRole("link", { name: new RegExp(first.title) })).toHaveAttribute("aria-expanded", "true");
  const next = page.getByRole("link", { name: new RegExp(tree.next.title ?? "") }).filter({ has: page.locator("[aria-hidden]") });
  await expect(next.first()).toHaveAttribute("aria-current", "step");
  await axe(page);
});

test("WJ01 → WJ02 → WJ03 : du projet à la mission, vidéo factice", async ({ page }) => {
  const tree = await learnerTree();
  const project = tree.projects[0];
  const level = project.levels[0];
  await fakeVimeo(page);
  await loginAs(page, "learner");

  await page.goto(`/apprenant/parcours/${COURSE}/projets/${project.id}`);
  await expect(page.getByRole("heading", { level: 2, name: project.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Les niveaux de ce projet" })).toBeVisible();
  await axe(page);

  await page.getByRole("link", { name: new RegExp(level.title) }).first().click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}/niveaux/${level.id}`);
  await expect(page.getByRole("heading", { name: "Au programme de ce niveau" })).toBeVisible();
  await axe(page);

  const mission = level.missions[0];
  await page.getByRole("link", { name: new RegExp(mission.title) }).first().click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}/missions/${mission.id}`);
  await expect(page.getByRole("heading", { level: 2, name: mission.title })).toBeVisible();
  await expect(page.getByText("✓ Mission terminée")).toBeVisible();
  await axe(page);

  // Aucun contact avec Vimeo avant le clic sur la vignette ; puis le lecteur (factice) se charge
  await expect(page.locator('iframe[src^="https://player.vimeo.com/"]')).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp(`Lire la vidéo : ${mission.title}`) }).click();
  await expect(page.locator(`iframe[title="${mission.title}"]`)).toHaveAttribute("src", /player\.vimeo\.com\/video\/\d+\?.*dnt=1/);
});

test("accès direct à une mission verrouillée → « Ce contenu n'est pas encore ouvert »", async ({ page }) => {
  const tree = await learnerTree();
  const locked = tree.projects.flatMap((p) => p.levels).flatMap((l) => l.missions).find((m) => m.state === "locked");
  expect(locked, "mission verrouillée dans le jeu D2").toBeDefined();
  await loginAs(page, "learner");
  await page.goto(`/apprenant/parcours/${COURSE}/missions/${locked!.id}`);
  await expect(page.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeVisible();
  await expect(page.getByText(locked!.title)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Marquer comme terminée/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Voir mon parcours/ }).click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}`);
});

test("WJ03 : « Marquer comme terminée » mène à l'étape renvoyée par l'API @donnees-uniques", async ({ page }) => {
  const tree = await learnerTree();
  expect(tree.next.type).toBe("mission");
  await fakeVimeo(page);
  await loginAs(page, "learner");
  const mission = `/apprenant/parcours/${COURSE}/missions/${tree.next.id}`;
  await page.goto(mission);
  await page.getByRole("button", { name: /Marquer comme terminée/ }).click();
  await expect(page).not.toHaveURL(mission);
  await expect(page).toHaveURL(new RegExp(`/apprenant/parcours/${COURSE}/(missions|quiz)/\\d+$`));
});
