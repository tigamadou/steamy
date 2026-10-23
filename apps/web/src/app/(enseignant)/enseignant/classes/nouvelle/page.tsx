import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassroomFormSkeleton, NewClassroom } from "@/features/teacher/classes/ClassroomFormScreen";

export const metadata: Metadata = { title: "Créer une classe" };

/** WT13 · créer une classe. */
export default function NewClassroomPage() {
  return (
    <Suspense fallback={<ClassroomFormSkeleton />}>
      <NewClassroom />
    </Suspense>
  );
}
