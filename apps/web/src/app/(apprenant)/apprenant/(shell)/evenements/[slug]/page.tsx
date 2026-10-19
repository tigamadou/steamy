import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailSkeleton } from "@/components/public/events";
import { LearnerEventView } from "@/features/events/LearnerEventView";
import { getEvent } from "@/lib/events";

export async function generateMetadata({ params }: PageProps<"/apprenant/evenements/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug).catch(() => null);
  return { title: event?.title ?? "Événement introuvable" };
}

/** WL23 · Fiche événement dans le shell de l'apprenant, « Demander à participer » → WD11. */
export default function LearnerEventPage({ params }: PageProps<"/apprenant/evenements/[slug]">) {
  return (
    <Suspense fallback={<EventDetailSkeleton embedded />}>
      <LearnerEventView params={params} />
    </Suspense>
  );
}
