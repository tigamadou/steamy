import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherCourseDetail, TeacherCourseDetailSkeleton } from "@/features/teacher/courses/TeacherCourseDetail";

export const metadata: Metadata = { title: "Parcours encadré" };

/** WT10 · détail d'un parcours encadré : arbre avec compteurs et suivi. */
export default function TeacherCoursePage({ params }: PageProps<"/enseignant/parcours/[slug]">) {
  return (
    <Suspense fallback={<TeacherCourseDetailSkeleton />}>
      <TeacherCourseDetail params={params} />
    </Suspense>
  );
}
