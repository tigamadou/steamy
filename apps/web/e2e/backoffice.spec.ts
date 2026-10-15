import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "./support/session";
import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.6 socle Next.js du back-office : garde (personnel vérifié par TOTP), renvoi vers WAD15, shell,
// contrôle du groupe par page. Comptes Support et Super-admin : ceux que admin-connexion.spec.ts connecte avec succès
// (Contenu et Finance y reçoivent des codes faux, qui déclenchent la limitation de django-otp). Un code ne sert qu'une
// fois par compte : `staffLogin` attend alors la fenêtre TOTP suivante.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/** La page est WAD15, avec retour vers `path` du back-office après connexion. */
async function expectAdminLogin(page: Page, path: string) {
  await expect(page).toHaveURL((url) => url.href.startsWith(`${API_URL}/admin/login/`));
  expect(new URL(page.url()).searchParams.get("next")).toBe(`${BASE_URL}${path}`);
}

/** Ouvre le menu sous 1024 px (projet mobile) ; sans effet sur bureau. */
async function openMenu(page: Page) {
  const toggle = page.getByRole("button", { name: "Menu du back-office" });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
}

test("6.6 renvoie un visiteur anonyme vers WAD15, retour à la page demandée", async ({ page }) => {
  await page.goto("/backoffice/impact");
  await expectAdminLogin(page, "/backoffice/impact");
  await expect(page.getByLabel("Code de vérification (2FA)")).toBeVisible();
});

test("6.6 renvoie un parent connecté vers WAD15", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/backoffice");
  await expectAdminLogin(page, "/backoffice");
});

test("6.6 ouvre le shell au personnel vérifié et refuse l'Impact Tracker au groupe Support", async ({ page }) => {
  test.slow(); // attente possible de la fenêtre TOTP suivante (bureau et mobile partagent le compte)
  await page.goto("/backoffice");
  await expectAdminLogin(page, "/backoffice");
  await staffLogin(page, STAFF.support);

  await expect(page).toHaveURL(`${BASE_URL}/backoffice`);
  await expect(page.getByRole("heading", { level: 1, name: "Vue d'ensemble" })).toBeVisible();
  await expect(page).toHaveTitle(/Vue d'ensemble · Back-office/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

  await openMenu(page);
  const nav = page.getByRole("navigation", { name: "Navigation du back-office" });
  await expect(nav.getByRole("link", { name: "Vue d'ensemble" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Impact Tracker" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /^Utilisateurs/ })).toHaveAttribute("href", `${API_URL}/admin/accounts/user/`);
  await expect(nav.getByRole("link", { name: /^Paiements/ })).toHaveCount(0);
  // Utilisateur issu de la session : son groupe sous son nom
  await expect(
    page.getByRole("complementary", { name: "Back-office" }).getByText("Support", { exact: true }),
  ).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);

  // Chaque page revérifie le groupe : l'URL directe ne suffit pas
  await page.goto("/backoffice/impact");
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/acces-refuse`);
  await expect(page.getByRole("heading", { level: 1, name: "Accès refusé" })).toBeVisible();
  await expect(page.getByText(/appartient au groupe Support/)).toBeVisible();

  await openMenu(page);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL((url) => url.href.startsWith(`${API_URL}/admin/login/`));
  await page.goto("/backoffice");
  await expectAdminLogin(page, "/backoffice");
});

test("6.6 ouvre l'Impact Tracker au Super-admin", async ({ page }) => {
  test.slow(); // attente possible de la fenêtre TOTP suivante (bureau et mobile partagent le compte)
  await page.goto("/backoffice/impact");
  await expectAdminLogin(page, "/backoffice/impact");
  await staffLogin(page, STAFF.superAdmin);
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact`);
  await expect(page.getByRole("heading", { level: 1, name: "Impact Tracker" })).toBeVisible();
  await openMenu(page);
  const nav = page.getByRole("navigation", { name: "Navigation du back-office" });
  await expect(nav.getByRole("link", { name: "Impact Tracker" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: /^Paiements/ })).toHaveAttribute("href", `${API_URL}/admin/payments/`);
});
