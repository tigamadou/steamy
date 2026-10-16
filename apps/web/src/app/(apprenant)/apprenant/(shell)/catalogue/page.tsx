import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { LearnerCatalog, LearnerCatalogSkeleton } from "@/features/catalog/catalog-view";

export const metadata: Metadata = { title: "Catalogue" };

/** WC01-WC03 · Catalogue de l'apprenant : filtres, tri et recherche dans l'URL. */
export default function LearnerCatalogPage({ searchParams }: PageProps<"/apprenant/catalogue">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<LearnerCatalogSkeleton />}>
        <LearnerCatalog searchParams={searchParams} />
      </Suspense>
    </AppStateBoundary>
  );
}
