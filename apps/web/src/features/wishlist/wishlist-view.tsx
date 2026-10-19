import { DropdownMenu, SkeletonBlock } from "@/components/ds";
import { CourseGridSkeleton } from "@/components/public/catalog";
import { getWishlist, type WishlistSort } from "@/features/catalog/learner-state";
import { toCourseCard } from "@/lib/format";
import { routes } from "@/lib/routes";

import { WishlistGrid } from "./WishlistGrid";

/** Tri de WW01 dans l'URL (`?tri=`) → valeur de l'API ; « recents » par défaut. */
export const WISHLIST_SORTS: Record<string, { sort: WishlistSort; label: string }> = {
  recents: { sort: "recent", label: "Plus récents" },
  titre: { sort: "title", label: "Titre" },
  prix: { sort: "price", label: "Prix croissant" },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** WW01 / WW02 · Souhaits de l'apprenant, triés, sous `<Suspense>` (donnée personnelle, jamais en cache). */
export async function WishlistView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = first((await searchParams).tri) ?? "";
  const current = Object.hasOwn(WISHLIST_SORTS, requested) ? requested : "recents";
  const wishlist = await getWishlist(WISHLIST_SORTS[current].sort);
  const items = wishlist.map(({ course }) => ({
    slug: course.slug,
    card: toCourseCard(course, routes.learner.catalogCourse(course.slug)),
  }));
  return (
    <WishlistGrid
      // Un nouveau tri remonte la grille avec la liste relue
      key={current}
      items={items}
      sort={
        <DropdownMenu
          label="Trier"
          align="end"
          items={Object.entries(WISHLIST_SORTS).map(([param, { label }]) => ({
            id: param,
            label,
            href: param === "recents" ? routes.learner.wishlist : `${routes.learner.wishlist}?tri=${param}`,
            selected: param === current,
          }))}
        />
      }
    />
  );
}

/** Chargement de WW01 : bandeau et grille en silhouette. */
export function WishlistSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <SkeletonBlock className="h-14 rounded-[14px]" />
      <CourseGridSkeleton count={3} label="Chargement de tes souhaits…" />
    </div>
  );
}
