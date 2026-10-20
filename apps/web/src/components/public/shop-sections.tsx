import { connection } from "next/server";

import { Button, Mascot, SkeletonBlock, WKKitCard } from "@/components/ds";
import { AddToCartButton } from "@/features/shop/AddToCartButton";
import { shopRoutes, type ShopContext } from "@/features/shop/shop-routes";
import { getCategories } from "@/lib/catalog";
import { listHref, parseCatalogFilters } from "@/lib/catalog-filters";
import { getKits, toKitCard } from "@/lib/shop";

import { CatalogPagination, CategoryFilters } from "./catalog";

/**
 * Catalogue des kits : WL07 (`public`, D12) et WK01 (`learner`, dans le shell). Filtres par catégorie dans l'URL,
 * cartes focusables vers la fiche (WK02), « Ajouter » au panier (invité dans le navigateur, connecté sur le serveur).
 */
export async function ShopCatalog({
  searchParams,
  context = "public",
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  context?: ShopContext;
}) {
  const { category, page } = parseCatalogFilters(await searchParams);
  await connection();
  const categories = await getCategories();
  const current = categories.find((c) => c.slug === category);
  const kits = await getKits({ category: current?.slug, page });
  const { shop: base, shopKit: kitHref } = shopRoutes(context);
  return (
    <>
      <CategoryFilters categories={categories} active={current?.slug} base={base} />
      <h2 className="sr-only">{current ? `Kits : ${current.label}` : "Tous les kits"}</h2>
      <div className="mt-6">
        {kits.results.length > 0 ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kits.results.map((kit) => (
                <li key={kit.slug} className="flex">
                  <WKKitCard
                    kit={toKitCard(kit)}
                    href={kitHref(kit.slug)}
                    action={kit.available && <AddToCartButton slug={kit.slug} name={kit.name} context={context} />}
                    className="flex-1"
                  />
                </li>
              ))}
            </ul>
            <CatalogPagination category={current?.slug} page={page} hasNext={kits.hasNext} base={base} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed border-ink-200 px-6 py-12 text-center">
            <Mascot pose="focus" size={110} />
            <p className="text-lg font-black text-ink-900">Aucun kit dans cette catégorie</p>
            <Button href={listHref(base, {})} variant="outline">
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
