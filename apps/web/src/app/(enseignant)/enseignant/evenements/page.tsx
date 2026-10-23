import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherEventsHome, TeacherEventsHomeSkeleton } from "@/features/teacher/events/TeacherEventsHome";

export const metadata: Metadata = { title: "Steamy Events" };

/** WT09 · Steamy Events : événements à venir, « Proposer à une classe », candidatures de mes élèves. */
export default function TeacherEventsPage() {
  return (
    <Suspense fallback={<TeacherEventsHomeSkeleton />}>
      <TeacherEventsHome />
    </Suspense>
  );
}
