import type { Metadata } from "next";
import { Suspense } from "react";

import { WLJoinBanner } from "@/components/public";
import { ShopCatalog, ShopCatalogSkeleton } from "@/components/public/shop-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

const DESCRIPTION =
  "Des kits robotiques livrés chez toi pour construire pour de vrai. Paiement Mobile Money par ton parent.";

export const metadata: Metadata = {
  title: "Boutique de kits",
  description: DESCRIPTION,
  alternates: { canonical: routes.shop },
};

/** WL07 (= WK01 invité, D12) · Boutique de kits : fiches (WK02) et panier invité (WK03). */
export default function ShopPage({ searchParams }: PageProps<"/boutique">) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Boutique de kits</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6">
        <AppStateBoundary>
          <Suspense fallback={<ShopCatalogSkeleton />}>
            <ShopCatalog searchParams={searchParams} />
          </Suspense>
        </AppStateBoundary>
      </div>
      <WLJoinBanner />
    </div>
  );
}
