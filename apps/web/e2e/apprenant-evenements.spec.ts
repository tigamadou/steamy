import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/session";
import { createLearner } from "./support/signup";

// LOT-3 étape 3.8 · Steamy Events côté apprenant : WD10, WL23 dans le shell, WD11. Parcours P6 sur un apprenant
// neuf (créé à chaque passage : rejouable, sans toucher aux candidatures des comptes de démo). Jeu D2 :
// « Atelier Électronique débutant » gratuit et ouvert, « Hackathon IA junior » complet.

const OPEN_EVENT = { slug: "atelier-electronique", title: "Atelier Électronique débutant" };
const FULL_EVENT = { slug: "hackathon-ia", title: "Hackathon IA junior" };

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Carte d'un événement de « Événements à venir » (WD10). */
function eventCard(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Événements à venir" })
    .getByRole("article")
    .filter({ visible: true })
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

test("P6 : WD10 → WL23 → WD11 → WD10 « En attente de ton parent » ; second envoi refusé", async ({ page, context }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);

  // WD10 : événements à venir avec leur prix, aucune candidature
  await page.goto("/apprenant/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
  await expect(eventCard(page, OPEN_EVENT.title).getByText("Gratuit")).toBeVisible();
  await expect(eventCard(page, FULL_EVENT.title).getByText("Complet")).toBeVisible();
  await expect(page.getByText("Pas encore de candidature").filter({ visible: true })).toBeVisible();
  await axe(page);

  // Seconde page ouverte sur WD11 avant l'envoi : elle servira à tenter un second envoi
  const second = await context.newPage();
  await second.goto(`/apprenant/evenements/${OPEN_EVENT.slug}/candidature`);
  await expect(second.getByRole("button", { name: "Envoyer ma candidature" })).toBeVisible();

  // WL23 dans le shell : fiche du lot 1, titre en h2 sous le h1 du header
  await eventCard(page, OPEN_EVENT.title).getByRole("link", { name: OPEN_EVENT.title, exact: true }).click();
  await expect(page).toHaveURL(`/apprenant/evenements/${OPEN_EVENT.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
  await expect(page.getByRole("heading", { level: 2, name: OPEN_EVENT.title })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Demander à participer" }).click();

  // WD11 : motivation obligatoire, expérience (jamais « niveau »), accord du parent
  await expect(page).toHaveURL(`/apprenant/evenements/${OPEN_EVENT.slug}/candidature`);
  await expect(page.getByText("Ta candidature sera envoyée à ton parent pour accord.")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Dis-nous pourquoi tu veux participer." })).toBeVisible();
  await page.getByRole("textbox", { name: /Pourquoi veux-tu participer/ }).fill("Je veux construire mon premier circuit.");
  await page.getByRole("combobox", { name: "Ton expérience en robotique" }).selectOption({ label: "Débutant" });
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();

  // Retour à WD10 : candidature « En attente de ton parent », plus de « Participer » sur cet événement
  await expect(page).toHaveURL("/apprenant/evenements?candidature=envoyee");
  await expect(page.getByText("Ta candidature est envoyée à ton parent.")).toBeVisible();
  const mine = page.getByRole("list", { name: "Tes candidatures" });
  await expect(mine.getByRole("listitem")).toHaveCount(1);
  await expect(mine).toContainText(OPEN_EVENT.title);
  await expect(mine).toContainText("En attente de ton parent");
  const card = eventCard(page, OPEN_EVENT.title);
  await expect(card.getByText("En attente de ton parent")).toBeVisible();
  await expect(card.getByRole("link", { name: /Participer/ })).toHaveCount(0);

  // Second envoi depuis la page ouverte avant : refusé par l'API (`ALREADY_APPLIED`)
  await second.getByRole("textbox", { name: /Pourquoi veux-tu participer/ }).fill("Encore une fois.");
  await second.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(second.getByRole("alert").filter({ hasText: "déjà une candidature en cours" })).toBeVisible();
  await expect(second.getByRole("button", { name: "Envoyer ma candidature" })).toHaveCount(0);
  await second.close();

  // WD11 rouvert : le statut remplace le formulaire
  await page.goto(`/apprenant/evenements/${OPEN_EVENT.slug}/candidature`);
  await expect(page.getByText(/Tu as déjà candidaté à cet événement/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer ma candidature" })).toHaveCount(0);
});

test("WL23 : événement complet, CTA désactivé avec son motif ; WD11 inaccessible", async ({ page }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto(`/apprenant/evenements/${FULL_EVENT.slug}`);
  await expect(page.getByRole("heading", { level: 2, name: FULL_EVENT.title })).toBeVisible();
  await expect(page.getByRole("button", { name: "Complet" })).toBeDisabled();
  await expect(page.getByText("Toutes les places sont prises.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander à participer" })).toHaveCount(0);

  await page.goto(`/apprenant/evenements/${FULL_EVENT.slug}/candidature`);
  await expect(page.getByText("Toutes les places sont prises.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer ma candidature" })).toHaveCount(0);

  await page.goto("/apprenant/evenements/evenement-inconnu");
  await expect(page.getByRole("heading", { level: 2, name: "Cet événement est introuvable" })).toBeVisible();
});

test("WD01 : le raccourci Steamy Events mène à WD10", async ({ page }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto("/apprenant");
  await page.getByRole("navigation", { name: "Raccourcis" }).getByRole("link", { name: /Steamy Events/ }).click();
  await expect(page).toHaveURL("/apprenant/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
});
