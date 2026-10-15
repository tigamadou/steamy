import type { Schemas } from "@steamy/api-client";
import { cacheLife, cacheTag } from "next/cache";

import { getPublicApi } from "./api-public";
import { unwrap } from "./public-api-error";

/** Pays du `PhoneInput` (D3), lus côté serveur en cache : la page les passe au formulaire. */
export async function getCountries(): Promise<Schemas["Country"][]> {
  "use cache";
  cacheLife("hours");
  cacheTag("referentials");
  return unwrap(await getPublicApi().GET("/api/referentials/countries/"));
}
