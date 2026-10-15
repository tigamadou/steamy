import type { Schemas } from "@steamy/api-client";

/** Échec d'un appel du client public : affiché par l'enveloppe WX02 de la section concernée. */
export class PublicApiError extends Error {
  readonly status: number;

  constructor(status: number, error?: Partial<Schemas["Error"]>) {
    super(error?.message ?? `Réponse inattendue de l'API (${status})`);
    this.name = "PublicApiError";
    this.status = status;
  }
}

/** Lève `PublicApiError` si la réponse est en erreur, sinon renvoie ses données. */
export function unwrap<T>({ data, error, response }: { data?: T; error?: unknown; response: Response }): T {
  if (error !== undefined || data === undefined) {
    throw new PublicApiError(response.status, error as Partial<Schemas["Error"]> | undefined);
  }
  return data;
}
