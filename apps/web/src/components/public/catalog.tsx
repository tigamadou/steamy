import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import type { CSSProperties } from "react";

import { CourseCard, Icon, SkeletonBlock, Tag, type CourseCardData } from "@/components/ds";
import { catalogHref, listHref } from "@/lib/catalog-filters";
import { cx } from "@/lib/cx";
import { toCourseCard } from "@/lib/format";
import { routes } from "@/lib/routes";

// Briques du catalogue public (WL01, WL06, WL16).

export type CourseCardItem = {
  slug: string;
  card: CourseCardData;
  /** Cœur des souhaits (espace apprenant) : état et bascule. */
  favorited?: boolean;
  onFav?: () => void;
};

/**
 * Grille unique des cartes parcours (catalogue public, WC01, WW01, recommandations), 1 → 3 colonnes. Dans le shell,
 * plus étroit, la troisième colonne n'apparaît qu'à partir de `xl`.
 */
export function CourseCardList({ items, narrow }: { items: CourseCardItem[]; narrow?: boolean }) {
  return (
    <ul className={cx("grid gap-4 sm:grid-cols-2", narrow ? "xl:grid-cols-3" : "lg:grid-cols-3")}>
      {items.map(({ slug, card, favorited, onFav }) => (
        <li key={slug} data-course={slug} className="flex">
          <CourseCard course={card} favorited={favorited} onFav={onFav} className="flex-1" />
        </li>
      ))}
    </ul>
  );
}

/** Grille de parcours de l'API, 1 → 3 colonnes. */
export function CourseGrid({
  courses,
  courseHref,
}: {
  courses: Schemas["CourseList"][];
  /** Lien de chaque carte (fiche WC04 dans l'espace apprenant) ; fiche publique WL22 par défaut. */
  courseHref?: (slug: string) => string;
}) {
  return (
    <CourseCardList
      items={courses.map((course) => ({ slug: course.slug, card: toCourseCard(course, courseHref?.(course.slug)) }))}
    />
  );
}

/** Skeleton structurel de la grille pendant le chargement (§6) : jamais de spinner nu. */
export function CourseGridSkeleton({
  count = 3,
  label = "Chargement des parcours…",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-[22px] border-2 border-ink-100 bg-surface">
            <SkeletonBlock className="aspect-16/10 h-auto rounded-none" />
            <div className="flex flex-col gap-2.5 p-4">
              <SkeletonBlock className="h-5 w-24 rounded-pill" />
              <SkeletonBlock className="h-5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Filtres de WL06 et WL07 : « Tous » puis une pastille par catégorie, chacune un lien adressable. */
export function CategoryFilters({
  categories,
  active,
  base = routes.courses,
}: {
  categories: Schemas["Category"][];
  active?: string;
  /** Liste filtrée : catalogue des parcours (défaut) ou boutique. */
  base?: string;
}) {
  return (
    <nav aria-label="Filtrer par catégorie">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Tag href={listHref(base, {})} active={!active}>
            Tous
          </Tag>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Tag
              href={listHref(base, { category: category.slug })}
              active={active === category.slug}
              color={category.color}
            >
              {category.label}
            </Tag>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Carte catégorie de WL16 : bandeau à sa couleur, emoji, nombre de parcours publiés → WL06 filtré. */
export function CategoryCard({ category }: { category: Schemas["Category"] }) {
  return (
    <article className="group relative overflow-hidden rounded-[22px] border-[1.5px] border-ink-100 bg-surface hover:shadow-card-hover">
      <div
        aria-hidden
        className="flex h-30 items-center justify-center bg-(--category) text-[56px]"
        style={{ "--category": category.color } as CSSProperties}
      >
        {category.icon}
      </div>
      <div className="flex items-center justify-between gap-3 p-4.5">
        <div>
          <h2 className="text-[17px] font-black text-ink-900">
            <Link
              href={catalogHref({ category: category.slug })}
              className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-[22px] after:focus-visible:outline-3 after:focus-visible:outline-primary-500"
            >
              {category.label}
            </Link>
          </h2>
          <p className="text-[13px] font-bold text-ink-600">{category.courseCount} parcours</p>
        </div>
        <Icon name="arrow-right" size={20} className="text-ink-600 transition-transform group-hover:translate-x-1" />
      </div>
    </article>
  );
}

/** Pagination de WL06 et WL07 : liens « Précédent » et « Suivant », la page courante annoncée. */
export function CatalogPagination({
  category,
  page,
  hasNext,
  base = routes.courses,
  hrefOf = (target) => listHref(base, { category, page: target }),
}: {
  category?: string;
  page: number;
  hasNext: boolean;
  /** Liste paginée : catalogue des parcours (défaut) ou boutique. */
  base?: string;
  /** URL d'une page, quand la liste porte d'autres filtres (catalogue de l'apprenant). */
  hrefOf?: (page: number) => string;
}) {
  if (page === 1 && !hasNext) {
    return null;
  }
  const link =
    "inline-flex items-center gap-1.5 rounded-pill border-2 border-ink-200 px-4 py-2 text-sm font-extrabold text-ink-800 hover:border-ink-300 focus-visible:outline-3 focus-visible:outline-primary-500";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link href={hrefOf(page - 1)} className={link} rel="prev">
          <Icon name="arrow-left" size={16} strokeWidth={2.5} />
          Précédent
        </Link>
      )}
      <p className={cx("text-sm font-bold text-ink-600")} aria-current="page">
        Page {page}
      </p>
      {hasNext && (
        <Link href={hrefOf(page + 1)} className={link} rel="next">
          Suivant
          <Icon name="arrow-right" size={16} strokeWidth={2.5} />
        </Link>
      )}
    </nav>
  );
}
