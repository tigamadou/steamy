import type { Schemas } from "@steamy/api-client";

import { getServerApi } from "@/lib/api";
import { ApiReadError } from "@/lib/api-read";

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

type Read<T> = { data?: T; error?: unknown; response: Response };

/** Donnée facultative : `null` si l'API répond 404 (rien d'enregistré), erreur remontée à `error.tsx` sinon. */
function optional<T>({ data, error, response }: Read<T>): T | null {
  if (response.status === 404) return null;
  if (!response.ok || data === undefined) {
    throw new ApiReadError(response.status, error as Partial<Schemas["Error"]> | undefined);
  }
  return data;
}

/** WD19 : adresse de livraison enregistrée (`accounts/me/delivery-address/`), ou `null`. */
export async function getDeliveryAddress(): Promise<Schemas["DeliveryAddress"] | null> {
  const api = await getServerApi();
  return optional(await api.GET("/api/accounts/me/delivery-address/"));
}

/** WD22 : parent lié à l'apprenant (`accounts/me/parent/`), sans numéro ni email ; `null` sans lien. */
export async function getMyParent(): Promise<Schemas["MyParent"] | null> {
  const api = await getServerApi();
  return optional(await api.GET("/api/accounts/me/parent/"));
}

/** WD15 : dernière demande de suppression du compte (`accounts/me/deletion-request/`), ou `null`. */
export async function getDeletionRequest(): Promise<Schemas["DeletionRequest"] | null> {
  const api = await getServerApi();
  return optional(await api.GET("/api/accounts/me/deletion-request/"));
}
