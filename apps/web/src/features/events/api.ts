import type { Schemas } from "@steamy/api-client";

import { getServerApi } from "@/lib/api";
import { ApiReadError } from "@/lib/api-read";

// Lectures de Steamy Events pour l'apprenant (WD10, WL23, WD11), côté serveur et sans cache : places restantes,
// candidatures et tickets sont toujours ceux du moment. À appeler sous `<Suspense>`.

/** Taille de page maximale de l'API. */
const PAGE_SIZE = 100;

/** Nombre d'événements à venir affichés par WD10 (comme le calendrier public WL21). */
export const UPCOMING_EVENTS = 50;

type Read<T> = { data?: T; error?: unknown; response: Response };

function dataOf<T>({ data, error, response }: Read<T>): T {
  if (!response.ok || data === undefined) {
    throw new ApiReadError(response.status, error as Partial<Schemas["Error"]> | undefined);
  }
  return data;
}

/** Événements publiés à venir ou en cours, du plus proche au plus lointain. */
export async function getUpcomingEvents(): Promise<Schemas["SteamyEvent"][]> {
  const api = await getServerApi();
  const data = dataOf(
    await api.GET("/api/events/", { params: { query: { upcoming: true, pageSize: UPCOMING_EVENTS } } }),
  );
  return data.results ?? [];
}

/** Fiche d'un événement publié ; `null` s'il n'existe pas ou n'est plus publié. */
export async function getEvent(slug: string): Promise<Schemas["SteamyEventDetail"] | null> {
  const api = await getServerApi();
  const result = await api.GET("/api/events/{slug}/", { params: { path: { slug } } });
  if (result.response.status === 404) return null;
  return dataOf(result);
}

/** Toutes les candidatures de l'apprenant connecté (quelques-unes au plus), les plus récentes d'abord. */
export async function getMyApplications(): Promise<Schemas["Application"][]> {
  const api = await getServerApi();
  const applications: Schemas["Application"][] = [];
  for (let page = 1; ; page += 1) {
    const data = dataOf(await api.GET("/api/events/applications/", { params: { query: { page, pageSize: PAGE_SIZE } } }));
    applications.push(...(data.results ?? []));
    if (!data.next) return applications;
  }
}

/** Tickets Steamy Events de l'apprenant (D33), utilisés ou non. */
export async function getMyTickets(): Promise<Schemas["Ticket"][]> {
  const api = await getServerApi();
  return dataOf(await api.GET("/api/events/tickets/"));
}
