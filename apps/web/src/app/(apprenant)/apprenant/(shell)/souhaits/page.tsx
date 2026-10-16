import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { WishlistSkeleton, WishlistView } from "@/features/wishlist/wishlist-view";

export const metadata: Metadata = { title: "Mes souhaits" };

/** WW01-WW03 · Mes souhaits. */
export default function WishlistPage({ searchParams }: PageProps<"/apprenant/souhaits">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<WishlistSkeleton />}>
        <WishlistView searchParams={searchParams} />
      </Suspense>
    </AppStateBoundary>
  );
}
