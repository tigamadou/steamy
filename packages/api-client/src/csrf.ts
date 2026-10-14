import type { Middleware } from "openapi-fetch";

/** Noms des cookies posés par Django (valeurs par défaut de SESSION/CSRF_COOKIE_NAME). */
export const SESSION_COOKIE = "sessionid";
export const CSRF_COOKIE = "csrftoken";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

/**
 * Ajoute l'en-tête X-CSRFToken aux requêtes qui modifient des données,
 * exigé par Django pour toute requête authentifiée par session.
 */
export function csrfMiddleware(getToken: () => string | undefined | Promise<string | undefined>): Middleware {
  return {
    async onRequest({ request }) {
      if (SAFE_METHODS.has(request.method)) {
        return;
      }
      const token = await getToken();
      if (token) {
        request.headers.set("X-CSRFToken", token);
      }
      return request;
    },
  };
}
