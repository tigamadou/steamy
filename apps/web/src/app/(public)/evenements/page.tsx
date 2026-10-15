import type { Metadata } from "next";
import { Suspense } from "react";

import { EventListSkeleton } from "@/components/public/events";
import { EventList } from "@/components/public/events-sections";
import { AppStateBoundary } from "@/components/states";
import { routes } from "@/lib/routes";

const DESCRIPTION =
  "Le calendrier des prochains Steamy Events : ateliers, défis et hackathons. La participation se fait toujours avec l'accord d'un parent.";

export const metadata: Metadata = {
  title: "Événements",
  description: DESCRIPTION,
  alternates: { canonical: routes.events },
};

/** WL21 · Steamy Events à venir (S8, absorbe WL08) : chaque ligne mène à la fiche WL23. */
export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Événements & ateliers</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6">
        <AppStateBoundary>
          <Suspense fallback={<EventListSkeleton />}>
            <EventList />
          </Suspense>
        </AppStateBoundary>
      </div>
    </div>
  );
}
