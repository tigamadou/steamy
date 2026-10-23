import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassroomFormSkeleton, EditClassroom } from "@/features/teacher/classes/ClassroomFormScreen";

export const metadata: Metadata = { title: "Modifier la classe" };

/** WT13 · modifier une classe. */
export default function EditClassroomPage({ params }: PageProps<"/enseignant/classes/[id]/modifier">) {
  return (
    <Suspense fallback={<ClassroomFormSkeleton />}>
      <EditClassroom params={params} />
    </Suspense>
  );
}
