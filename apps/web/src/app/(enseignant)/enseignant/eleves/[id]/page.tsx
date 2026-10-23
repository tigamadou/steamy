import type { Metadata } from "next";
import { Suspense } from "react";

import { LearnerProfile, LearnerProfileSkeleton } from "@/features/teacher/profile/LearnerProfile";

export const metadata: Metadata = { title: "Profil de l'élève" };

/** WT05 · profil d'un élève dans une de mes classes (`?classe=<id>&tentative=<id>`), avec commentaires. */
export default function LearnerPage({ params, searchParams }: PageProps<"/enseignant/eleves/[id]">) {
  return (
    <Suspense fallback={<LearnerProfileSkeleton />}>
      <LearnerProfile params={params} searchParams={searchParams} />
    </Suspense>
  );
}
