import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { EventAvailability, EventDetail } from "@/components/public/events";
import { getEvent } from "@/features/events/api";
import { getClassrooms } from "@/features/teacher/classes/api";
import { routes } from "@/lib/routes";

import { ProposeButton } from "./ProposeButton";

/** Fil d'Ariane de la fiche d'un événement dans le shell enseignant. */
export function teacherEventBreadcrumb(event: Pick<Schemas["SteamyEvent"], "title">) {
  return [{ label: "Steamy Events", href: routes.teacher.events }, { label: event.title }];
}

/** WL23 dans le shell enseignant : la fiche publique du lot 1 (titre en h2 sous le h1 du header), « Proposer à une classe ». */
export async function TeacherEventView({ params }: { params: Promise<{ slug: string }> }) {
  const [event, classrooms] = await Promise.all([getEvent((await params).slug), getClassrooms()]);
  if (!event) notFound();
  return (
    classrooms && (
      <EventDetail
        event={event}
        headingLevel={2}
        embedded
        breadcrumb={teacherEventBreadcrumb(event)}
        action={
          <>
            <EventAvailability event={event} />
            <ProposeButton eventSlug={event.slug} eventTitle={event.title} classrooms={classrooms} size="lg" />
          </>
        }
      />
    )
  );
}
