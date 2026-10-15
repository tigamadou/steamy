import { connection } from "next/server";

import { Button, Mascot, SkeletonBlock } from "@/components/ds";
import { getCategories, getCourses, getHomeCourses } from "@/lib/catalog";
import { catalogHref, parseCatalogFilters } from "@/lib/catalog-filters";

import { CatalogPagination, CategoryCard, CategoryFilters, CourseGrid, CourseGridSkeleton } from "./catalog";

// Sections du catalogue rendues à la requête (données d'API en cache), à placer sous `<Suspense>` et
// `<AppStateBoundary>` : l'API n'est pas joignable au build.

/** Parcours de l'accueil (WL01). */
export async function HomeCourses() {
  await connection();
  return <CourseGrid courses={await getHomeCourses()} />;
}

/** Filtres et grille, lus dans l'URL puis dans l'API (en cache) : rendus à la requête, sous `<Suspense>`. */
export async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category, page } = parseCatalogFilters(await searchParams);
  await connection();
  const categories = await getCategories();
  // Catégorie inconnue (lien périmé) : tout le catalogue
  const current = categories.find((c) => c.slug === category);
  const courses = await getCourses({ category: current?.slug, page });
  return (
    <>
      <CategoryFilters categories={categories} active={current?.slug} />
      <h2 className="sr-only">{current ? `Parcours : ${current.label}` : "Tous les parcours"}</h2>
      <div className="mt-6">
        {courses.results.length > 0 ? (
          <>
            <CourseGrid courses={courses.results} />
            <CatalogPagination category={current?.slug} page={page} hasNext={courses.hasNext} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed border-ink-200 px-6 py-12 text-center">
            <Mascot pose="focus" size={110} />
            <p className="text-lg font-black text-ink-900">Aucun parcours dans cette catégorie</p>
            <p className="max-w-[420px] text-sm font-semibold text-ink-600">
              De nouveaux parcours arrivent régulièrement. En attendant, découvre tout le catalogue.
            </p>
            <Button href={catalogHref({})} variant="outline">
              Voir tout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div aria-hidden className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-9 w-24 animate-pulse rounded-pill bg-ink-100 motion-reduce:animate-none" />
        ))}
      </div>
      <CourseGridSkeleton count={6} />
    </div>
  );
}

export async function CategoryList() {
  await connection();
  const categories = await getCategories();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <li key={category.slug}>
          <CategoryCard category={category} />
        </li>
      ))}
    </ul>
  );
}

export function CategoryListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des catégories…"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonBlock key={i} className="h-46 rounded-[22px]" />
      ))}
    </div>
  );
}
