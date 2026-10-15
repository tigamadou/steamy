import { expect, test, type Page } from "@playwright/test";

import { API_URL, DEMO_TOTP_KEY, STAFF, staffLogin, submitStaffLogin, totp } from "./support/staff";

// WAD15 · connexion du personnel à l'admin Django (servi par l'API) : email, mot de passe, code TOTP (D72).
// Comptes et secret TOTP de développement du jeu de démonstration : apps/api/fixtures/README.md.

// Un code TOTP ne sert qu'une fois par compte : chaque projet (bureau, mobile) a ses propres comptes.
const ACCOUNTS = {
  bureau: { ok: STAFF.superAdmin, refused: STAFF.content },
  mobile: { ok: STAFF.support, refused: STAFF.finance },
} as const;

async function fillLogin(page: Page, email: string, code: string) {
  await page.goto(`${API_URL}/admin/login/?next=/admin/`);
  await submitStaffLogin(page, email, code);
}

function accounts(projectName: string) {
  return ACCOUNTS[projectName as keyof typeof ACCOUNTS] ?? ACCOUNTS.bureau;
}

test("WAD15 présente les champs de connexion du personnel", async ({ page }) => {
  await page.goto(`${API_URL}/admin/login/`);
  await expect(page.getByLabel("Email professionnel")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
  await expect(page.getByLabel("Code de vérification (2FA)")).toBeVisible();
  await expect(page.getByText("Saisissez le code de votre application d'authentification.")).toBeVisible();
  await expect(page.getByText("Connexion chiffrée · journalisée")).toBeVisible();
});

test("WAD15 refuse un code TOTP faux", async ({ page }, testInfo) => {
  const wrong = totp(DEMO_TOTP_KEY) === "000000" ? "111111" : "000000";
  await fillLogin(page, accounts(testInfo.project.name).refused, wrong);
  await expect(page.getByText("Code de vérification incorrect ou déjà utilisé.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login\//);
});

test("WAD15 ouvre l'index de l'admin avec le code TOTP", async ({ page }, testInfo) => {
  test.slow(); // backoffice.spec.ts connecte aussi ce compte : attente possible de la fenêtre TOTP suivante
  await page.goto(`${API_URL}/admin/login/?next=/admin/`);
  await staffLogin(page, accounts(testInfo.project.name).ok);
  await expect(page).toHaveURL(`${API_URL}/admin/`);
  await expect(page.getByRole("heading", { level: 1, name: "Administration" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pilotage" })).toHaveAttribute("href", /\/backoffice$/);
});
