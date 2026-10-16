import type { Schemas } from "@steamy/api-client";

/** Profil de l'apprenant (`accounts/me/learner-profile/`). */
export type LearnerProfile = Schemas["LearnerProfile"];

/** « Cotonou · Cocotomey », ou la ville seule. Utilisable côté serveur et navigateur. */
export function localityLabel(locality: Pick<Schemas["Locality"], "city" | "district">): string {
  return locality.district ? `${locality.city} · ${locality.district}` : locality.city;
}
