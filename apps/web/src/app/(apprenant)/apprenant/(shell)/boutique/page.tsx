import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds";
import { ShopCatalog, ShopCatalogSkeleton } from "@/components/public/shop-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Boutique de kits" };

/** WK01 · Boutique de kits de l'apprenant (titre du header en h1), panier côté serveur. */
export default function LearnerShopPage({ searchParams }: PageProps<"/apprenant/boutique">) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-600">Des kits livrés chez toi, payés par ton parent.</p>
        <Button variant="outline" size="sm" icon="cart" href={routes.learner.cart}>
          Mon panier
        </Button>
      </div>
      <AppStateBoundary>
        <Suspense fallback={<ShopCatalogSkeleton />}>
          <ShopCatalog searchParams={searchParams} context="learner" />
        </Suspense>
      </AppStateBoundary>
    </>
  );
}
