import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { decideConsent, uniquePhone } from "./support/api";
import { completeLearnerProfile, sendConsentRequest, startLearnerSignup } from "./support/signup";

// LOT-3 §8.2 · P1 (étapes 3.3a et 3.3b) : un apprenant créé pour le test suit le parcours gratuit court du jeu D2 (1 projet, 1 niveau,
// 2 missions, formative et sommative de 2 questions), réussit la formative, rate la sommative, attend le délai
// court de la stack e2e (`seed_demo --e2e`), puis la réussit. Les bonnes réponses sont celles du jeu D2 (la
// première), jamais lues dans la page. L'apprenant est neuf à chaque passage : le parcours est rejouable (retry).

const COURSE = "premiers-pas-zeti";
const RIGHT = "L'idée vue dans la mission";
const WRONG = "Une idée qui n'y figure pas";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

async function answerQuiz(page: Page, choice: string) {
  // Next garde la page précédente masquée (navigation arrière) : seuls les éléments visibles comptent
  await expect(page.getByText(/Obtiens au moins \d+ %/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(RIGHT).filter({ visible: true })).toHaveCount(1);
  await page.getByRole("radio", { name: choice }).check({ force: true });
  await page.getByRole("button", { name: /Question suivante/ }).click();
  await page.getByRole("radio", { name: choice }).check({ force: true });
  await page.getByRole("button", { name: /Envoyer mes réponses/ }).click();
}

test("P1 : missions, formative réussie, sommative ratée puis réussie après le délai, badges", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.route("https://player.vimeo.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Vidéo factice</title>" }),
  );
  // Apprenant neuf (accord du parent, profil), inscrit au parcours gratuit depuis sa fiche (WC04)
  await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: true });
  await page.goto("/inscription/apprenant/mot-de-passe");
  await completeLearnerProfile(page, "Robot2026x");
  await page.goto(`/apprenant/catalogue/${COURSE}`);
  await page.getByRole("button", { name: "Commencer le parcours" }).click();
  await expect(page).toHaveURL(new RegExp(`/apprenant/parcours/${COURSE}/projets/\\d+$`));

  // WD23 → WC06a → WJ01 → WJ02 → WJ03 ×2
  await page.goto("/apprenant/parcours");
  await page.getByRole("link", { name: "Premiers pas avec Zeti", exact: true }).click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}`);
  await page.getByRole("link", { name: /Projet 1/ }).first().click();
  await page.getByRole("link", { name: /Voir le projet 1/ }).click();
  await page.getByRole("link", { name: /Continuer le niveau 1/ }).click();
  await page.getByRole("link", { name: "Commencer la 1ʳᵉ mission" }).click();
  await expect(page).toHaveURL(new RegExp(`/apprenant/parcours/${COURSE}/missions/\\d+$`));
  await page.getByRole("button", { name: /Lire la vidéo/ }).click();
  await expect(page.locator('iframe[src^="https://player.vimeo.com/video/"]')).toBeVisible();
  const first = page.url();
  await page.getByRole("button", { name: /Marquer comme terminée/ }).click();
  await expect(page).not.toHaveURL(first);
  await expect(page).toHaveURL(new RegExp(`/missions/\\d+$`));
  await page.getByRole("button", { name: /Marquer comme terminée/ }).click();

  // WJ04 (formative) réussie → WJ05 → WJ06
  await expect(page).toHaveURL(new RegExp(`/apprenant/parcours/${COURSE}/quiz/\\d+$`));
  await expect(page.getByText(/pour valider le niveau/).filter({ visible: true })).toBeVisible();
  await axe(page);
  await answerQuiz(page, RIGHT);
  await expect(page).toHaveURL(/\/resultats\/\d+$/);
  await expect(page.getByText("Réussi").filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/2 bonnes réponses sur 2 · seuil \d+ %/).filter({ visible: true })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Voir mon badge" }).click();
  await expect(page).toHaveURL(/\/niveaux\/\d+\/badge\?tentative=\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Niveau terminé !" })).toBeVisible();
  await expect(page.getByText("Voir mes badges")).toHaveCount(0);
  await axe(page);

  // WJ10 (sommative) ratée → WJ08 : réessai bloqué par le compte à rebours, puis rouvert
  await page.getByRole("link", { name: /Passer l'évaluation du projet/ }).click();
  await expect(page.getByText(/pour valider le projet/).filter({ visible: true })).toBeVisible();
  await answerQuiz(page, WRONG);
  await expect(page.getByRole("heading", { name: "Pas encore validé" })).toBeVisible();
  await expect(page.getByText("Échoué").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Revoir « / }).first()).toHaveAttribute("href", /\/missions\/\d+$/);
  await expect(page.getByRole("button", { name: /Réessayer le quiz dans/ })).toBeDisabled();
  await axe(page);
  await page.getByRole("link", { name: /Réessayer le quiz/ }).click({ timeout: 15_000 });

  // WJ10 réussie → WJ11 → étape suivante : la certification
  await answerQuiz(page, RIGHT);
  await expect(page.getByText("Tu as validé le projet.").filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "Voir mon badge" }).click();
  await expect(page).toHaveURL(/\/projets\/\d+\/badge\?tentative=\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projet validé !" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir ma certification" })).toHaveAttribute(
    "href",
    `/apprenant/parcours/${COURSE}/certification`,
  );
});
