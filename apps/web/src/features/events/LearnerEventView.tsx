import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { Button } from "@/components/ds/Button";
import { EventAvailability, EventDetail, eventState } from "@/components/public/events";
import { routes } from "@/lib/routes";

import { getEvent, getMyApplications, getMyTickets } from "./api";
import { ApplicationStatusBadge, ParentNotice } from "./parts";
import { activeApplication, CLOSED_REASONS, closedReason, freeTicket } from "./status";

const l = routes.learner;

/** Fil d'Ariane des écrans d'un événement dans le shell (« Steamy Events › … »). */
export function eventBreadcrumb(event: Pick<Schemas["SteamyEvent"], "slug" | "title">, current?: string) {
  return current
    ? [
        { label: "Steamy Events", href: l.events },
        { label: event.title, href: l.event(event.slug) },
        { label: current },
      ]
    : [{ label: "Steamy Events", href: l.events }, { label: event.title }];
}

/**
 * Encart d'action de l'apprenant sur WL23 : prix et places du serveur, puis « Demander à participer » (→ WD11),
 * le statut de sa candidature en cours, ou le CTA désactivé avec le motif (`EVENT_FULL`, `EVENT_CLOSED`, passé).
 * Un ticket Steamy Events libre rend gratuit un événement payant (C12) : le parent ne donne alors que son accord.
 */
export function LearnerEventAction({
  event,
  application,
  ticket,
}: {
  event: Schemas["SteamyEventDetail"];
  application?: Schemas["Application"];
  ticket?: Schemas["Ticket"];
}) {
  const reason = closedReason(eventState(event));
  return (
    <>
      <EventAvailability event={event} />
      {application ? (
        <>
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink-800">
            Ta candidature : <ApplicationStatusBadge status={application.status} />
          </p>
          <Button block variant="outline" href={l.events}>
            Voir mes candidatures
          </Button>
        </>
      ) : reason ? (
        <>
          <Button block size="lg" disabled aria-describedby="motif-evenement">
            {CLOSED_REASONS[reason].cta}
          </Button>
          <p id="motif-evenement" className="m-0 text-center text-[13px] font-bold text-ink-600">
            {CLOSED_REASONS[reason].reason}
          </p>
        </>
      ) : (
        <>
          <Button block size="lg" href={l.eventApplication(event.slug)}>
            Demander à participer
          </Button>
          <ParentNotice paid={!event.isFree && !ticket} />
        </>
      )}
    </>
  );
}

/** WL23 dans le shell : la fiche publique du lot 1 (titre en h2 sous le h1 du header), avec l'encart de l'apprenant. */
export async function LearnerEventView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, applications, tickets] = await Promise.all([getEvent(slug), getMyApplications(), getMyTickets()]);
  if (!event) notFound();
  return (
    <EventDetail
      event={event}
      headingLevel={2}
      embedded
      breadcrumb={eventBreadcrumb(event)}
      action={
        <LearnerEventAction
          event={event}
          application={activeApplication(applications, event.slug)}
          ticket={freeTicket(tickets)}
        />
      }
    />
  );
}
