import type { Schemas } from "@steamy/api-client";
import { connection } from "next/server";

import { ActiveFilterBar, Button, DropdownMenu, Mascot, SkeletonBlock, Tag } from "@/components/ds";
import { CatalogPagination, CourseGridSkeleton } from "@/components/public/catalog";
import { getCategories, getCourses } from "@/lib/catalog";
import {
  DIFFICULTY_PARAMS,
  learnerCatalogHref,
  parseLearnerCatalogFilters,
  toCourseQuery,
  withFilter,
  type DifficultyParam,
  type LearnerCatalogFilters,
  type PriceParam,
  type SortParam,
} from "@/lib/catalog-filters";
import { DIFFICULTY_LABELS, toCourseCard } from "@/lib/format";
import { routes } from "@/lib/routes";

import { getLearnerCourseState } from "./learner-state";
import { LearnerCourseGrid } from "./LearnerCourseGrid";

// WC01-WC03 · Catalogue de l'apprenant : filtres et tri dans l'URL, liste lue dans le catalogue public (en cache),
// cœurs et progression fusionnés depuis les souhaits et inscriptions de l'apprenant.

const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_PARAMS).map(([param, value]) => ({
  param: param as DifficultyParam,
  label: DIFFICULTY_LABELS[value],
}));
const PRICE_OPTIONS: Array<{ param: PriceParam; label: string }> = [
  { param: "gratuit", label: "Gratuit" },
  { param: "payant", label: "Payant" },
];
const SORT_OPTIONS: Array<{ param: SortParam; label: string }> = [
  { param: "populaires", label: "Plus populaires" },
  { param: "recents", label: "Plus récents" },
];

/** « 1 parcours », « 3 parcours » : invariable. */
function countLabel(count: number): string {
  return `${count} parcours`;
}

/** Filtres actifs de WC02 : une puce par filtre, retirée seule. */
function activeFilters(filters: LearnerCatalogFilters, category?: Schemas["Category"]) {
  return [
    ...(filters.q ? [{ id: "q", label: `« ${filters.q} »`, removeHref: withFilter(filters, { q: undefined }) }] : []),
    ...(category
      ? [{ id: "categorie", label: category.label, removeHref: withFilter(filters, { category: undefined }) }]
      : []),
    ...(filters.difficulty
      ? [
          {
            id: "difficulte",
            label: DIFFICULTY_LABELS[DIFFICULTY_PARAMS[filters.difficulty]],
            removeHref: withFilter(filters, { difficulty: undefined }),
          },
        ]
      : []),
    ...(filters.price
      ? [
          {
            id: "prix",
            label: PRICE_OPTIONS.find((option) => option.param === filters.price)!.label,
            removeHref: withFilter(filters, { price: undefined }),
          },
        ]
      : []),
  ];
}

export async function LearnerCatalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseLearnerCatalogFilters(await searchParams);
  await connection();
  const categories = await getCategories();
  // Catégorie inconnue (lien périmé) : ignorée
  const category = categories.find((c) => c.slug === parsed.category);
  const filters: LearnerCatalogFilters = { ...parsed, category: category?.slug };
  const [courses, state] = await Promise.all([getCourses(toCourseQuery(filters)), getLearnerCourseState()]);
  const active = activeFilters(filters, category);
  const clearHref = learnerCatalogHref({ sort: filters.sort });
  const withCourses = categories.filter((c) => c.courseCount > 0).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-ink-50 px-4.5 py-3">
        <p className="text-sm font-extrabold text-ink-700">
          <strong className="text-primary-600">{countLabel(courses.count)}</strong> · {withCourses}{" "}
          {withCourses > 1 ? "catégories" : "catégorie"} · pour les 10-17 ans
        </p>
        <DropdownMenu
          label="Trier par"
          variant="plain"
          align="end"
          items={SORT_OPTIONS.map(({ param, label }) => ({
            id: param,
            label,
            href: withFilter(filters, { sort: param }),
            selected: filters.sort === param,
          }))}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <nav aria-label="Filtrer par catégorie" className="flex-1">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Tag href={withFilter(filters, { category: undefined })} active={!category}>
                Toutes
              </Tag>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Tag href={withFilter(filters, { category: c.slug })} active={c.slug === category?.slug} color={c.color}>
                  {c.label}
                </Tag>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu
            label="Difficulté"
            align="end"
            items={[
              { param: undefined, label: "Toutes" },
              ...DIFFICULTY_OPTIONS,
            ].map(({ param, label }) => ({
              id: param ?? "toutes",
              label,
              href: withFilter(filters, { difficulty: param }),
              selected: filters.difficulty === param,
            }))}
          />
          <DropdownMenu
            label="Prix"
            align="end"
            items={[{ param: undefined, label: "Tous" }, ...PRICE_OPTIONS].map(({ param, label }) => ({
              id: param ?? "tous",
              label,
              href: withFilter(filters, { price: param }),
              selected: filters.price === param,
            }))}
          />
        </div>
      </div>

      <ActiveFilterBar countLabel={countLabel(courses.count)} filters={active} clearHref={clearHref} />

      <h2 className="sr-only">{category ? `Parcours : ${category.label}` : "Tous les parcours"}</h2>
      <div className="mt-4">
        {courses.results.length > 0 ? (
          <>
            <LearnerCourseGrid
              wished={state.wished}
              items={courses.results.map((course) => ({
                slug: course.slug,
                card: { ...toCourseCard(course, routes.learner.catalogCourse(course.slug)), progress: state.progress[course.slug] },
              }))}
            />
            <CatalogPagination
              page={filters.page}
              hasNext={courses.hasNext}
              hrefOf={(page) => learnerCatalogHref({ ...filters, page })}
            />
          </>
        ) : (
          <CatalogEmpty filtered={active.length > 0} clearHref={clearHref} allCategoriesHref={category && withFilter(filters, { category: undefined })} />
        )}
      </div>
    </>
  );
}

/** WC03 · Aucun résultat : effacer les filtres, ou retirer la catégorie. */
export function CatalogEmpty({
  filtered,
  clearHref,
  allCategoriesHref,
}: {
  filtered: boolean;
  clearHref: string;
  allCategoriesHref?: string;
}) {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-6 py-8 text-center">
      <Mascot pose="sad" size={140} />
      <h3 className="text-[22px] font-black text-ink-900">
        {filtered ? "Aucun parcours ne correspond" : "Aucun parcours pour le moment"}
      </h3>
      <p className="text-sm leading-normal font-semibold text-ink-600">
        {filtered
          ? "Essaie de retirer un filtre ou explore d'autres catégories."
          : "De nouveaux parcours arrivent régulièrement. Reviens un peu plus tard."}
      </p>
      {filtered && (
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          <Button variant="outline" icon="x" href={clearHref}>
            Effacer les filtres
          </Button>
          {allCategoriesHref && <Button href={allCategoriesHref}>Voir toutes les catégories</Button>}
        </div>
      )}
    </div>
  );
}

/** Chargement de WC01 : bandeau, filtres et grille en silhouette. */
export function LearnerCatalogSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock className="h-12 rounded-[14px]" />
      <div aria-hidden className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonBlock key={i} className="h-9 w-24 rounded-pill" />
        ))}
      </div>
      <CourseGridSkeleton count={6} />
    </div>
  );
}
