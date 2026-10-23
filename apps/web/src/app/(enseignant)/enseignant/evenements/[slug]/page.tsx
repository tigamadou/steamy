import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailSkeleton } from "@/components/public/events";
import { TeacherEventView } from "@/features/teacher/events/TeacherEventView";

export const metadata: Metadata = { title: "Steamy Events" };

/** WL23 dans le shell enseignant : fiche de l'événement, « Proposer à une classe ». */
export default function TeacherEventPage({ params }: PageProps<"/enseignant/evenements/[slug]">) {
  return (
    <Suspense fallback={<EventDetailSkeleton embedded />}>
      <TeacherEventView params={params} />
    </Suspense>
  );
}
