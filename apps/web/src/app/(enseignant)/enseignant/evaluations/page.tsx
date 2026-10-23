import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherReviews, TeacherReviewsSkeleton } from "@/features/teacher/reviews/TeacherReviews";

export const metadata: Metadata = { title: "Évaluations" };

/** WT07 · évaluations : filtres dans l'URL, « À revoir » = tentatives échouées non commentées. */
export default function TeacherReviewsPage({ searchParams }: PageProps<"/enseignant/evaluations">) {
  return (
    <Suspense fallback={<TeacherReviewsSkeleton />}>
      <TeacherReviews searchParams={searchParams} />
    </Suspense>
  );
}
