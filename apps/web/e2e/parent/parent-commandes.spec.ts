import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent } from "../support/api";
import { closeFamily, createFamily } from "../support/family";
import { loginViaApi } from "../support/session";

// LOT-4 étape 4.5 · achat direct de kit par le parent (C10), commandes WPD07, suivi, facture et Kit Codes.

const KIT = "Pack Électronique";
const COMPATIBLE_COURSE = "capteurs-electroniques";

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

test("achat direct : boutique, panier, livraison, paiement, WPD07, facture et Kit Code qui débloque le parcours", async ({
  page,
}) => {
  const family = await createFamily({ childFirstName: "Sika" });
  await loginViaApi(page, family.parentPhone);

  // WK01 dans l'espace parent → panier serveur
  await page.goto("/parent/boutique");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Boutique de kits");
  await expect(async () => {
    await page.getByRole("button", { name: `Ajouter ${KIT} au panier` }).click();
    await expect(page.getByText(`« ${KIT} » est dans votre panier.`)).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await page.getByRole("link", { name: "Mon panier" }).click();
  await expect(page).toHaveURL("/parent/boutique/panier");
  await page.getByRole("link", { name: "Commander" }).click();

  // Livraison, bénéficiaire, commande du serveur
  await expect(page).toHaveURL("/parent/boutique/commande");
  await page.getByRole("combobox", { name: /Pour quel enfant/ }).selectOption({ label: "Sika Test" });
  const address = page.getByRole("form", { name: "Adresse de livraison" });
  const zone = address.getByRole("combobox", { name: /^Ville ou zone/ });
  await expect(zone.locator("option").nth(1)).toBeAttached();
  await zone.selectOption({ index: 1 });
  await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
  await address.getByRole("textbox", { name: /^Quartier/ }).fill("Gbégamey");
  await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 9");
  await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await expect(page.getByText(/Vos kits sont réservés jusqu'au/)).toBeVisible();
  await axe(page);

  // Paiement (faux prestataire : …01 succès) → suivi
  // Carte de réseau : clic sur la carte visible (la case radio est masquée sous son libellé)
  const radio = page.getByRole("radio").first();
  await page.locator(`[id="${(await radio.getAttribute("aria-labelledby")) as string}"]`).click();
  await expect(radio).toBeChecked();
  await page.getByRole("textbox", { name: /Numéro Mobile Money/ }).fill("0197000001");
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: /Suivre ma commande/ }).click();
  await expect(page).toHaveURL(/\/parent\/commandes\/[\w-]+$/);
  const reference = page.url().split("/").pop() as string;
  await expect(page.getByText("Payée", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Suivi de livraison" })).toBeVisible();
  const codes = page.getByRole("list", { name: "Kit Codes de la commande" });
  await expect(codes.getByText(/^STEAMY-[A-Z0-9]{4}-[A-Z0-9]{4}$/).first()).toBeVisible();
  const code = (await codes.getByText(/^STEAMY-/).first().textContent()) as string;
  await axe(page);

  // WPD07 : commande payée ; facture en lien direct vers l'API, PDF produit par le worker puis redirigé vers le stockage
  await expect(async () => {
    await page.goto("/parent/commandes?statut=payees");
    await expect(page.getByRole("article", { name: `Kit : ${KIT}` }).getByRole("link", { name: /^Facture/ })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
  const row = page.getByRole("article", { name: `Kit : ${KIT}` });
  await expect(row).toContainText(`N° ${reference}`);
  await expect(row).toContainText("Pour Sika");
  const invoice = (await row.getByRole("link", { name: /^Facture/ }).getAttribute("href")) as string;
  expect(invoice).toMatch(new RegExp(`/api/payments/orders/${reference}/invoice/$`));
  const response = await page.request.get(invoice, { maxRedirects: 0 });
  expect([200, 302]).toContain(response.status());
  await axe(page);

  // Le Kit Code débloque le parcours compatible côté enfant (WA01, `kit-codes/redeem/`)
  await family.childSession.post("/api/payments/kit-codes/redeem/", { code, courseSlug: COMPATIBLE_COURSE });
  const enrollments = (await family.childSession.get("/api/learning/enrollments/")) as {
    results?: { course: { slug: string } }[];
  };
  expect((enrollments.results ?? []).map((enrollment) => enrollment.course.slug)).toContain(COMPATIBLE_COURSE);
  await page.goto(`/parent/commandes/${reference}`);
  await expect(codes.getByText("Utilisé")).toBeVisible();

  // Suppression de l'enfant bénéficiaire (WPD09, D54) : la commande et sa facture restent au parent
  const [reason] = (await family.parentSession.get("/api/referentials/deletion-reasons/")) as { code: string }[];
  await family.parentSession.post(`/api/accounts/children/${family.child.id}/deletion/`, { reason: reason.code });
  await page.goto("/parent/commandes?statut=payees");
  await expect(page.getByRole("article", { name: `Kit : ${KIT}` }).getByRole("link", { name: /^Facture/ })).toHaveAttribute(
    "href",
    invoice,
  );
  expect([200, 302]).toContain((await page.request.get(invoice, { maxRedirects: 0 })).status());
  await closeFamily(family);
});

test("un parent connecté sur le panier public est renvoyé vers le sien (C10)", async ({ page }) => {
  const { phone } = await createParent({ firstName: "Edem" });
  await loginViaApi(page, phone);
  await page.goto("/boutique/panier");
  await expect(page).toHaveURL("/parent/boutique/panier");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon panier");
});

test("la commande d'un autre payeur n'est ni listée ni lisible : « Commande introuvable »", async ({ page }) => {
  const family = await createFamily();
  const { reference } = (await family.parentSession.post("/api/payments/orders/", {
    kind: "course",
    items: [{ courseSlug: COMPATIBLE_COURSE, quantity: 1 }],
    beneficiaryId: family.child.id,
  })) as { reference: string };
  const { phone } = await createParent({ firstName: "Autre" });
  await loginViaApi(page, phone);
  await page.goto("/parent/commandes");
  await expect(page.getByRole("heading", { level: 2, name: "Aucune commande pour l'instant" })).toBeVisible();
  await page.goto(`/parent/commandes/${reference}`);
  await expect(page.getByRole("heading", { level: 2, name: "Commande introuvable" })).toBeVisible();
  await closeFamily(family);
});
