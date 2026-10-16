import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { decideConsent, uniquePhone } from "./support/api";
import { DEMO } from "./support/demo";
import { loginAs, openShellMenu } from "./support/session";
import { completeLearnerProfile, sendConsentRequest, startLearnerSignup } from "./support/signup";

// LOT-3 étape 3.1 · accueil (WD01-WD03), notifications (WD04-WD06) et aide (WD12) de l'apprenant.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

const bell = (page: Page) => page.getByRole("link", { name: /notifications? non lues?|aucune non lue/ });

test("WD01 : Léa reprend son parcours, voit ses statistiques et ses raccourcis", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Salut ${DEMO.learner.firstName} 👋`);
  const resume = page.getByRole("region", { name: "Découverte de la robotique" });
  await expect(resume.getByRole("progressbar")).toBeVisible();
  await expect(resume.getByRole("link", { name: "Continuer la mission" })).toHaveAttribute(
    "href",
    /^\/apprenant\/parcours\/decouverte-robotique\/missions\/\d+$/,
  );
  // Pastilles : streak toujours ; points et rang tels que l'API les renvoie (barème du jeu de démo, C8)
  const stats = page.getByRole("region", { name: "Tes statistiques" });
  await expect(stats.getByRole("term")).toHaveText(["Streak", "Points", "Rang"]);
  const shortcuts = page.getByRole("navigation", { name: "Raccourcis" });
  await expect(shortcuts.getByRole("link")).toHaveText([/Catalogue/, /Mes souhaits/, /Mes quiz/]);
  await expect(page.getByText("Steamy Events")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /Pour toi/ }).getByRole("article").first()).toBeVisible();
  await axe(page);
});

test("WD03 : le squelette de l'accueil s'affiche pendant la lecture du tableau de bord", async ({ page }) => {
  await loginAs(page, "learner");
  // Données de l'accueil retardées (préchargement compris : le lien « Accueil » est visible dès le chargement sur
  // bureau) : le squelette (loading.tsx) reste visible le temps de la lecture
  await page.route(
    (url) => url.pathname === "/apprenant",
    async (route) => {
      const headers = route.request().headers();
      // Préchargement retenu plus longtemps : il est encore en cours au moment du clic
      const delay = headers["next-router-prefetch"] ? 5000 : headers["rsc"] ? 1500 : 0;
      await new Promise((resolve) => setTimeout(resolve, delay));
      await route.continue();
    },
  );
  await page.goto("/apprenant/aide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aide & Support");
  await openShellMenu(page);
  await page.getByRole("navigation", { name: "Navigation de ton espace" }).getByRole("link", { name: "Accueil" }).click();
  await expect(page.getByRole("status", { name: "Chargement de ton tableau de bord…" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tes statistiques" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Chargement de ton tableau de bord…" })).toHaveCount(0);
});

test("WD04 : un clic sur une notification la marque lue et ouvre sa cible", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/notifications");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notifications");
  const tabs = page.getByRole("navigation", { name: "Filtrer les notifications" });
  await expect(tabs.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
  await axe(page);

  await tabs.getByRole("link", { name: /^Non lues \(\d+\)$/ }).click();
  await expect(page).toHaveURL("/apprenant/notifications?onglet=non-lues");

  await page.goto("/apprenant/notifications");
  const item = page.getByRole("button", { name: /Un parcours pour toi/ });
  // Un clic avant l'hydratation est perdu : réessayé jusqu'à la navigation
  await expect(async () => {
    await item.click();
    await expect(page).toHaveURL("/apprenant/catalogue", { timeout: 2_000 });
  }).toPass();
});

test("WD04 : « Tout marquer comme lu » met le compteur du shell à 0", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/notifications");
  const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
  // Rejouable : le jeu de démo est partagé (projets « bureau » et « mobile ») ; sans non-lue, le bouton est inactif
  if (await markAll.isEnabled()) {
    await expect(async () => {
      if (await markAll.isEnabled()) await markAll.click();
      await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue", { timeout: 2_000 });
    }).toPass();
  }
  await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
  await expect(page.getByRole("link", { name: "Non lues (0)" })).toBeVisible();
  await expect(markAll).toBeDisabled();
  await page.reload();
  await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
  await expect(page.getByText(/^Non lue :/)).toHaveCount(0);
});

test("WD02, WD05, WD06 : un nouvel apprenant découvre son accueil, ses notifications vides et ses préférences", async ({
  page,
}) => {
  await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: true });
  await page.goto("/inscription/apprenant/mot-de-passe");
  await completeLearnerProfile(page, "Robot2026x");

  await page.goto("/apprenant");
  await expect(page.getByRole("heading", { level: 2, name: "Bienvenue Awa !" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorer le catalogue" })).toHaveAttribute(
    "href",
    "/apprenant/catalogue?prix=gratuit",
  );
  const suggestions = page.getByRole("region", { name: /Suggestions pour bien démarrer/ });
  // Au plus trois parcours, tous gratuits (D27)
  await expect(suggestions.getByRole("article").first()).toBeVisible();
  const cards = await suggestions.getByRole("article").count();
  expect(cards).toBeLessThanOrEqual(3);
  await expect(suggestions.getByText("Gratuit", { exact: true })).toHaveCount(cards);
  await expect(page.getByRole("region", { name: "Tes statistiques" })).toHaveCount(0);
  await axe(page);

  await page.goto("/apprenant/notifications");
  await expect(page.getByRole("heading", { level: 2, name: "Tout est calme par ici" })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Régler les notifications" }).click();

  await expect(page).toHaveURL("/apprenant/notifications/preferences");
  await expect(page.getByRole("switch", { name: "Dans l'application" })).toBeDisabled();
  // Sans adresse email, les envois par email ne se règlent pas (WD06) ; ni SMS ni push (D30, C12)
  const email = page.getByRole("switch", { name: /par email$/ });
  await expect(email).toHaveCount(5);
  for (const toggle of await email.all()) await expect(toggle).toBeDisabled();
  await expect(page.getByText("Aucune adresse", { exact: true })).toBeVisible();
  await expect(page.getByText(/SMS|Push/)).toHaveCount(0);
  await axe(page);
});

test("WD12 : l'aide filtre la FAQ et renvoie vers le formulaire de contact", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/aide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aide & Support");
  await axe(page);
  const search = page.getByRole("searchbox", { name: "Rechercher une question" });
  await expect(async () => {
    await search.fill("kit code");
    await expect(page.getByText("J'ai oublié mon mot de passe")).toHaveCount(0, { timeout: 1_000 });
  }).toPass();
  await expect(page.getByText("Où trouver mon Kit Code ?")).toBeVisible();
  await page.getByRole("link", { name: "Contacter le support" }).click();
  await expect(page).toHaveURL("/aide#contact");
});
