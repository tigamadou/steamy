import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent } from "../support/api";
import { DEMO_PASSWORD } from "../support/demo";
import { closeFamily, createFamily, type Family } from "../support/family";
import { extractLink, waitForSms } from "../support/mailpit";
import { loginViaApi } from "../support/session";

// LOT-4 étape 4.4 · WPD15 Demande de paiement : l'enfant demande, le parent paie (faux prestataire pilotable par le
// numéro : …01 succès, …02 échec), refuse, ou n'a pas accès à la demande d'une autre famille.

const COURSE = "capteurs-electroniques";
const KIT = "pack-electronique";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  // Aucun défilement horizontal, même à 360 px (une piste de grille trop large décale les clics sur mobile)
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** L'enfant demande ; renvoie l'identifiant et le lien reçu par SMS par le parent. */
async function ask(family: Family, body: object): Promise<{ id: number; link: URL }> {
  const since = new Date();
  const { id } = (await family.childSession.post("/api/payments/payment-requests/", body)) as { id: number };
  const link = extractLink(await waitForSms(family.parentPhone, { since }), "/parent/demandes/");
  return { id, link };
}

/** Le parent ouvre le lien SMS, se connecte sur W16, puis revient sur WPD15. */
async function openFromSms(page: Page, family: Family, link: URL) {
  await page.goto(link.pathname);
  await expect(page).toHaveURL(/\/connexion\?next=/);
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(family.parentPhone);
  await page.getByLabel(/^Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(link.pathname);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande de paiement");
}

/** Choisit le premier réseau du pays et saisit le numéro de test, puis « Payer ». */
async function pay(page: Page, national: string) {
  // Carte de réseau : clic sur la carte visible (la case radio est masquée sous son libellé)
  const radio = page.getByRole("radio").first();
  const network = (await radio.getAttribute("aria-labelledby")) as string;
  await page.locator(`[id="${network}"]`).click();
  await expect(radio).toBeChecked();
  await page.getByRole("textbox", { name: /Numéro Mobile Money/ }).fill(national);
  await page.getByRole("button", { name: /^Payer/ }).click();
}

async function requestStatus(family: Family, id: number): Promise<{ status: string; declineReason: string }> {
  return (await family.childSession.get(`/api/payments/payment-requests/${id}/`)) as {
    status: string;
    declineReason: string;
  };
}

test("WPD15 : l'enfant demande un parcours, le parent paie depuis le lien SMS, la demande est réglée", async ({ page }) => {
  const family = await createFamily();
  const { id, link } = await ask(family, { kind: "course", courseSlug: COURSE });
  await openFromSms(page, family, link);
  await expect(page.getByText("À payer", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeVisible();
  await expect(page.getByText("Paiement sécurisé · aucune carte bancaire")).toBeVisible();
  await axe(page);

  await pay(page, "0197000001");
  await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Capteurs électroniques est débloqué pour Yao/)).toBeVisible();
  await expect.poll(async () => (await requestStatus(family, id)).status, { timeout: 15_000 }).toBe("paid");

  // L'enfant a désormais accès au parcours (inscription créée au paiement)
  const enrollments = (await family.childSession.get("/api/learning/enrollments/")) as {
    results?: { course: { slug: string } }[];
  };
  expect((enrollments.results ?? []).map((enrollment) => enrollment.course.slug)).toContain(COURSE);

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
  await closeFamily(family);
});

test("WPD15 : paiement échoué avec la raison du prestataire, puis réussi avec un autre numéro", async ({ page }) => {
  const family = await createFamily();
  const { link } = await ask(family, { kind: "course", courseSlug: COURSE });
  await openFromSms(page, family, link);
  await pay(page, "0197000002");
  await expect(page.getByRole("heading", { name: "Paiement échoué" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Raison :/)).toBeVisible();
  await expect(page.getByText("Échec", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Changer de numéro" }).click();
  await page.getByRole("textbox", { name: /Numéro Mobile Money/ }).fill("0197000001");
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible({ timeout: 30_000 });
  await closeFamily(family);
});

test("WPD15 : demande de kit, adresse de livraison, frais du serveur, commande payée", async ({ page }) => {
  const family = await createFamily();
  const { link } = await ask(family, { kind: "kit", items: [{ kitSlug: KIT, quantity: 1 }] });
  await openFromSms(page, family, link);
  await expect(page.getByText(/hors livraison/)).toBeVisible();
  const address = page.getByRole("form", { name: "Adresse de livraison" });
  const zone = address.getByRole("combobox", { name: /^Ville ou zone/ });
  await expect(zone.locator("option").nth(1)).toBeAttached();
  await zone.selectOption({ index: 1 });
  await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
  await address.getByRole("textbox", { name: /^Quartier/ }).fill("Akpakpa");
  await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 5, maison bleue");
  await address.getByRole("checkbox", { name: "Enregistrer comme adresse par défaut" }).check();
  await axe(page);
  await address.getByRole("button", { name: "Continuer vers le paiement" }).click();

  await expect(page.getByText(/^Livraison · /)).toBeVisible();
  await expect(page.getByText(/Kit réservé jusqu'au/)).toBeVisible();
  await axe(page);
  await pay(page, "0197000001");
  await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible({ timeout: 30_000 });

  const orders = (await family.parentSession.get("/api/payments/orders/?status=paid")) as {
    results: { kind: string; beneficiary: { id: number } | null }[];
  };
  expect(orders.results.some((order) => order.kind === "kit" && order.beneficiary?.id === family.child.id)).toBe(true);
  const saved = (await family.parentSession.get("/api/accounts/me/delivery-address/")) as { addressLine: string };
  expect(saved.addressLine).toBe("Rue 5, maison bleue");
  // La commande de kit apparaît dans WPD07, au nom de l'enfant
  await page.goto("/parent/commandes");
  await expect(page.getByRole("article", { name: /^Kit : / })).toContainText("Pour Yao");
  await closeFamily(family);
});

test("WPD15 : refus avec motif, transmis à l'enfant ; la demande passe en lecture seule", async ({ page }) => {
  const family = await createFamily();
  const { id, link } = await ask(family, { kind: "course", courseSlug: COURSE });
  await openFromSms(page, family, link);
  await page.getByRole("button", { name: "Refuser la demande" }).click();
  const dialog = page.getByRole("dialog", { name: "Refuser la demande de Yao ?" });
  await dialog.getByRole("textbox", { name: /Motif/ }).fill("On en reparle après les examens.");
  await dialog.getByRole("button", { name: "Refuser la demande" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Vous avez refusé cette demande" })).toBeVisible();
  await expect(page.getByText(/« On en reparle après les examens. »/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Payer/ })).toHaveCount(0);
  expect(await requestStatus(family, id)).toMatchObject({
    status: "declined",
    declineReason: "On en reparle après les examens.",
  });
  await closeFamily(family);
});

test("WPD15 : la demande d'une autre famille est « introuvable »", async ({ page }) => {
  const family = await createFamily();
  const { link } = await ask(family, { kind: "course", courseSlug: COURSE });
  const { phone } = await createParent({ firstName: "Autre" });
  await loginViaApi(page, phone);
  await page.goto(link.pathname);
  await expect(page.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir mes demandes à valider" })).toHaveAttribute("href", "/parent");
  await closeFamily(family);
});
