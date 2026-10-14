import { createApiClient, type ApiClient } from "@steamy/api-client";

import type { RuntimeConfig } from "./runtime-config";

let client: Promise<ApiClient> | undefined;

async function loadClient(): Promise<ApiClient> {
  const response = await fetch("/runtime-config");
  if (!response.ok) {
    throw new Error(`Configuration indisponible (${response.status})`);
  }
  const { apiUrl }: RuntimeConfig = await response.json();
  // Cookies de session envoyés à l'API (même site, domaine parent partagé)
  return createApiClient(apiUrl, { credentials: "include" });
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
