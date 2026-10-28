import { expect, type Page } from "@playwright/test";

// Formulaire de paiement Mobile Money (`PaymentForm`) et horloge des tests fonctionnels sur fixtures.

/** Carte de réseau : clic sur la carte visible (la case radio est masquée sous son libellé). */
export async function chooseNetwork(page: Page, index = 0) {
  const radio = page.getByRole("radio").nth(index);
  const label = (await radio.getAttribute("aria-labelledby")) as string;
  await page.locator(`[id="${label}"]`).click();
  await expect(radio).toBeChecked();
}

/**
 * Fige l'horloge de la page : l'interrogation du statut (toutes les 3 s) n'avance plus que sur `fastForward`, le test ne
 * dépend plus de la vitesse de la machine. Pas d'attente réelle de 3 s ni de 2 minutes.
 * À appeler APRÈS l'affichage du formulaire (`ready`) : une horloge figée pendant l'hydratation bloque le chargement des
 * réseaux ; n'avancer qu'une fois le panneau d'attente monté, sinon la minuterie n'existe pas encore.
 */
export async function freezeClock(page: Page, { ready = true } = {}) {
  if (ready) await expect(page.getByRole("radio").first()).toBeVisible();
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1_000);
}

export const phoneField = (page: Page) => page.getByRole("textbox", { name: /Numéro Mobile Money/ });
export const payButton = (page: Page) => page.getByRole("button", { name: /^Payer/ });

/** Choisit le premier réseau, saisit le numéro et paie (le dernier chiffre pilote l'issue : 1 réussi, 2 échoué, 3 en attente). */
export async function pay(page: Page, national: string, options: { double?: boolean } = {}) {
  await chooseNetwork(page);
  await phoneField(page).fill(national);
  if (options.double) await payButton(page).dblclick();
  else await payButton(page).click();
}
