import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryList, CategoryListSkeleton } from "@/components/public/catalog-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

const DESCRIPTION = "Choisis un domaine et découvre tous les parcours associés.";

export const metadata: Metadata = {
  title: "Catégories",
  description: DESCRIPTION,
  alternates: { canonical: routes.categories },
};

/** WL16 · Catégories : une carte par catégorie (couleur, emoji, parcours publiés) → WL06 filtré. */
export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Explore par catégorie</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6">
        <AppStateBoundary>
          <Suspense fallback={<CategoryListSkeleton />}>
            <CategoryList />
          </Suspense>
        </AppStateBoundary>
      </div>
    </div>
  );
}
