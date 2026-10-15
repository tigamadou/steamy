import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailSkeleton } from "@/components/public/events";
import { EventView } from "@/components/public/events-sections";
import { AppStateBoundary } from "@/components/states";
import { getEvent } from "@/lib/events";
import { routes } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/evenements/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug).catch(() => null);
  if (!event) {
    return { title: "Événement introuvable" };
  }
  return {
    title: event.title,
    description: event.description,
    alternates: { canonical: routes.event(event.slug) },
    openGraph: { type: "website", title: event.title, description: event.description },
  };
}

/** WL23 · Fiche événement : date, lieu, public, places, prix, CTA visiteur ou motif (complet, clos, passé). */
export default function EventPage({ params }: PageProps<"/evenements/[slug]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventView params={params} />
      </Suspense>
    </AppStateBoundary>
  );
}
