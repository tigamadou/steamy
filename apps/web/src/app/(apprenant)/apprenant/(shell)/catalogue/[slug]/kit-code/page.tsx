import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { KitCodeSkeleton, KitCodeView } from "@/features/unlock/KitCodeView";

export const metadata: Metadata = { title: "Débloquer le parcours" };

/** WA01 / WA06 · Saisie du Kit Code d'un parcours (titre du header : « Débloquer le parcours »). */
export default function KitCodePage({ params }: PageProps<"/apprenant/catalogue/[slug]/kit-code">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<KitCodeSkeleton />}>
        <KitCodeView params={params} />
      </Suspense>
    </AppStateBoundary>
  );
}
