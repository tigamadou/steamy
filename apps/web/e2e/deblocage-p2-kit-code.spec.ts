import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { buyKitCode } from "./support/commerce";
import { loginViaApi } from "./support/session";
import { createLearner } from "./support/signup";

// LOT-3 étape 3.6 · Parcours P2 (Kit Code) : WC05 → WA01 → WA06 (code inconnu) → WA01 (code valide saisi en
// minuscules sans tirets) → WC06a avec le toast « Parcours débloqué » → WD23 ; puis WA06 « déjà utilisé » pour un autre
// apprenant. Chaque passage crée ses comptes et achète son kit par l'API (parent) : rejouable.

const COURSE = "robot-bluetooth";
const COURSE_TITLE = "Construis ton robot Bluetooth";
const KIT = "steamy-bot-v1";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Saisit le code dans WA01 et l'envoie : une nouvelle saisie efface l'échec précédent, le bouton reste « Valider le code ». */
async function submitCode(page: Page, code: string) {
  const input = page.getByRole("textbox", { name: /Code Kit/ });
  await input.fill("");
  await input.pressSequentially(code);
  await page.getByRole("button", { name: "Valider le code" }).click();
}

test("P2 · WA01 / WA06 : Kit Code inconnu, puis valide en minuscules → WC06a, puis déjà utilisé", async ({ page }) => {
  test.setTimeout(180_000);
  const learner = await createLearner();
  const code = await buyKitCode(learner.parentPhone, KIT);

  await loginViaApi(page, learner.username, learner.password);
  await page.goto(`/apprenant/catalogue/${COURSE}`);
  await page.getByRole("complementary", { name: "Inscription au parcours" }).getByRole("link", { name: "J'ai un Kit Code" }).click();
  await expect(page).toHaveURL(`/apprenant/catalogue/${COURSE}/kit-code`);
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toHaveText("Débloquer le parcours");
  await expect(page.getByRole("heading", { level: 2, name: "Ce parcours se débloque avec ton kit" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Code Kit/ }).filter({ visible: true })).toHaveAttribute("placeholder", "STEAMY-XXXX-XXXX");
  await expect(page.getByRole("link", { name: "Commander dans la boutique" }).filter({ visible: true })).toBeVisible();
  await axe(page);

  // WA06 : code inconnu
  await submitCode(page, "STEAMY-ZZZZ-ZZZZ");
  await expect(page.getByRole("heading", { level: 2, name: "Code Kit invalide" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Code Kit/ }).filter({ visible: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("link", { name: "Contacter le support" }).filter({ visible: true })).toBeVisible();
  await axe(page);

  // Code valide saisi en minuscules sans tirets : mis en forme à la frappe
  const typed = code.replace(/-/g, "").toLowerCase();
  // Nouvelle saisie : le titre de l'échec disparaît
  await page.getByRole("textbox", { name: /Code Kit/ }).fill("");
  await expect(page.getByRole("heading", { level: 2, name: "Code Kit invalide" }).filter({ visible: true })).toHaveCount(0);
  await submitCode(page, typed);
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}`, { timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: "Parcours débloqué" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: COURSE_TITLE }).filter({ visible: true })).toBeVisible();

  // Le parcours apparaît dans Mes parcours (WD23)
  await page.goto("/apprenant/parcours");
  await expect(page.getByRole("link", { name: new RegExp(COURSE_TITLE) }).filter({ visible: true }).first()).toBeVisible();

  // WA06 : le même code, saisi par un autre apprenant, est déjà utilisé
  const other = await createLearner({ firstName: "Ama" });
  await loginViaApi(page, other.username, other.password);
  await page.goto(`/apprenant/catalogue/${COURSE}/kit-code`);
  await submitCode(page, code);
  await expect(page.getByRole("heading", { level: 2, name: "Code déjà utilisé" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/qu'une seule fois/).filter({ visible: true })).toBeVisible();
});
