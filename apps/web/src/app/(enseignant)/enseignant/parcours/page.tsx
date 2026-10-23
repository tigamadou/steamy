import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherCourses, TeacherCoursesSkeleton } from "@/features/teacher/courses/TeacherCourses";

export const metadata: Metadata = { title: "Mes parcours encadrés" };

/** WT02 · mes parcours encadrés : ceux de mes classes seulement. */
export default function TeacherCoursesPage() {
  return (
    <Suspense fallback={<TeacherCoursesSkeleton />}>
      <TeacherCourses />
    </Suspense>
  );
}
