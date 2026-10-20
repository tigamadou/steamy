import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailSkeleton } from "@/components/public/events";
import { ParentEventView } from "@/features/parent/events/ParentEventView";

export const metadata: Metadata = { title: "Steamy Events" };

/** WL23 dans le shell parent : fiche de l'événement, « Inscrire un enfant ». */
export default function ParentEventPage({ params }: PageProps<"/parent/evenements/[slug]">) {
  return (
    <Suspense fallback={<EventDetailSkeleton embedded />}>
      <ParentEventView params={params} />
    </Suspense>
  );
}
