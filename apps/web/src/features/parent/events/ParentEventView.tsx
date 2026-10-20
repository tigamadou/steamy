import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { Button } from "@/components/ds";
import { EventAvailability, EventDetail, eventState } from "@/components/public/events";
import { getEvent } from "@/features/events/api";
import { CLOSED_REASONS, closedReason } from "@/features/events/status";
import { routes } from "@/lib/routes";

/** Fil d'Ariane des écrans d'un événement dans le shell parent. */
export function parentEventBreadcrumb(event: Pick<Schemas["SteamyEvent"], "slug" | "title">, current?: string) {
  const root = { label: "Steamy Events", href: routes.parent.events };
  return current
    ? [root, { label: event.title, href: routes.parent.event(event.slug) }, { label: current }]
    : [root, { label: event.title }];
}

/** Encart d'action du parent sur WL23 : prix et places du serveur, « Inscrire un enfant » (→ WPD12) ou le motif. */
export function ParentEventAction({ event }: { event: Schemas["SteamyEventDetail"] }) {
  const reason = closedReason(eventState(event));
  return (
    <>
      <EventAvailability event={event} />
      {reason ? (
        <>
          <Button block size="lg" disabled aria-describedby="motif-evenement">
            {CLOSED_REASONS[reason].cta}
          </Button>
          <p id="motif-evenement" className="m-0 text-center text-[13px] font-bold text-ink-600">
            {CLOSED_REASONS[reason].reason}
          </p>
        </>
      ) : (
        <Button block size="lg" href={routes.parent.eventSignup(event.slug)}>
          Inscrire un enfant
        </Button>
      )}
    </>
  );
}

/** WL23 dans le shell parent : la fiche publique du lot 1 (titre en h2 sous le h1 du header), encart du parent. */
export async function ParentEventView({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  return (
    <EventDetail
      event={event}
      headingLevel={2}
      embedded
      breadcrumb={parentEventBreadcrumb(event)}
      action={<ParentEventAction event={event} />}
    />
  );
}
