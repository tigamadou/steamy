import type { Page } from "@playwright/test";

import { decideConsent, uniquePhone } from "./api";
import { completeLearnerProfile, sendConsentRequest, startLearnerSignup } from "./signup";

/**
 * Apprenant neuf, connecté, profil complet (W03 → W15) : aucun souhait ni inscription. Pour les parcours qui
 * modifient des données de l'apprenant, sans dépendre du compte de démo partagé par les projets « bureau » et
 * « mobile » qui tournent en parallèle.
 */
export async function signUpFreshLearner(page: Page): Promise<string> {
  const username = await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: true });
  await page.goto("/inscription/apprenant/mot-de-passe");
  await completeLearnerProfile(page, "Robot2026x");
  return username;
}
