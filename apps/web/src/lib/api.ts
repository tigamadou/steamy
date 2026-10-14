import { createApiClient } from "@steamy/api-client";
import { connection } from "next/server";

/**
 * Client de l'API Django, côté serveur uniquement.
 *
 * L'URL est lue à l'exécution (API_URL) et non au build : la même image Docker
 * est promue de staging à prod. `connection()` force l'évaluation par requête.
 */
export async function getServerApi() {
  await connection();
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    throw new Error("API_URL n'est pas défini");
  }
  return createApiClient(baseUrl);
}
