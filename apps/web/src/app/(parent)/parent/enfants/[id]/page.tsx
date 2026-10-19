import type { Metadata } from "next";
import { Suspense } from "react";

import { ChildDetail, ChildDetailSkeleton } from "@/features/parent/children/ChildDetail";

export const metadata: Metadata = { title: "Profil de l'enfant" };

/** WPD03 · Détail d'un enfant (+ modale de réinitialisation du mot de passe). */
export default function ChildPage({ params, searchParams }: PageProps<"/parent/enfants/[id]">) {
  return (
    <Suspense fallback={<ChildDetailSkeleton />}>
      <ChildDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
