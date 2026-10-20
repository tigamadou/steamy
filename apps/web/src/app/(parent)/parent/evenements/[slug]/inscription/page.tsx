import type { Metadata } from "next";
import { Suspense } from "react";

import { EventSignup, EventSignupSkeleton } from "@/features/parent/events/EventSignup";

export const metadata: Metadata = { title: "Inscrire un enfant" };

/** WPD12 · inscrire un enfant à un événement (paiement inclus si payant). */
export default function EventSignupPage({ params }: PageProps<"/parent/evenements/[slug]/inscription">) {
  return (
    <Suspense fallback={<EventSignupSkeleton />}>
      <EventSignup params={params} />
    </Suspense>
  );
}
