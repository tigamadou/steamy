import type { Metadata } from "next";
import { Suspense } from "react";

import { ChildrenList, ChildrenListSkeleton } from "@/features/parent/children/ChildrenList";

export const metadata: Metadata = { title: "Mes enfants" };

/** WPD02 · Mes enfants : enfants rattachés et demandes reçues à examiner. */
export default function ChildrenPage() {
  return (
    <Suspense fallback={<ChildrenListSkeleton />}>
      <ChildrenList />
    </Suspense>
  );
}
