import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentHome, ParentHomeSkeleton } from "@/features/parent/home/ParentHome";

export const metadata: Metadata = { title: "Accueil" };

/** WPD01 · accueil du parent et « À valider ». */
export default function ParentHomePage() {
  return (
    <Suspense fallback={<ParentHomeSkeleton />}>
      <ParentHome />
    </Suspense>
  );
}
