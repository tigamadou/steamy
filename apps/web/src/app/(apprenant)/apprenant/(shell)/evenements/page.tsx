import type { Metadata } from "next";
import { Suspense } from "react";

import { SavedToast } from "@/features/account/SavedToast";
import { EventsHome, EventsHomeSkeleton } from "@/features/events/EventsHome";

export const metadata: Metadata = { title: "Steamy Events" };

// WD10 · Steamy Events de l'apprenant. Le h1 est le titre du header du shell (« Steamy Events »).
// `?candidature=envoyee` : retour de WD11 après l'envoi, confirmé par un toast qui retire ensuite le
// paramètre de l'adresse (un retour arrière ne le réaffiche pas).
export default async function EventsPage({ searchParams }: PageProps<"/apprenant/evenements">) {
  const { candidature } = await searchParams;
  return (
    <>
      <Suspense fallback={<EventsHomeSkeleton />}>
        <EventsHome />
      </Suspense>
      {candidature === "envoyee" && (
        <SavedToast title="Ta candidature est envoyée à ton parent." clearParam="candidature" />
      )}
    </>
  );
}
