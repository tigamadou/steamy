import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { CourseDetailSkeleton } from "@/features/catalog/course-detail";
import { LearnerCourseView } from "@/features/catalog/course-view";
import { getCourse } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/apprenant/catalogue/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug).catch(() => null);
  return { title: course?.title ?? "Parcours introuvable" };
}

/** WC04 / WC05 · Fiche parcours dans l'espace apprenant. */
export default function LearnerCoursePage({ params }: PageProps<"/apprenant/catalogue/[slug]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <LearnerCourseView params={params} />
      </Suspense>
    </AppStateBoundary>
  );
}
