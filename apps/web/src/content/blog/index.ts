import type { MDXContent } from "mdx/types";

import * as accompagnerSonEnfant from "./accompagner-son-enfant.mdx";
import * as debuterEnRobotique from "./debuter-en-robotique.mdx";
import * as projetsScratchEte from "./projets-scratch-ete.mdx";
import * as steamyEventsAtelier from "./steamy-events-atelier.mdx";

// Articles du blog (WL17, WL18) en MDX (D10). Un article ne montre un mineur que sous pseudonyme et avatar (D15).

export type ArticleMeta = {
  title: string;
  excerpt: string;
  /** Libellé de catégorie (pas de page dédiée). */
  category: string;
  emoji: string;
  /** Couleur du visuel : un token (`var(--cat-ia)`). */
  color: string;
  /** Auteur adulte de l'équipe. */
  author: string;
  authorEmoji: string;
  /** Date de publication, ISO `AAAA-MM-JJ`. */
  publishedAt: string;
  readingMinutes: number;
};

export type Article = ArticleMeta & { slug: string; Content: MDXContent };

type ArticleModule = { default: MDXContent; metadata: unknown };

const MODULES: Record<string, ArticleModule> = {
  "debuter-en-robotique": debuterEnRobotique,
  "accompagner-son-enfant": accompagnerSonEnfant,
  "steamy-events-atelier": steamyEventsAtelier,
  "projets-scratch-ete": projetsScratchEte,
};

/** Articles du plus récent au plus ancien ; le premier est « à la une ». */
export const ARTICLES: Article[] = Object.entries(MODULES)
  .map(([slug, module]) => ({ slug, ...(module.metadata as ArticleMeta), Content: module.default }))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

/** Articles par page : au-delà, le blog est paginé (routes statiques `/blog/page/<n>`). */
export const BLOG_PAGE_SIZE = 9;

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
