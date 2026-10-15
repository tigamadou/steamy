import type { Schemas } from "@steamy/api-client";

import { getServerApi } from "@/lib/api";

// État personnel de l'apprenant sur le catalogue (§7 du plan) : le catalogue reste en cache, indépendant de la
// session ; souhaits et inscriptions sont lus une fois par page et fusionnés à l'affichage.

/** Taille de page maximale de l'API. */
const PAGE_SIZE = 100;

type Page<T> = { results?: T[]; next?: string | null };
type Read<T> = { data?: Page<T>; error?: Schemas["Error"]; response: Response };

/** Toutes les pages d'une liste de l'apprenant (souhaits ou inscriptions, quelques dizaines au plus). */
async function readAll<T>(read: (page: number) => Promise<Read<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error, response } = await read(page);
    if (!response.ok || !data) {
      throw new Error(error?.message ?? `Lecture impossible (${response.status})`);
    }
    items.push(...(data.results ?? []));
    if (!data.next) return items;
  }
}

export type WishlistSort = "recent" | "title" | "price";

/** Souhaits de l'apprenant (WW01), dans l'ordre demandé. */
export async function getWishlist(sort: WishlistSort = "recent"): Promise<Schemas["WishlistItem"][]> {
  const api = await getServerApi();
  return readAll((page) => api.GET("/api/wishlist/", { params: { query: { page, pageSize: PAGE_SIZE, sort } } }));
}

/** Inscriptions de l'apprenant, en cours et terminées. */
export async function getEnrollments(): Promise<Schemas["Enrollment"][]> {
  const api = await getServerApi();
  return readAll((page) => api.GET("/api/learning/enrollments/", { params: { query: { page, pageSize: PAGE_SIZE } } }));
}

export type LearnerCourseState = {
  /** Slugs des parcours en souhaits. */
  wished: string[];
  /** Progression (API) de chaque parcours suivi, par slug. */
  progress: Record<string, number>;
};

/** Souhaits et inscriptions, lus en parallèle. */
export async function getLearnerCourseState(): Promise<LearnerCourseState> {
  const [wishlist, enrollments] = await Promise.all([getWishlist(), getEnrollments()]);
  return {
    wished: wishlist.map((item) => item.course.slug),
    progress: Object.fromEntries(enrollments.map((e) => [e.course.slug, e.progressPct])),
  };
}
