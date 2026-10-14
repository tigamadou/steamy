import { createApiClient, CSRF_COOKIE, csrfMiddleware, SESSION_COOKIE } from "@steamy/api-client";
import { cookies } from "next/headers";

/**
 * Client de l'API Django, côté serveur uniquement (Server Components, Server Functions).
 *
 * - L'URL est lue à l'exécution (API_URL) et non au build : la même image Docker
 *   est promue de staging à prod.
 * - Les cookies de session et CSRF du visiteur sont relayés : l'API voit l'utilisateur
 *   connecté. `cookies()` rend aussi le rendu dynamique (évalué à chaque requête).
 * - Les cookies que l'API renverrait (Set-Cookie) ne remontent PAS au navigateur :
 *   connexion et déconnexion passent par le client navigateur (`getBrowserApi`).
 */
export async function getServerApi() {
  const cookieStore = await cookies();
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    throw new Error("API_URL n'est pas défini");
  }

  const forwarded = [SESSION_COOKIE, CSRF_COOKIE]
    .map((name) => cookieStore.get(name))
    .filter((cookie) => cookie !== undefined)
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");

  const api = createApiClient(baseUrl, {
    headers: forwarded ? { Cookie: forwarded } : {},
    cache: "no-store",
  });
  api.use(csrfMiddleware(() => cookieStore.get(CSRF_COOKIE)?.value));
  return api;
}
