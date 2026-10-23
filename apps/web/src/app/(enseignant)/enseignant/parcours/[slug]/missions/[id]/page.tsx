import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherMission, TeacherMissionSkeleton } from "@/features/teacher/courses/TeacherMission";

export const metadata: Metadata = { title: "Mission" };

/** Mission d'un parcours encadré, en lecture seule. */
export default function TeacherMissionPage({ params }: PageProps<"/enseignant/parcours/[slug]/missions/[id]">) {
  return (
    <Suspense fallback={<TeacherMissionSkeleton />}>
      <TeacherMission params={params} />
    </Suspense>
  );
}
