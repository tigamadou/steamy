import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { closeFamily, createFamily, type Family } from "../support/family";
import { loginViaApi } from "../support/session";

// LOT-4 étape 4.6 · Steamy Events du parent : WPD06 (candidatures des enfants), WL23 dans le shell, WPD12. Familles
// neuves à chaque passage. Jeu D2 : « Défi robots de Cotonou » payant (5 000 F CFA) et ouvert, « Hackathon IA
// junior » complet. Faux prestataire : numéro en …01 accepté.

const PAID_EVENT = { slug: "defi-robots-cotonou", title: "Défi robots de Cotonou" };
const FULL_EVENT = { slug: "hackathon-ia", title: "Hackathon IA junior" };

async function axe(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  // Aucun défilement horizontal, même à 360 px
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** Réseau MTN du Bénin (clic sur la carte visible, la radio est masquée), numéro de test, « Payer ». */
async function pay(page: Page, national: string) {
  await page.getByText("MTN Mobile Money", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "MTN Mobile Money" })).toBeChecked();
  await page.getByRole("textbox", { name: /Numéro Mobile Money/ }).fill(national);
  await page.getByRole("button", { name: /^Payer \d/ }).click();
}

/** L'enfant candidate à l'événement payant (WD11, par l'API) ; renvoie l'identifiant de la candidature. */
async function apply(family: Family): Promise<number> {
  const { id } = (await family.childSession.post(`/api/events/${PAID_EVENT.slug}/applications/`, {
    motivation: "J'aimerais construire un robot.",
    selfLevel: "beginner",
  })) as { id: number };
  return id;
}

/** Statut de la candidature côté enfant (WD10). */
async function childStatus(family: Family, id: number): Promise<string | undefined> {
  const list = (await family.childSession.get("/api/events/applications/")) as {
    results?: { id: number; status: string }[];
  };
  return (list.results ?? []).find((application) => application.id === id)?.status;
}

/** Candidature de l'enfant dans « Demandes de mes enfants » (WPD06). */
function applicationRow(page: Page) {
  return page.getByRole("list", { name: "Candidatures de mes enfants" }).getByRole("article", { name: PAID_EVENT.title });
}

test("WPD06 : l'enfant candidate à un événement payant, le parent accepte et paie, la candidature est acceptée", async ({
  page,
}) => {
  const family = await createFamily();
  const id = await apply(family);
  expect(await childStatus(family, id)).toBe("pending_parent");
  await loginViaApi(page, family.parentPhone);

  await page.goto("/parent/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Steamy Events");
  const row = applicationRow(page);
  await expect(row.getByText("À examiner")).toBeVisible();
  await axe(page);

  // Accord : la commande d'événement est créée par l'API, la place est réservée jusqu'au paiement (D53 amendé)
  await row.getByRole("button", { name: /^Accepter/ }).click();
  await expect(page.getByText(/Place réservée jusqu'au/)).toBeVisible();
  expect(await childStatus(family, id)).toBe("pending_payment");
  await pay(page, "0197000001");
  await expect(page.getByText(/La participation de Yao à/)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => childStatus(family, id), { timeout: 15_000 }).toBe("accepted");
  await closeFamily(family);
});

test("WPD06 : refus motivé, notifié à l'enfant", async ({ page }) => {
  const family = await createFamily();
  const id = await apply(family);
  await loginViaApi(page, family.parentPhone);
  await page.goto("/parent/evenements");
  await applicationRow(page).getByRole("button", { name: /^Refuser/ }).click();
  const dialog = page.getByRole("dialog", { name: "Refuser la candidature de Yao ?" });
  await dialog.getByRole("textbox", { name: /Motif/ }).fill("Pas pendant les examens.");
  await dialog.getByRole("button", { name: "Refuser la candidature" }).click();
  await expect(applicationRow(page).getByText("Refusée")).toBeVisible();
  await expect.poll(() => childStatus(family, id)).toBe("refused");
  const notifications = (await family.childSession.get("/api/notifications/")) as { results?: { title: string }[] };
  expect((notifications.results ?? []).length).toBeGreaterThan(0);
  await closeFamily(family);
});

test("WL23 → WPD12 : inscription directe d'un enfant à un événement payant, paiement compris", async ({ page }) => {
  const family = await createFamily({ childFirstName: "Kofi" });
  await loginViaApi(page, family.parentPhone);

  // WL23 dans le shell parent
  await page.goto(`/parent/evenements/${PAID_EVENT.slug}`);
  await expect(page.getByRole("heading", { level: 2, name: PAID_EVENT.title })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Inscrire un enfant", exact: true }).click();

  // WPD12 : enfant actif, récapitulatif, paiement
  await expect(page).toHaveURL(`/parent/evenements/${PAID_EVENT.slug}/inscription`);
  await page.getByRole("combobox", { name: /^Enfant/ }).selectOption({ label: "Kofi Test" });
  await axe(page);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByText(/Place réservée jusqu'au/)).toBeVisible();
  await pay(page, "0197000001");
  await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const list = (await family.childSession.get("/api/events/applications/")) as {
        results?: { status: string; event: { slug: string } }[];
      };
      return (list.results ?? []).find((application) => application.event.slug === PAID_EVENT.slug)?.status;
    })
    .toBe("accepted");
  await closeFamily(family);
});

test("WL23 et WPD12 : un événement complet ne peut être ni demandé ni payé", async ({ page }) => {
  const family = await createFamily();
  await loginViaApi(page, family.parentPhone);
  await page.goto(`/parent/evenements/${FULL_EVENT.slug}`);
  await expect(page.getByRole("button", { name: "Complet" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Inscrire un enfant", exact: true })).toHaveCount(0);
  await page.goto(`/parent/evenements/${FULL_EVENT.slug}/inscription`);
  await expect(page.getByRole("status").filter({ hasText: "Toutes les places sont prises." })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Payer/ })).toHaveCount(0);
  await closeFamily(family);
});
