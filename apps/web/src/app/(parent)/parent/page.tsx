import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentHome, ParentHomeSkeleton } from "@/features/parent/home/ParentHome";

export const metadata: Metadata = { title: "Accueil" };

/** WPD01 · accueil du parent et « À valider » ; `?consentement=<id>` confirme une demande acceptée (WPD05). */
export default function ParentHomePage({ searchParams }: PageProps<"/parent">) {
  return (
    <Suspense fallback={<ParentHomeSkeleton />}>
      <ParentHome searchParams={searchParams} />
    </Suspense>
  );
}
