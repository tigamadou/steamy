import Link from "next/link";
import type { CSSProperties } from "react";

import { Avatar, Badge, buttonClasses, Icon } from "@/components/ds";
import type { Article } from "@/content/blog";
import type { Guide } from "@/content/guides";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/dates";
import { routes } from "@/lib/routes";

// Cartes et lignes du contenu éditorial (WL17, WL18, WL20).

/** Visuel coloré porté par un token (`--visual`), emoji décoratif. */
function Visual({ color, emoji, className }: { color: string; emoji: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("flex items-center justify-center bg-(--visual)", className)}
      style={{ "--visual": color } as CSSProperties}
    >
      {emoji}
    </span>
  );
}

/** « Par Auteur · 28 mai 2026 · 6 min de lecture ». */
export function ArticleByline({ article, avatar }: { article: Article; avatar?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] font-bold text-ink-600">
      {avatar && <Avatar name={article.author} emoji={article.authorEmoji} size={40} decorative />}
      <p>
        Par {article.author} · <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time> ·{" "}
        {article.readingMinutes} min de lecture
      </p>
    </div>
  );
}

/** Article mis en avant de WL17 : grand visuel, catégorie, chapô, ligne d'auteur. */
export function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-[22px] border-[1.5px] border-ink-100 bg-surface hover:shadow-card-hover">
      <Visual color={article.color} emoji={article.emoji} className="h-52 text-[88px] sm:h-65" />
      <div className="flex flex-col gap-3 p-6">
        <Badge tone="primary" className="self-start">
          À la une · {article.category}
        </Badge>
        <h2 className="text-2xl leading-tight font-black text-ink-900">
          <Link
            href={routes.article(article.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-[22px] after:focus-visible:outline-3 after:focus-visible:outline-primary-500"
          >
            {article.title}
          </Link>
        </h2>
        <p className="text-sm leading-relaxed font-semibold text-ink-600">{article.excerpt}</p>
        <ArticleByline article={article} />
      </div>
    </article>
  );
}

/** Article secondaire de WL17 : vignette, catégorie, titre, date. */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="relative flex flex-1 gap-3.5 rounded-2xl border-[1.5px] border-ink-100 bg-surface p-3.5 hover:shadow-card-hover">
      <Visual color={article.color} emoji={article.emoji} className="w-18 shrink-0 rounded-xl text-[30px]" />
      <div>
        <p className="text-xs font-extrabold text-primary-600">{article.category}</p>
        <h3 className="mt-0.5 text-[15px] leading-snug font-extrabold text-ink-900">
          <Link
            href={routes.article(article.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-2xl after:focus-visible:outline-3 after:focus-visible:outline-primary-500"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs font-bold text-ink-600">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}

/** Guide PDF de WL20 : couverture, titre, « PDF · n pages », téléchargement libre (D14). */
export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] border-[1.5px] border-ink-100 bg-surface">
      <Visual color={guide.color} emoji={guide.emoji} className="h-35 text-[56px]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="text-[15px] leading-snug font-extrabold text-ink-900">{guide.title}</h2>
        <p className="text-[13px] leading-normal font-semibold text-ink-600">{guide.description}</p>
        <p className="text-xs font-bold text-ink-600">PDF · {guide.pages} pages</p>
        <div className="mt-auto pt-2">
          {/* Lien natif : un fichier statique, pas une route (aucun préchargement par next/link). */}
          <a
            href={guide.file}
            download
            aria-label={`Télécharger « ${guide.title} » (PDF, ${guide.pages} pages)`}
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            Télécharger
            <Icon name="arrow-right" size={16} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </article>
  );
}
