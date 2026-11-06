import type { ApiClient, Schemas } from "@steamy/api-client";

import { apiCall, type ApiResult } from "@/lib/api-call";

/**
 * `apiCall` qui garde en plus le statut HTTP : le back-office distingue des réponses qui portent le même code d'erreur
 * (`VALIDATION_ERROR` en 400 pour un champ, en 409 pour un état qui a changé entre-temps). `0` : réseau injoignable.
 */
export async function callWithStatus<T>(
  request: (api: ApiClient) => Promise<{ data?: T; error?: Schemas["Error"]; response: Response }>,
): Promise<{ result: ApiResult<T>; status: number }> {
  let status = 0;
  const result = await apiCall<T>(async (api) => {
    const answer = await request(api);
    status = answer.response.status;
    return answer;
  });
  return { result, status };
}
