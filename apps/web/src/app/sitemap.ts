import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { ARTICLES } from "@/content/blog";
import { SITE_URL } from "@/content/site";
import { getCourseSlugs } from "@/lib/catalog";
import { getEventSlugs } from "@/lib/events";
import { LEGAL_DOCS, routes } from "@/lib/routes";

/** Pages publiques fixes (éditoriales et listes). */
export const SITEMAP_PATHS: string[] = [
  routes.home,
  routes.courses,
  routes.categories,
  routes.events,
  routes.shop,
  routes.about,
  routes.blog,
  ...ARTICLES.map((article) => routes.article(article.slug)),
  routes.guides,
  ...LEGAL_DOCS.map((doc) => routes.legal(doc)),
];

/** Fiches issues de l'API (en cache) ; une source qui ne répond pas est simplement omise. */
async function apiPaths(): Promise<string[]> {
  const [courses, events] = await Promise.all([getCourseSlugs().catch(() => []), getEventSlugs().catch(() => [])]);
  return [...courses.map(routes.course), ...events.map(routes.event)];
}

/** Sitemap servi à la requête : l'API n'est pas joignable au build. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const paths = [...SITEMAP_PATHS, ...(await apiPaths())];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
