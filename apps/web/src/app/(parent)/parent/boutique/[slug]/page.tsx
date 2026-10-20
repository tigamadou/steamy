import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { KitDetailSkeleton, KitDetailView } from "@/features/shop/KitDetailView";
import { getKit } from "@/lib/shop";

export async function generateMetadata({ params }: PageProps<"/parent/boutique/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const kit = await getKit(slug).catch(() => null);
  return { title: kit?.name ?? "Kit introuvable" };
}

/** WK02 / WK11 dans l'espace parent : panier serveur, alerte de réassort par SMS. */
export default function ParentKitPage({ params }: PageProps<"/parent/boutique/[slug]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<KitDetailSkeleton />}>
        <KitDetailView params={params} context="parent" />
      </Suspense>
    </AppStateBoundary>
  );
}
