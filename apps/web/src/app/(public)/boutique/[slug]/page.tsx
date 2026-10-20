import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { KitDetailSkeleton, KitDetailView } from "@/features/shop/KitDetailView";
import { routes } from "@/lib/routes";
import { getKit } from "@/lib/shop";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const kit = await getKit(slug).catch(() => null);
  if (!kit) return { title: "Kit introuvable" };
  return {
    title: kit.name,
    description: kit.description,
    alternates: { canonical: routes.shopKit(kit.slug) },
  };
}

/** WK02 / WK11 · Fiche kit publique (D12) : panier invité, alerte de réassort par SMS. */
export default function KitPage({ params }: PageProps<"/boutique/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-14 sm:px-8">
      <AppStateBoundary>
        <Suspense fallback={<KitDetailSkeleton />}>
          <KitDetailView params={params} context="public" />
        </Suspense>
      </AppStateBoundary>
    </div>
  );
}
