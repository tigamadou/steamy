import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds";
import { ShopCatalog, ShopCatalogSkeleton } from "@/components/public/shop-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Boutique de kits" };

/** WK01 dans l'espace parent : achat direct de kit (C10), panier serveur. */
export default function ParentShopPage({ searchParams }: PageProps<"/parent/boutique">) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-600">Des kits livrés chez vous, payés en Mobile Money.</p>
        <Button variant="outline" size="sm" icon="cart" href={routes.parent.cart}>
          Mon panier
        </Button>
      </div>
      <AppStateBoundary>
        <Suspense fallback={<ShopCatalogSkeleton />}>
          <ShopCatalog searchParams={searchParams} context="parent" />
        </Suspense>
      </AppStateBoundary>
    </>
  );
}
