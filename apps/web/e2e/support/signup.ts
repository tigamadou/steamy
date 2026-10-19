import { expect, type Page } from "@playwright/test";

import { apiSession, decideConsent, uniquePhone, uniqueSuffix } from "./api";
import { DEMO_PASSWORD } from "./demo";
import { extractCode, extractLink, waitForSms } from "./mailpit";

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

/** WP01 → WP03 par les écrans : compte parent créé au numéro donné, code lu dans le faux fournisseur SMS. */
export async function signUpParentThroughScreens(page: Page, phone: string, firstName = "Mariam"): Promise<void> {
  await expect(page).toHaveURL("/inscription/parent");
  await page.getByRole("textbox", { name: /^Prénom/ }).fill(firstName);
  await page.getByRole("textbox", { name: /^Nom/ }).fill("Test");
  await page.getByRole("textbox", { name: /^Numéro de téléphone/ }).fill(phone.slice(4));
  await page.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  const since = new Date();
  await page.getByRole("button", { name: "Recevoir mon code par SMS" }).click();
  await expect(page).toHaveURL("/inscription/parent/code");
  const code = extractCode(await waitForSms(phone, { since }));
  await page.getByLabel("Code à 6 chiffres reçu par SMS").fill(code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await expect(page).toHaveURL("/inscription/parent/mot-de-passe");
  await page.getByRole("textbox", { name: /^Mot de passe/ }).fill("Parent2026x");
  await page.getByRole("textbox", { name: /^Confirmez votre mot de passe/ }).fill("Parent2026x");
  await page.getByRole("button", { name: "Valider mon mot de passe" }).click();
  // Création du compte, ouverture de la session puis rendu serveur de l'étape suivante
  await expect(page).not.toHaveURL("/inscription/parent/mot-de-passe", { timeout: 20_000 });
}

/** Date de naissance cohérente avec l'âge choisi en W05 (D23). */
export function birthDateFor(age: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(date.getMonth() - 2);
  return date.toISOString().slice(0, 10);
}

/**
 * Apprenant neuf au profil complet, créé par l'API (W03-W14) : inscription, accord d'un parent neuf, mot de passe,
 * puis les quatre étapes du profil. Pour les parcours qui modifient un compte (profil, mot de passe) sans toucher
 * aux comptes partagés du jeu de démo.
 */
export async function createLearner({
  firstName = "Kofi",
  password = DEMO_PASSWORD,
  age = 14,
}: { firstName?: string; password?: string; age?: number } = {}): Promise<{ username: string; password: string }> {
  const username = `kofi.${uniqueSuffix()}`;
  const phone = uniquePhone();
  const { post, patch, get, api } = await apiSession();
  await post("/api/auth/learner-signup/", { firstName, lastName: "Test", username, age, privacyAccepted: true });
  const [relationship] = (await get("/api/referentials/relationships/")) as { code: string }[];
  const since = new Date();
  await post("/api/accounts/consent-requests/", { parentPhone: phone, relationship: relationship.code });
  await decideConsent(extractLink(await waitForSms(phone, { since }), "/consentement/"), phone, { accept: true });
  await post("/api/auth/learner-signup/password/", { password });
  const [locality] = (await get("/api/referentials/localities/?country=BJ")) as { id: number }[];
  const [grade] = (await get("/api/referentials/school-grades/")) as { code: string }[];
  const goals = (await get("/api/referentials/goals/")) as { code: string }[];
  const [avatar] = (await get("/api/referentials/avatars/")) as { code: string }[];
  await patch("/api/accounts/me/learner-profile/", { birthDate: birthDateFor(age), locality: locality.id });
  await patch("/api/accounts/me/learner-profile/", { schoolGrade: grade.code });
  await patch("/api/accounts/me/learner-profile/", { goals: goals.slice(0, 2).map((goal) => goal.code) });
  await patch("/api/accounts/me/learner-profile/", { avatar: avatar.code });
  await api.dispose();
  return { username, password };
}

/** W10 → W15 : mot de passe puis profil complet (âge de W05 : 14 ans avec `startLearnerSignup`). */
export async function completeLearnerProfile(page: Page, password: string, age = 14): Promise<void> {
  await expect(page).toHaveURL("/inscription/apprenant/mot-de-passe");
  await page.getByRole("textbox", { name: /^Mot de passe/ }).fill(password);
  await page.getByRole("textbox", { name: /^Confirme ton mot de passe/ }).fill(password);
  await page.getByRole("button", { name: "Valider mon mot de passe" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/profil/infos");
  await page.getByLabel(/^Date de naissance/).filter({ visible: true }).fill(birthDateFor(age));
  await page.getByRole("combobox", { name: /^Localité/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/profil/ecole");
  await page.getByRole("combobox", { name: /^Ta classe/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/profil/objectifs");
  await page.getByRole("checkbox").nth(0).check({ force: true });
  await page.getByRole("checkbox").nth(1).check({ force: true });
  await page.getByRole("button", { name: /^Suivant · / }).click();
  await expect(page).toHaveURL("/inscription/apprenant/profil/avatar");
  await page.getByRole("radio").first().check({ force: true });
  await page.getByRole("button", { name: "Terminer mon profil 🚀" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/bienvenue");
}

/** WP07 → WP10 : profil parent (WP08 laissé vide, tout y est facultatif). */
export async function completeParentProfile(page: Page): Promise<void> {
  await expect(page).toHaveURL("/inscription/parent/profil/localisation");
  await page.getByRole("combobox", { name: /^Localité/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page).toHaveURL("/inscription/parent/profil/a-propos");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page).toHaveURL("/inscription/parent/profil/enfants");
  await page.getByRole("checkbox").first().check({ force: true });
  await page.getByRole("button", { name: "Terminer mon profil 🚀" }).click();
  await expect(page).toHaveURL("/inscription/parent/bienvenue");
}
