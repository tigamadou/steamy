import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherHome, TeacherHomeSkeleton } from "@/features/teacher/home/TeacherHome";

export const metadata: Metadata = { title: "Accueil" };

/** WT01 · accueil de l'enseignant : classes, « À revoir » et « Décrochage ». */
export default function TeacherHomePage() {
  return (
    <Suspense fallback={<TeacherHomeSkeleton />}>
      <TeacherHome />
    </Suspense>
  );
}
