import type { ApiClient, Schemas } from "@steamy/api-client";

import { getBrowserApi } from "@/lib/api-browser";

export type ErrorCode = Schemas["ErrorCodeEnum"];

export type ApiFailure = {
  ok: false;
  code: ErrorCode;
  /** Message français de l'API (D4), repli quand l'écran n'a pas de texte propre au code. */
  message: string;
  /** Erreurs par champ (camelCase), affichées sous les champs concernés. */
  fields: Record<string, string>;
  /** Délai d'attente annoncé par l'API (`Retry-After`, en secondes) après `THROTTLED`. */
  retryAfter?: number;
};

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

type Response_<T> = { data?: T; error?: Schemas["Error"]; response: Response };

/**
 * Appel du client navigateur réduit à un résultat : données, ou code d'erreur, message, erreurs par champ et délai.
 * Un réseau injoignable devient `NETWORK_UNAVAILABLE`. Une réponse 204 renvoie `data: undefined`.
 */
export async function apiCall<T>(request: (api: ApiClient) => Promise<Response_<T>>): Promise<ApiResult<T>> {
  let result: Response_<T>;
  try {
    result = await request(await getBrowserApi());
  } catch {
    return { ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} };
  }
  const { data, error, response } = result;
  if (response.ok) return { ok: true, data: data as T };
  const fields = Object.fromEntries(
    Object.entries(error?.fields ?? {}).map(([name, errors]) => [name, errors.map((e) => e.message).join(" ")]),
  );
  return {
    ok: false,
    code: error?.code ?? "SERVER_ERROR",
    message: error?.message ?? "",
    fields,
    retryAfter: Number(response.headers.get("Retry-After")) || undefined,
  };
}

/** Registre de l'écran (C2) : tutoiement pour l'apprenant, vouvoiement pour le parent, l'enseignant et le reset. */
export type Register = "tu" | "vous";

/**
 * Message d'une erreur sans texte propre à l'écran : réseau, plafond, panne, sinon le message de l'API.
 * Les écrans traitent d'abord leurs codes métier (voir LOT-2-AUTH, « Codes d'erreur »).
 */
export function errorMessage(failure: Pick<ApiFailure, "code" | "message" | "retryAfter">, register: Register): string {
  const tu = register === "tu";
  switch (failure.code) {
    case "NETWORK_UNAVAILABLE":
      return tu
        ? "Le serveur est injoignable. Vérifie ta connexion internet puis réessaie."
        : "Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez.";
    case "THROTTLED": {
      const when = failure.retryAfter ? `dans ${failure.retryAfter} secondes` : "dans quelques instants";
      return tu ? `Trop de tentatives. Réessaie ${when}.` : `Trop de tentatives. Réessayez ${when}.`;
    }
    case "SERVER_ERROR":
      return tu
        ? "Une erreur est survenue de notre côté. Réessaie dans quelques instants."
        : "Une erreur est survenue de notre côté. Réessayez dans quelques instants.";
    default:
      return (
        failure.message ||
        (tu ? "Une erreur est survenue. Réessaie." : "Une erreur est survenue. Réessayez.")
      );
  }
}
