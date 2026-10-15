import { getBrowserApi } from "@/lib/api-browser";

/**
 * Préfixe des seules valeurs que les parcours d'authentification gardent en `sessionStorage` (`challengeId`,
 * jeton de consentement en attente, code de reprise) : jamais de donnée personnelle, purgées en fin de flux.
 */
export const FLOW_STORAGE_PREFIX = "steamy:";

/** Efface les valeurs de parcours de l'onglet (fin de flux, déconnexion). */
export function clearFlowStorage(): void {
  const keys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i));
  for (const key of keys) {
    if (key?.startsWith(FLOW_STORAGE_PREFIX)) sessionStorage.removeItem(key);
  }
}

/**
 * Ferme la session côté API (`POST auth/logout/`, cookie supprimé par la réponse) puis purge l'onglet.
 * L'appelant navigue ensuite (`router.replace()` puis `router.refresh()`).
 */
export async function logout(): Promise<void> {
  const api = await getBrowserApi();
  const { response } = await api.POST("/api/auth/logout/");
  if (!response.ok) {
    throw new Error(`Déconnexion impossible (${response.status})`);
  }
  clearFlowStorage();
}
