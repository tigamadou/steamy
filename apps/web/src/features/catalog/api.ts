import type { Schemas } from "@steamy/api-client";

import { apiCall, errorMessage, type ApiFailure, type ApiResult } from "@/lib/api-call";

// Écritures du catalogue de l'apprenant (WC01-WC05, WW01-WW03), par le client navigateur (CSRF automatique).

/** Ajoute un parcours aux souhaits (`PUT`, idempotent : 201 ou 200). */
export function addToWishlist(slug: string): Promise<ApiResult<Schemas["WishlistItem"]>> {
  return apiCall((api) => api.PUT("/api/wishlist/{course_slug}/", { params: { path: { course_slug: slug } } }));
}

/** Retire un parcours des souhaits (`DELETE`, 204 qu'il y soit ou non) ; annulable par un nouveau `PUT`. */
export function removeFromWishlist(slug: string): Promise<ApiResult<undefined>> {
  return apiCall((api) =>
    api.DELETE("/api/wishlist/{course_slug}/", { params: { path: { course_slug: slug } } }),
  ) as Promise<ApiResult<undefined>>;
}

/** Inscription à un parcours gratuit (D27) ; déjà inscrit : l'inscription existante. */
export function enroll(slug: string): Promise<ApiResult<Schemas["Enrollment"]>> {
  return apiCall((api) => api.POST("/api/learning/enrollments/", { body: { courseSlug: slug } }));
}

/** Message d'un échec au tutoiement : texte de l'API pour les codes métier, message générique sinon. */
export function failureMessage(result: ApiResult<unknown>): string | null {
  return result.ok ? null : errorMessage(result as ApiFailure, "tu");
}
