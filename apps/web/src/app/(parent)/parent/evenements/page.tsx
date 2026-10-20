import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentEventsHome, ParentEventsHomeSkeleton } from "@/features/parent/events/ParentEventsHome";

export const metadata: Metadata = { title: "Steamy Events" };

/** WPD06 · Steamy Events et candidatures des enfants (`?candidature=<id>` : candidature mise en avant). */
export default function ParentEventsPage({ searchParams }: PageProps<"/parent/evenements">) {
  return (
    <Suspense fallback={<ParentEventsHomeSkeleton />}>
      <ParentEventsHome searchParams={searchParams} />
    </Suspense>
  );
}
