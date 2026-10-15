import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { uniquePhone, uniqueSuffix } from "./support/api";
import { DEMO, DEMO_PASSWORD } from "./support/demo";
import { extractLink, waitForSms } from "./support/mailpit";

// P7 · Accessibilité (LOT-2-AUTH 2.8) : axe sur les écrans d'entrée du lot, inscription de l'enfant et connexion au
// clavier seul. Le projet « mobile » rejoue tout à 360 px ; chaque écran a aussi son contrôle axe dans son parcours.

const PUBLIC_SCREENS = [
  "/connexion",
  "/mot-de-passe-oublie",
  "/inscription",
  "/inscription/type",
  "/inscription/apprenant/identite",
  "/inscription/reprendre",
  "/inscription/parent",
  "/activation",
];

for (const path of PUBLIC_SCREENS) {
  test(`${path} ne présente aucune violation d'accessibilité`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}

/** Attend que l'écran soit hydraté : une saisie faite avant serait perdue dans un champ contrôlé. */
async function ready(page: Page, path: string) {
  await expect(page).toHaveURL(path);
  await page.waitForLoadState("networkidle");
}

/** Tabule jusqu'à l'élément actif dont le nom accessible correspond, puis renvoie la page. */
async function tabTo(page: Page, name: RegExp, max = 30) {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const labelled = el.getAttribute("aria-labelledby");
      const byId = labelled ? document.getElementById(labelled.split(" ")[0])?.textContent : null;
      const forLabel = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null;
      return [el.getAttribute("aria-label"), byId, forLabel, el.textContent].filter(Boolean).join(" ");
    });
    if (name.test(label ?? "")) return;
  }
  throw new Error(`Élément ${name} introuvable au clavier`);
}

test("P7 : inscription de l'enfant jusqu'au SMS du parent, au clavier seul", async ({ page }) => {
  test.slow();
  await page.goto("/inscription/type");
  await ready(page, "/inscription/type");
  await tabTo(page, /Un·e apprenant·e/);
  await page.keyboard.press("Space");
  await tabTo(page, /^Continuer/);
  await page.keyboard.press("Enter");
  await ready(page, "/inscription/apprenant/identite");

  await tabTo(page, /^Prénom/);
  await page.keyboard.type("Ada");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Clavier");
  await page.keyboard.press("Tab");
  await page.keyboard.type(`ada.${uniqueSuffix()}`);
  await tabTo(page, /J'accepte les/);
  await page.keyboard.press("Space");
  await tabTo(page, /^Continuer/);
  await page.keyboard.press("Enter");
  await ready(page, "/inscription/apprenant/age");

  await tabTo(page, /Ton âge/);
  await page.keyboard.press("ArrowUp");
  await tabTo(page, /^Continuer/);
  await page.keyboard.press("Enter");
  await ready(page, "/inscription/apprenant/parent");

  const phone = uniquePhone();
  await tabTo(page, /Numéro de téléphone du parent/);
  await page.keyboard.type(phone.slice(4));
  await tabTo(page, /Lien de parenté/);
  await page.keyboard.press("ArrowDown");
  const since = new Date();
  await tabTo(page, /Envoyer la demande au parent/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/inscription/apprenant/attente");
  expect(extractLink(await waitForSms(phone, { since }), "/consentement/").pathname).toMatch(/^\/consentement\//);
});

test("P7 : connexion W16 au clavier seul", async ({ page }) => {
  await page.goto("/connexion");
  await ready(page, "/connexion");
  await tabTo(page, /Identifiant ou numéro/);
  await page.keyboard.type(DEMO.learner.identifier);
  await tabTo(page, /^Mot de passe/);
  await page.keyboard.type(DEMO_PASSWORD);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/apprenant");
});
