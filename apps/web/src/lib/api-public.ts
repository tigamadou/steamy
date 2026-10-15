import { createApiClient } from "@steamy/api-client";

/** Délai maximal d'un appel de page publique : au-delà, la page affiche son état d'erreur plutôt que d'attendre. */
export const PUBLIC_API_TIMEOUT_MS = 5000;

/**
 * Client **anonyme** de l'API pour les pages publiques (lot 1, SPEC-TECHNIQUE §1.2).
 *
 * - Ne lit jamais `cookies()` ni `headers()` : la réponse ne dépend pas du visiteur et peut être mise en cache
 *   (`'use cache'`). `getServerApi()` rendrait la page dynamique : il est interdit dans `(public)` (règle ESLint).
 * - L'URL vient de `API_URL`, lue à l'exécution : appeler ce client sous `<Suspense>`, après `connection()`,
 *   car l'API n'est pas joignable au build de l'image.
 * - Délai court (`AbortSignal.timeout`) : une API lente ne bloque pas le rendu.
 */
export function getPublicApi(timeoutMs = PUBLIC_API_TIMEOUT_MS) {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    throw new Error("API_URL n'est pas défini");
  }
  return createApiClient(baseUrl, {
    fetch: (request: Request) => fetch(new Request(request, { signal: AbortSignal.timeout(timeoutMs) })),
  });
}
