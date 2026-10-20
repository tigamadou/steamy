import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { apiSession } from "./support/api";
import { closeFamily, createFamily, type Family } from "./support/family";
import { loginViaApi } from "./support/session";

// LOT-4 étape 4.7 · suppression du compte d'un enfant (WPD09, D54) : à l'initiative du parent puis annulation depuis
// WPD02 ; demande de l'enfant (WD15) validée depuis « À valider ». Familles neuves à chaque passage.

async function axe(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** Connexion de l'enfant (W16, par l'API) : `null` si acceptée, sinon le code d'erreur renvoyé. */
async function childLogin(family: Family): Promise<string | null> {
  const session = await apiSession();
  const csrf = (await session.api.storageState()).cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "";
  const response = await session.api.post("/api/auth/login/", {
    data: { identifier: family.child.username, password: family.child.password },
    headers: { "X-CSRFToken": csrf },
  });
  const code = response.ok() ? null : ((await response.json()) as { code: string }).code;
  await session.api.dispose();
  return code;
}

test("WPD09 : le parent supprime le compte, l'enfant ne peut plus se connecter, puis annule depuis WPD02", async ({
  page,
}) => {
  const family = await createFamily();
  await loginViaApi(page, family.parentPhone);

  // WPD03 → WPD09
  await page.goto(`/parent/enfants/${family.child.id}`);
  await page.getByRole("link", { name: "Supprimer le compte" }).click();
  await expect(page).toHaveURL(`/parent/enfants/${family.child.id}/supprimer`);
  const form = page.getByRole("form", { name: "Supprimer le compte de Yao" });
  await expect(form).toContainText("désactivé immédiatement");
  await expect(form).toContainText("anonymisé 30 jours plus tard");
  await expect(form).not.toContainText(/définitivement|irréversible/i);
  const reason = form.getByRole("combobox", { name: /Motif de la suppression/ });
  await expect(reason.getByRole("option", { name: "Le compte n'est plus utilisé" })).toBeAttached();
  await axe(page);

  // Motif requis
  await form.getByRole("button", { name: "Supprimer le compte" }).click();
  await expect(page.getByRole("link", { name: "Choisissez le motif de la suppression." })).toBeVisible();
  await reason.selectOption({ label: "Le compte n'est plus utilisé" });
  await form.getByRole("button", { name: "Supprimer le compte" }).click();

  // Désactivation immédiate (D54)
  await expect(page).toHaveURL(`/parent/enfants/${family.child.id}?confirmation=supprime`);
  await expect(page.getByText(/suppression programmée le/)).toBeVisible();
  expect(await childLogin(family)).toBe("ACCOUNT_DEACTIVATED");

  // WPD02 : « Supprimé le … » puis « Annuler la suppression » : annonce, focus sur la ligne ; l'enfant se reconnecte
  await page.goto("/parent/enfants");
  const row = page.getByRole("article", { name: "Yao Test" });
  await expect(row.getByText(/Supprimé le/)).toBeVisible();
  await axe(page);
  await row.getByRole("button", { name: /^Annuler la suppression/ }).click();
  await expect(page.getByText("La suppression du compte de Yao Test est annulée : Yao peut de nouveau se connecter.")).toBeVisible();
  await expect(row).toBeFocused();
  await expect(row.getByText(/Supprimé le/)).toHaveCount(0);
  await expect(page).toHaveURL("/parent/enfants");
  await expect.poll(() => childLogin(family)).toBeNull();
  await closeFamily(family);
});

test("WPD03 : suppression annulée depuis le profil de l'enfant, focus sur son titre", async ({ page }) => {
  const family = await createFamily();
  const [reason] = (await family.parentSession.get("/api/referentials/deletion-reasons/")) as { code: string }[];
  await family.parentSession.post(`/api/accounts/children/${family.child.id}/deletion/`, { reason: reason.code });
  await loginViaApi(page, family.parentPhone);
  await page.goto(`/parent/enfants/${family.child.id}`);
  await expect(page.getByText(/suppression programmée le/)).toBeVisible();
  await page.getByRole("button", { name: /^Annuler la suppression/ }).click();
  await expect(page.getByText("La suppression est annulée : Yao peut de nouveau se connecter.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Yao Test" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Supprimer le compte" })).toBeVisible();
  expect(await childLogin(family)).toBeNull();
  await closeFamily(family);
});

test("WPD09 : la demande de suppression de l'enfant (WD15) est validée depuis « À valider »", async ({ page }) => {
  const family = await createFamily();
  await family.childSession.post("/api/accounts/me/deletion-request/", { note: "Je n'utilise plus Steamy." });
  await loginViaApi(page, family.parentPhone);

  // WPD01 → WPD09 avec la demande
  await page.goto("/parent");
  const action = page.getByRole("article", { name: "Demande de suppression du compte · Yao Test" });
  await action.getByRole("link", { name: /^Examiner/ }).click();
  await expect(page).toHaveURL(new RegExp(`/parent/enfants/${family.child.id}/supprimer\\?demande=\\d+$`));
  const request = page.getByRole("region", { name: "Yao demande la suppression de son compte" });
  await expect(request.getByText("« Je n'utilise plus Steamy. »")).toBeVisible();
  await axe(page);
  await request.getByRole("button", { name: "Valider la suppression" }).click();
  const confirm = page.getByRole("dialog", { name: "Valider la suppression du compte de Yao ?" });
  await confirm.getByRole("button", { name: "Valider la suppression" }).click();

  await expect(page).toHaveURL(`/parent/enfants/${family.child.id}?confirmation=supprime`);
  expect(await childLogin(family)).toBe("ACCOUNT_DEACTIVATED");
  await closeFamily(family);
});

test("WPD09 : la demande de l'enfant est refusée, l'enfant garde son compte", async ({ page }) => {
  const family = await createFamily();
  await family.childSession.post("/api/accounts/me/deletion-request/", { note: "" });
  await loginViaApi(page, family.parentPhone);
  await page.goto("/parent/enfants");
  await page.getByRole("link", { name: /^Examiner\s*la demande de suppression de Yao Test$/ }).click();
  await page.getByRole("button", { name: "Refuser la demande" }).click();
  await expect(page).toHaveURL(`/parent/enfants/${family.child.id}?confirmation=demande-refusee`);
  await expect(page.getByText("La demande de suppression est refusée : Yao en est informé·e.")).toBeVisible();
  const own = (await family.childSession.get("/api/accounts/me/deletion-request/")) as { status: string } | null;
  expect(own?.status).toBe("refused");
  expect(await childLogin(family)).toBeNull();
  await closeFamily(family);
});
