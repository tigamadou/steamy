import { getServerApi } from "@/lib/api";

import type { LearnerProfile } from "./locality";

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
