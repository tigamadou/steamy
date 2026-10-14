// Client typé de l'API Django. Les types viennent de apps/api/openapi.yaml :
// ne jamais éditer schema.d.ts à la main, lancer `pnpm api-client:generate`.
import createClient, { type ClientOptions } from "openapi-fetch";

import type { components, paths } from "./schema";

export type { components, paths };
export type Schemas = components["schemas"];

export function createApiClient(baseUrl: string, options: Omit<ClientOptions, "baseUrl"> = {}) {
  return createClient<paths>({ baseUrl, ...options });
}

export type ApiClient = ReturnType<typeof createApiClient>;
