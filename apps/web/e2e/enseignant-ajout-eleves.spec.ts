import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { uniquePhone, uniqueSuffix } from "./support/api";
import { waitForSms } from "./support/mailpit";
import { loginAs } from "./support/session";

// LOT-5 étape 5.3 · ajouter des élèves (WT06) : individuel, import par lot, rapport ligne par ligne.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Identifiant de la classe « 4e B · Robotique » de Koffi (jeu D2), lu dans la liste de ses classes. */
async function roboticsClassId(page: Page): Promise<string> {
  await page.goto("/enseignant/classes");
  const href = await page
    .getByRole("list", { name: "Mes classes" })
    .getByRole("link", { name: /4e B · Robotique/ })
    .getAttribute("href");
  return String(href).split("/").pop() as string;
}

test("WT06 individuel : la demande part au parent par SMS, l'invitation apparaît « En attente du parent » dans WT04", async ({ page }) => {
  await loginAs(page, "teacher");
  const classId = await roboticsClassId(page);
  await page.goto(`/enseignant/classes/${classId}`);
  await page.getByRole("link", { name: "Ajouter des élèves" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(`/enseignant/eleves/ajouter?classe=${classId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ajouter des élèves");
  await expect(page.getByRole("combobox", { name: /Classe/ })).toHaveValue(classId);
  await expect(page.getByText(/Le parent reçoit une demande de consentement par SMS/)).toBeVisible();
  await expect(page.getByText(/16 ans|Téléphone de l'apprenant/)).toHaveCount(0);
  await axe(page);

  // Champs vides : erreurs de forme, rien n'est envoyé
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByText("Indiquez le prénom de l'élève.").filter({ visible: true }).first()).toBeVisible();

  const suffix = uniqueSuffix();
  const phone = uniquePhone();
  const since = new Date();
  await page.getByLabel(/^Prénom/).fill(`Eleve${suffix}`);
  await page.getByLabel(/^Nom/).fill("Individuel");
  await page.getByRole("textbox", { name: /Téléphone du parent/ }).fill(phone.replace("+229", ""));
  await page.getByRole("combobox", { name: /Lien de parenté/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Envoyer la demande" }).click();

  await expect(page).toHaveURL(new RegExp(`/enseignant/classes/${classId}(\\?confirmation=invitation)?$`));
  await expect(page.getByText(/La demande est envoyée au parent/)).toBeVisible();
  const row = page.getByRole("list", { name: "Invitations" }).getByRole("listitem").filter({ hasText: `Eleve${suffix}` });
  await expect(row).toContainText("En attente du parent");
  await expect(page.getByText(phone)).toHaveCount(0);
  // Le SMS part par le faux fournisseur
  const sms = await waitForSms(phone, { since });
  expect(sms.Text).toContain("Steamy");
});

test("WT06 import par lot : rapport conforme, correction des lignes, renvoi, ligne « envoyée »", async ({ page }) => {
  await loginAs(page, "teacher");
  const classId = await roboticsClassId(page);
  await page.goto(`/enseignant/eleves/ajouter?classe=${classId}`);
  await page.getByRole("link", { name: "Import par lot" }).click();
  await expect(page).toHaveURL(`/enseignant/eleves/ajouter?classe=${classId}&onglet=lot`);
  await expect(page.getByRole("link", { name: "Télécharger le modèle CSV" })).toHaveAttribute("download", "modele-import-eleves.csv");

  const suffix = uniqueSuffix();
  const [phoneA, phoneB, phoneC] = [uniquePhone(), uniquePhone(), uniquePhone()];
  const list = [
    "Prénom;Nom;Téléphone du parent;Lien de parenté",
    `Ok${suffix};Import;${phoneA};mère`, // envoyée
    `Ok${suffix};Import;${phoneA};mère`, // doublon dans la liste
    "Kémi;Ahouandjinou;+2290190000003;mère", // déjà invité dans la classe (jeu D2)
    `Num${suffix};Import;12;mère`, // numéro invalide
    `Mal${suffix};Import;${phoneC}`, // ligne mal formée
  ].join("\n");
  await page.getByRole("textbox", { name: /Ou collez une liste/ }).fill(list);
  await expect(page.getByText("Aperçu : 4 premières lignes sur 5")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Importer et envoyer les demandes" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Résultat d'import" })).toBeVisible();
  // Le résultat remplace le formulaire : le focus passe au titre du rapport
  await expect(page.getByRole("heading", { level: 2, name: "Résultat d'import" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "envoyée" })).toContainText("1 demande envoyée · 4 lignes à vérifier");
  const lines = page.getByRole("list", { name: "Lignes de l'import" });
  await expect(lines.getByRole("listitem", { name: "Ligne 3" })).toContainText("Doublon dans la liste");
  await expect(lines.getByRole("listitem", { name: "Ligne 4" })).toContainText("Déjà dans la classe");
  await expect(lines.getByRole("listitem", { name: "Ligne 5" })).toContainText("Numéro invalide");
  await expect(lines.getByRole("listitem", { name: "Ligne 6" })).toContainText("Ligne mal formée");
  await expect(lines.getByText("Envoyée")).toHaveCount(1);
  await axe(page);

  // « Erreurs seulement »
  await page.getByRole("checkbox", { name: "Erreurs seulement" }).check();
  await expect(lines.getByText("Envoyée")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Erreurs seulement" }).uncheck();
  await expect(page.getByRole("button", { name: "Renvoyer les lignes corrigées" })).toBeDisabled();

  // Corrections : le numéro de la ligne 5 et le lien de parenté de la ligne 6
  await page.getByLabel(/Téléphone du parent de la ligne 5/).fill(phoneB);
  await page.getByLabel(/Lien de parenté de la ligne 6/).fill("mère");
  await page.getByRole("button", { name: "Renvoyer les lignes corrigées" }).click();
  await expect(page.getByRole("status").filter({ hasText: "envoyée" })).toContainText("3 demandes envoyées · 2 lignes à vérifier");
  await expect(page.getByRole("heading", { level: 2, name: "Résultat d'import" })).toBeFocused();
  await expect(lines.getByRole("listitem", { name: "Ligne 5" })).toHaveCount(0);
  await expect(lines.getByText("Envoyée")).toHaveCount(3);

  // Le rapport mène à la classe : les invitations y sont « En attente du parent »
  await page.getByRole("link", { name: "Voir la classe" }).click();
  await expect(page).toHaveURL(`/enseignant/classes/${classId}`);
  await expect(
    page.getByRole("list", { name: "Invitations" }).getByRole("listitem").filter({ hasText: `Ok${suffix}` }),
  ).toContainText("En attente du parent");
});

test("WT06 : un enseignant ne peut pas viser la classe d'un autre (classe inconnue ignorée)", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/eleves/ajouter?classe=999999");
  await expect(page.getByRole("combobox", { name: /Classe/ })).toHaveValue("");
});
