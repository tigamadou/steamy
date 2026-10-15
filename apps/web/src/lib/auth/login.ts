import { apiCall, type ApiResult } from "@/lib/api-call";

import type { Me } from "./home-for-role";

/**
 * `POST auth/login/` par le client navigateur : le `Set-Cookie` de session doit atteindre le navigateur, ce qu'une
 * Server Action ne permet pas (voir `lib/api.ts`). Le jeton CSRF tourne à la connexion : il est relu au cookie.
 */
export async function login(identifier: string, password: string): Promise<ApiResult<Me>> {
  const result = await apiCall((api) => api.POST("/api/auth/login/", { body: { identifier, password } }));
  return result.ok ? { ok: true, data: result.data.user } : result;
}
