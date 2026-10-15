import { expect, type Page } from "@playwright/test";

import { uniqueSuffix } from "./api";
import { extractLink, waitForSms } from "./mailpit";

// Étapes de l'inscription de l'apprenant rejouées par plusieurs parcours (2.3 à 2.8)

/** W03 → W04 → W05 jusqu'à la création de l'inscription en attente ; renvoie l'identifiant choisi. */
export async function startLearnerSignup(page: Page, firstName = "Awa"): Promise<string> {
  const username = `awa.${uniqueSuffix()}`;
  await page.goto("/inscription/type");
  await page.getByText("Un·e apprenant·e").click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/identite");
  await page.getByRole("textbox", { name: /^Prénom/ }).fill(firstName);
  await page.getByRole("textbox", { name: /^Nom/ }).fill("Test");
  await page.getByRole("textbox", { name: /^Identifiant/ }).fill(username);
  await page.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/age");
  await page.getByRole("spinbutton", { name: "Ton âge" }).press("ArrowUp");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/parent");
  return username;
}

/** W06 : demande envoyée au numéro donné, lien du SMS renvoyé. */
export async function sendConsentRequest(page: Page, phone: string): Promise<URL> {
  const since = new Date();
  await page.getByRole("textbox", { name: /^Numéro de téléphone du parent/ }).fill(phone.slice(4));
  await page.getByRole("combobox", { name: /^Lien de parenté/ }).selectOption({ label: "Mère" });
  await page.getByRole("button", { name: "Envoyer la demande au parent" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/attente");
  return extractLink(await waitForSms(phone, { since }), "/consentement/");
}
