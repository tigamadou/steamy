import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassroomMembers, ClassroomMembersSkeleton } from "@/features/teacher/classes/ClassroomMembers";

export const metadata: Metadata = { title: "Élèves de la classe" };

/** WT04 · élèves et invitations d'une classe. */
export default function ClassroomPage({ params, searchParams }: PageProps<"/enseignant/classes/[id]">) {
  return (
    <Suspense fallback={<ClassroomMembersSkeleton />}>
      <ClassroomMembers params={params} searchParams={searchParams} />
    </Suspense>
  );
}
