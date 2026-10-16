import type { Schemas } from "@steamy/api-client";

import { getServerApi } from "@/lib/api";

export type LearnerProfile = Schemas["LearnerProfile"];

/**
 * Profil de l'apprenant connecté (`GET accounts/me/learner-profile/`), côté serveur : WD13 l'affiche, WD17 en
 * préremplit le formulaire. Lit la session : à appeler sous `<Suspense>`. Une réponse illisible remonte à
 * `error.tsx` du shell (WX02).
 */
export async function getLearnerProfile(): Promise<LearnerProfile> {
  const api = await getServerApi();
  const { data, response } = await api.GET("/api/accounts/me/learner-profile/");
  if (!data) throw new Error(`Profil illisible (${response.status})`);
  return data;
}

/** « Cotonou · Cocotomey », ou la ville seule. */
export function localityLabel(locality: Pick<Schemas["Locality"], "city" | "district">): string {
  return locality.district ? `${locality.city} · ${locality.district}` : locality.city;
}
