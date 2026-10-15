import { connection } from "next/server";

import { Button, Mascot, SkeletonBlock, WKKitCard } from "@/components/ds";
import { getCategories } from "@/lib/catalog";
import { listHref, parseCatalogFilters } from "@/lib/catalog-filters";
import { routes } from "@/lib/routes";
import { getKits, toKitCard } from "@/lib/shop";

import { CatalogPagination, CategoryFilters } from "./catalog";

/**
 * WL07 en vitrine (lot 1) : filtres par catégorie dans l'URL, cartes non cliquables, sans panier. Le lot 3 active
 * la fiche kit (WK02) et le panier invité (D12).
 */
export async function ShopCatalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category, page } = parseCatalogFilters(await searchParams);
  await connection();
  const categories = await getCategories();
  const current = categories.find((c) => c.slug === category);
  const kits = await getKits({ category: current?.slug, page });
  return (
    <>
      <CategoryFilters categories={categories} active={current?.slug} base={routes.shop} />
      <h2 className="sr-only">{current ? `Kits : ${current.label}` : "Tous les kits"}</h2>
      <div className="mt-6">
        {kits.results.length > 0 ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kits.results.map((kit) => (
                <li key={kit.slug} className="flex">
                  <WKKitCard kit={toKitCard(kit)} mode="vitrine" className="flex-1" />
                </li>
              ))}
            </ul>
            <CatalogPagination category={current?.slug} page={page} hasNext={kits.hasNext} base={routes.shop} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed border-ink-200 px-6 py-12 text-center">
            <Mascot pose="focus" size={110} />
            <p className="text-lg font-black text-ink-900">Aucun kit dans cette catégorie</p>
            <Button href={listHref(routes.shop, {})} variant="outline">
              Voir tous les kits
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function ShopCatalogSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des kits…" className="flex flex-col gap-6">
      <SkeletonBlock className="h-9 w-2/3 rounded-pill" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonBlock key={i} className="h-72 rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}
