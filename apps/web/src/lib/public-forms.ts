import type { Schemas } from "@steamy/api-client";

import { getBrowserApi } from "./api-browser";
import { fieldMessages, retryAfterSeconds } from "./api-errors";

// Envoi des formulaires publics (`POST public/*`, anonymes, CSRF) depuis le navigateur.

export type PublicFormResult =
  | { ok: true }
  | {
      ok: false;
      code: Schemas["ErrorCodeEnum"];
      message: string;
      /** Messages par champ (clés de l'API, en camelCase). */
      fields: Record<string, string>;
      retryAfter?: number;
    };

type PublicFormPath = "/api/public/quote-requests/" | "/api/public/contact-messages/" | "/api/public/leads/";

/** Champ piège anti-robot : envoyé vide, toujours (un robot le remplit). */
export const HONEYPOT_FIELD = "website";

/** Envoie un formulaire public ; une coupure réseau devient `NETWORK_UNAVAILABLE` (le formulaire reste rempli). */
export async function submitPublicForm(path: PublicFormPath, body: Record<string, unknown>): Promise<PublicFormResult> {
  try {
    const api = await getBrowserApi();
    // Chemins typés un à un par le client ; le corps est validé par l'API (erreurs `fields`).
    const post = api.POST as unknown as (
      path: PublicFormPath,
      init: { body: Record<string, unknown> },
    ) => Promise<{ data?: unknown; error?: Partial<Schemas["Error"]>; response: Response }>;
    const { error, response } = await post(path, { body });
    if (response.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      code: error?.code ?? "SERVER_ERROR",
      message: error?.message ?? "Une erreur est survenue. Réessayez dans quelques instants.",
      fields: fieldMessages(error),
      retryAfter: retryAfterSeconds(response),
    };
  } catch {
    return {
      ok: false,
      code: "NETWORK_UNAVAILABLE",
      message: "Votre demande n'a pas pu être envoyée (connexion interrompue). Réessayez dans un instant.",
      fields: {},
    };
  }
}
