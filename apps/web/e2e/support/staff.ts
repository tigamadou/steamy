import { createHmac } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { DEMO_PASSWORD } from "./demo";

// Personnel du jeu de démonstration et secret TOTP de développement : apps/api/fixtures/README.md.
export const API_URL = process.env.API_URL ?? "http://localhost:8000";
export const DEMO_TOTP_KEY = "3132333435363738393031323334353637383930";

export const STAFF = {
  superAdmin: "superadmin@steamy.test",
  content: "contenu@steamy.test",
  support: "support@steamy.test",
  finance: "finance@steamy.test",
} as const;

const STEP_MS = 30_000;

/** Code TOTP (RFC 6238 : HMAC-SHA1, pas de 30 s, 6 chiffres). */
export function totp(hexKey: string = DEMO_TOTP_KEY, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / (STEP_MS / 1000))));
  const hmac = createHmac("sha1", Buffer.from(hexKey, "hex")).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

/** Remplit WAD15 (connexion de l'admin Django) et l'envoie. */
export async function submitStaffLogin(page: Page, email: string, code: string): Promise<void> {
  await page.getByLabel("Email professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
  await page.getByLabel("Code de vérification (2FA)").fill(code);
  await page.getByRole("button", { name: "Connexion sécurisée" }).click();
}

/**
 * Connexion du personnel par WAD15 depuis la page où l'on se trouve (ou `/admin/login/`). Un code TOTP ne sert
 * qu'une fois par compte : si un autre test l'a déjà consommé, on attend la fenêtre de 30 s suivante.
 */
export async function staffLogin(page: Page, email: string): Promise<void> {
  if (!page.url().includes("/admin/login/")) await page.goto(`${API_URL}/admin/login/`);
  const loginUrl = page.url();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await submitStaffLogin(page, email, totp());
    await page.waitForLoadState();
    if (!page.url().includes("/admin/login/")) return;
    await page.waitForTimeout(STEP_MS - (Date.now() % STEP_MS) + 500);
    await page.goto(loginUrl);
  }
  expect(page.url(), `connexion de ${email} par WAD15`).not.toContain("/admin/login/");
}
