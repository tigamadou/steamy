import type { Schemas } from "@steamy/api-client";
import { cacheLife, cacheTag } from "next/cache";

import { getPublicApi } from "./api-public";
import { unwrap } from "./public-api-error";

// Steamy Events publics (API-L1.3), en cache étiqueté `events`. À appeler sous `<Suspense>`, après `connection()`.

/** Événements à venir ou en cours, du plus proche au plus lointain (WL21). */
export async function getUpcomingEvents(): Promise<Schemas["SteamyEvent"][]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const data = unwrap(
    await getPublicApi().GET("/api/events/", { params: { query: { upcoming: true, pageSize: 50 } } }),
  );
  return data.results ?? [];
}

/** Fiche d'un événement publié (WL23) ; `null` s'il n'existe pas ou n'est pas publié. */
export async function getEvent(slug: string): Promise<Schemas["SteamyEventDetail"] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const result = await getPublicApi().GET("/api/events/{slug}/", { params: { path: { slug } } });
  if (result.response.status === 404) {
    return null;
  }
  return unwrap(result);
}

/** Slugs des événements publiés (passés compris), pour le sitemap. */
export async function getEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const slugs: string[] = [];
  for (let page = 1; ; page += 1) {
    const data = unwrap(await getPublicApi().GET("/api/events/", { params: { query: { page, pageSize: 100 } } }));
    slugs.push(...(data.results ?? []).map((event) => event.slug));
    if (!data.next) {
      return slugs;
    }
  }
}
