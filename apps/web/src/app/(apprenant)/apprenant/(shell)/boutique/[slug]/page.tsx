import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { KitDetailSkeleton, KitDetailView } from "@/features/shop/KitDetailView";
import { getKit } from "@/lib/shop";

export async function generateMetadata({ params }: PageProps<"/apprenant/boutique/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const kit = await getKit(slug).catch(() => null);
  return { title: kit?.name ?? "Kit introuvable" };
}

/** WK02 / WK11 · Fiche kit dans le shell : panier serveur, alerte de réassort dans l'application (D30). */
export default function LearnerKitPage({ params }: PageProps<"/apprenant/boutique/[slug]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<KitDetailSkeleton />}>
        <KitDetailView params={params} context="learner" />
      </Suspense>
    </AppStateBoundary>
  );
}
