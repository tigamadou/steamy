import { createApiClient, CSRF_COOKIE, csrfMiddleware, type ApiClient } from "@steamy/api-client";

import type { RuntimeConfig } from "./runtime-config";

let client: Promise<ApiClient> | undefined;

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

async function loadClient(): Promise<ApiClient> {
  const response = await fetch("/runtime-config");
  if (!response.ok) {
    throw new Error(`Configuration indisponible (${response.status})`);
  }
  const { apiUrl }: RuntimeConfig = await response.json();

  // Cookies de session envoyés à l'API (même site, domaine parent partagé)
  const api = createApiClient(apiUrl, { credentials: "include" });

  // Jeton CSRF : lu dans le cookie `csrftoken` (posé sur le domaine parent),
  // demandé à l'API s'il n'existe pas encore (première visite).
  api.use(
    csrfMiddleware(async () => {
      const fromCookie = readCookie(CSRF_COOKIE);
      if (fromCookie) {
        return fromCookie;
      }
      const { data } = await api.GET("/api/auth/csrf/");
      return data?.csrfToken;
    }),
  );
  return api;
}

/**
 * Client de l'API Django, côté navigateur (composants client).
 * Créé une seule fois par page ; réessaie au prochain appel en cas d'échec.
 */
export function getBrowserApi(): Promise<ApiClient> {
  if (typeof window === "undefined") {
    throw new Error("getBrowserApi() est réservé au navigateur : utiliser getServerApi()");
  }
  client ??= loadClient().catch((error: unknown) => {
    client = undefined;
    throw error;
  });
  return client;
}
