import type { Schemas } from "@steamy/api-client";

import { getBrowserApi } from "@/lib/api-browser";

import type { Me } from "./home-for-role";

export type LoginFailure = {
  ok: false;
  code: Schemas["ErrorCodeEnum"];
  /** Message français de l'API (D4), repli quand l'écran n'a pas de texte propre au code. */
  message: string;
  /** Délai d'attente annoncé par l'API (`Retry-After`, en secondes) après `THROTTLED`. */
  retryAfter?: number;
};

export type LoginResult = { ok: true; user: Me } | LoginFailure;

/**
 * `POST auth/login/` par le client navigateur : le `Set-Cookie` de session doit atteindre le navigateur, ce qu'une
 * Server Action ne permet pas (voir `lib/api.ts`). Le jeton CSRF tourne à la connexion : il est relu au cookie.
 */
export async function login(identifier: string, password: string): Promise<LoginResult> {
  try {
    const api = await getBrowserApi();
    const { data, error, response } = await api.POST("/api/auth/login/", { body: { identifier, password } });
    if (data) return { ok: true, user: data.user };
    const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
    return { ok: false, code: error.code, message: error.message, retryAfter };
  } catch {
    return {
      ok: false,
      code: "NETWORK_UNAVAILABLE",
      message: "Le serveur est injoignable. Vérifie ta connexion internet puis réessaie.",
    };
  }
}
