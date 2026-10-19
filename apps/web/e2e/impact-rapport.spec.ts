import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.9 parcours critique du rapport trimestriel : Finance se connecte par WAD15 (code TOTP de développement),
// enregistre un brouillon (WAD05), valide la saisie, relit le rapport (WAD04), le soumet ; la saisie passe en lecture
// seule (D74). La soumission est définitive : chaque projet travaille sur son propre trimestre passé, pour ne pas
// verrouiller celui du jour ni celui de l'autre projet. L'export CSV passe par le worker Celery de la stack e2e.
// Rejouable une seule fois par base : un rapport soumis ne se rouvre pas (D74, aucun endpoint ne le permet). En CI la
// base est neuve ; en local, repartir d'une pile vierge (`make e2e-down` puis `make e2e`).

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const QUARTERS: Record<string, string> = { bureau: "2025-t3", mobile: "2025-t4" };

test("6.9 Finance saisit, valide, relit, exporte en CSV et soumet un rapport trimestriel", async ({ page }, info) => {
  test.slow(); // attente possible de la fenêtre TOTP suivante (impact-tracker.spec.ts connecte aussi Finance)
  const quarter = QUARTERS[info.project.name] ?? QUARTERS.bureau;
  const label = `T${quarter.slice(-1)} 2025`;

  await page.goto("/backoffice/impact");
  await expect(page).toHaveURL((url) => url.href.startsWith(`${API_URL}/admin/login/`));
  await staffLogin(page, STAFF.finance);

  // WAD02 → « Rapport trimestriel » : le trimestre en cours
  await page.getByRole("link", { name: "Rapport trimestriel" }).click();
  await expect(page).toHaveURL(/\/backoffice\/impact\/rapports\/\d{4}-t[1-4]$/);
  await expect(page.getByRole("heading", { level: 1, name: "Rapport d'impact trimestriel" })).toBeVisible();

  // WAD05 : brouillon
  await page.goto(`/backoffice/impact/rapports/${quarter}/saisie`);
  await expect(page.getByRole("heading", { level: 1, name: "Saisie des indicateurs manuels" })).toBeVisible();
  const form = page.locator("form");
  await form.getByLabel("Recommandation du programme (1-10)").fill("9");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Brouillon enregistré." })).toBeVisible();

  // Valider : les indicateurs vides sont signalés, puis la saisie complète est confirmée
  await page.getByRole("button", { name: "Valider la saisie" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "restent à renseigner" })).toBeVisible();
  for (const select of await form.locator("select").all()) await select.selectOption("non");
  for (const textarea of await form.locator("textarea").all()) await textarea.fill("Aucun");
  for (const input of await form.locator("input").all()) await input.fill("5");
  await page.getByRole("button", { name: "Valider la saisie" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saisie validée" })).toBeVisible();

  const entry = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(entry.violations).toEqual([]);

  // WAD04 : relecture puis soumission confirmée
  await page.getByRole("link", { name: "Revoir le rapport avant de le soumettre" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact/rapports/${quarter}`);
  await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("table", { name: `Indicateurs du rapport ${label}` })).toBeVisible();

  const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(report.violations).toEqual([]);

  // Export CSV asynchrone (D74) : préparation annoncée, puis téléchargement du fichier généré par le worker
  await page.getByRole("button", { name: "Exporter CSV" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Préparation de l'export CSV" })).toBeVisible();
  const csvLink = page.getByRole("link", { name: "Télécharger le CSV" });
  await expect(csvLink).toBeVisible({ timeout: 60_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), csvLink.click()]);
  expect(download.suggestedFilename()).toBe(`rapport-impact-${quarter}.csv`);
  const csv = await download.path().then((path) => readFile(path, "utf8"));
  expect(csv.split(/\r?\n/)[0]).toBe("\ufeffIndicateur;Du;Au;Réponse;Statut;Source");
  expect(csv).toContain("Recommandation du programme (1-10);");

  await page.getByRole("button", { name: "Soumettre" }).click();
  const dialog = page.getByRole("dialog", { name: `Soumettre le rapport ${label} ?` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Soumettre le rapport" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Soumis", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Soumettre" })).toHaveCount(0);

  // La saisie est désormais en lecture seule (D74)
  await page.getByRole("link", { name: "Voir la saisie" }).click();
  await expect(page.getByText(`Le rapport ${label} est soumis : la saisie est en lecture seule.`)).toBeVisible();
  await expect(form.getByLabel("Recommandation du programme (1-10)")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Enregistrer le brouillon" })).toHaveCount(0);
});
