import type { Metadata } from "next";
import { Suspense } from "react";

import { EventApplication, EventApplicationSkeleton } from "@/features/events/EventApplication";

export const metadata: Metadata = { title: "Candidature à un événement" };

/** WD11 · Candidature à un Steamy Event. Le h1 est le titre du header du shell (« Steamy Events »). */
export default function EventApplicationPage({ params }: PageProps<"/apprenant/evenements/[slug]/candidature">) {
  return (
    <Suspense fallback={<EventApplicationSkeleton />}>
      <EventApplication params={params} />
    </Suspense>
  );
}
