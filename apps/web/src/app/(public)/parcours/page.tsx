import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { WLJoinBanner } from "@/components/public";
import { Catalog, CatalogSkeleton } from "@/components/public/catalog-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

const DESCRIPTION =
  "Robotique, code, IA, électronique… Trouve le parcours qui te ressemble. Crée un compte gratuit pour commencer à apprendre.";

export const metadata: Metadata = {
  title: "Catalogue des parcours",
  description: DESCRIPTION,
  alternates: { canonical: routes.courses },
};

/** WL06 · Catalogue public : filtres par catégorie reflétés dans l'URL, grille, pagination. */
export default function CoursesPage({ searchParams }: PageProps<"/parcours">) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Catalogue des parcours</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <p className="mt-3">
        <Link
          href={routes.categories}
          className="text-sm font-extrabold text-primary-600 underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          Toutes les catégories
        </Link>
      </p>
      <div className="mt-6">
        <AppStateBoundary>
          <Suspense fallback={<CatalogSkeleton />}>
            <Catalog searchParams={searchParams} />
          </Suspense>
        </AppStateBoundary>
      </div>
      <WLJoinBanner />
    </div>
  );
}
