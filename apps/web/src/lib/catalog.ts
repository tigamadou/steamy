import type { paths, Schemas } from "@steamy/api-client";
import { cacheLife, cacheTag } from "next/cache";

import { getPublicApi } from "./api-public";
import { PublicApiError, unwrap } from "./public-api-error";

// Catalogue public (API-L1) : données mises en cache quelques minutes, étiquetées `catalog` pour une
// revalidation à la publication (lot 6). À appeler sous `<Suspense>`, après `connection()`.

/** Parcours par page de WL06 (grille de 3 colonnes). */
export const COURSES_PAGE_SIZE = 9;

export type CoursePage = { count: number; results: Schemas["CourseList"][]; hasNext: boolean };

export async function getCategories(): Promise<Schemas["Category"][]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return unwrap(await getPublicApi().GET("/api/catalog/categories/"));
}

export type CourseQuery = NonNullable<paths["/api/catalog/courses/"]["get"]["parameters"]["query"]>;

/** Parcours publiés, filtrés et triés (WL06, WC01) : la réponse ne dépend pas du visiteur, elle est mise en cache. */
export async function getCourses({ page = 1, pageSize = COURSES_PAGE_SIZE, ...filters }: CourseQuery): Promise<CoursePage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  try {
    const data = unwrap(
      await getPublicApi().GET("/api/catalog/courses/", {
        params: { query: { ...filters, page, pageSize } },
      }),
    );
    return { count: data.count ?? 0, results: data.results ?? [], hasNext: !!data.next };
  } catch (error) {
    // Page au-delà de la dernière (URL saisie à la main) : liste vide plutôt qu'une erreur
    if (error instanceof PublicApiError && error.status === 404) {
      return { count: 0, results: [], hasNext: false };
    }
    throw error;
  }
}

/** Fiche d'un parcours publié (WL22), sans contenu de mission (D11) ; `null` s'il n'existe pas. */
export async function getCourse(slug: string): Promise<Schemas["CourseDetail"] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const result = await getPublicApi().GET("/api/catalog/courses/{slug}/", { params: { path: { slug } } });
  if (result.response.status === 404) {
    return null;
  }
  return unwrap(result);
}

/**
 * Trois parcours de l'accueil (WL01) : les parcours mis en avant, complétés par les plus populaires s'il en manque.
 */
export async function getHomeCourses(): Promise<Schemas["CourseList"][]> {
  const featured = (await getCourses({ featured: true, pageSize: 3 })).results;
  if (featured.length >= 3) {
    return featured;
  }
  const popular = (await getCourses({ pageSize: 6 })).results.filter(
    (course) => !featured.some((f) => f.slug === course.slug),
  );
  return [...featured, ...popular].slice(0, 3);
}

/** Trois parcours gratuits de difficulté débutant, suggérés à l'apprenant qui n'a rien à reprendre (WD02, D27). */
export async function getStarterCourses(): Promise<Schemas["CourseList"][]> {
  return (await getCourses({ price: "free", difficulty: "beginner", pageSize: 3 })).results;
}

/** Slugs de tous les parcours publiés, pour le sitemap. */
export async function getCourseSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const slugs: string[] = [];
  for (let page = 1; ; page += 1) {
    const { results, hasNext } = await getCourses({ page, pageSize: 100 });
    slugs.push(...results.map((course) => course.slug));
    if (!hasNext) {
      return slugs;
    }
  }
}
