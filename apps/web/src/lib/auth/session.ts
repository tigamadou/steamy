import { cache } from "react";

import { getServerApi } from "@/lib/api";

import type { Me } from "./home-for-role";

/**
 * Utilisateur connecté, lu côté serveur (`GET accounts/me/`), une fois par requête.
 * `null` si la session est absente ou expirée (401/403). Lit `cookies()` : à appeler sous `<Suspense>`
 * (cacheComponents), jamais au niveau racine d'un layout.
 */
export const getCurrentUser = cache(async (): Promise<Me | null> => {
  const api = await getServerApi();
  const { data, response } = await api.GET("/api/accounts/me/");
  if (data) return data;
  if (response.status === 401 || response.status === 403) return null;
  throw new Error(`Session illisible (${response.status})`);
});
