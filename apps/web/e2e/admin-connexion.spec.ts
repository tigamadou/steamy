import { createHmac } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

// WAD15 · connexion du personnel à l'admin Django (servi par l'API) : email, mot de passe, code TOTP (D72).
// Comptes et secret TOTP de développement du jeu de démonstration : apps/api/fixtures/README.md.
const API_URL = process.env.API_URL ?? "http://localhost:8000";
const PASSWORD = "Steamy2026";
const DEMO_TOTP_KEY = "3132333435363738393031323334353637383930";

// Un code TOTP ne sert qu'une fois par compte : chaque projet (bureau, mobile) a ses propres comptes.
const ACCOUNTS = {
  bureau: { ok: "superadmin@steamy.test", refused: "contenu@steamy.test" },
  mobile: { ok: "support@steamy.test", refused: "finance@steamy.test" },
} as const;

/** Code TOTP courant (RFC 6238 : HMAC-SHA1, pas de 30 s, 6 chiffres). */
function totp(hexKey: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", Buffer.from(hexKey, "hex")).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

async function fillLogin(page: Page, email: string, code: string) {
  await page.goto(`${API_URL}/admin/login/?next=/admin/`);
  await page.getByLabel("Email professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByLabel("Code de vérification (2FA)").fill(code);
  await page.getByRole("button", { name: "Connexion sécurisée" }).click();
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
  await fillLogin(page, accounts(testInfo.project.name).ok, totp(DEMO_TOTP_KEY));
  await expect(page).toHaveURL(`${API_URL}/admin/`);
  await expect(page.getByRole("heading", { level: 1, name: "Administration" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pilotage" })).toHaveAttribute("href", /\/backoffice$/);
});
