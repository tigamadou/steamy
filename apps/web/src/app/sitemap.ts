import type { MetadataRoute } from "next";

import { ARTICLES } from "@/content/blog";
import { SITE_URL } from "@/content/site";
import { LEGAL_DOCS, routes } from "@/lib/routes";

/**
 * Pages publiques indexables. Chaque étape du lot 1 ajoute les siennes : pages éditoriales ici, slugs de
 * l'API (parcours, événements) par une fonction `'use cache'`.
 */
export const SITEMAP_PATHS: string[] = [
  routes.home,
  routes.about,
  routes.blog,
  ...ARTICLES.map((article) => routes.article(article.slug)),
  routes.guides,
  ...LEGAL_DOCS.map((doc) => routes.legal(doc)),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
