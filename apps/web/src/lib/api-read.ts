import type { Schemas } from "@steamy/api-client";

/** Échec d'une lecture côté serveur : affiché par le `error.tsx` du segment (WX02). */
export class ApiReadError extends Error {
  readonly status: number;

  constructor(status: number, error?: Partial<Schemas["Error"]>) {
    super(error?.message || `Réponse inattendue de l'API (${status})`);
    this.name = "ApiReadError";
    this.status = status;
  }
}

/**
 * Données d'une lecture de `getServerApi()` dans un espace connecté.
 *
 * - `null` sans session (401) ou hors rôle (403) : les layouts d'App Router se rendent en parallèle de la page, la
 *   garde de rôle du layout redirige déjà ; la page ne rend alors rien.
 * - Toute autre erreur lève `ApiReadError`, affichée par l'enveloppe d'erreur du segment.
 */
export function readOrNull<T>({ data, error, response }: { data?: T; error?: unknown; response: Response }): T | null {
  if (response.status === 401 || response.status === 403) return null;
  if (error !== undefined || data === undefined) {
    throw new ApiReadError(response.status, error as Partial<Schemas["Error"]> | undefined);
  }
  return data;
}
