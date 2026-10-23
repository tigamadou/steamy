import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherClasses, TeacherClassesSkeleton } from "@/features/teacher/classes/TeacherClasses";

export const metadata: Metadata = { title: "Mes classes" };

/** WT03 · mes classes et le quota de l'école. */
export default function TeacherClassesPage() {
  return (
    <Suspense fallback={<TeacherClassesSkeleton />}>
      <TeacherClasses />
    </Suspense>
  );
}
