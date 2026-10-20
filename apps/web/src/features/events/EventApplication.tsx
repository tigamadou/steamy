import type { Schemas } from "@steamy/api-client";
import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { eventPlace, eventState } from "@/components/public/events";
import { formatFullDate } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { getEvent, getMyApplications, getMyTickets } from "./api";
import { ApplicationForm } from "./ApplicationForm";
import { eventBreadcrumb } from "./LearnerEventView";
import { ApplicationStatusBadge, ParentNotice, PriceBadge, TicketNotice } from "./parts";
import { activeApplication, CLOSED_REASONS, closedReason, freeTicket } from "./status";

/** Carte de WD11 : rappel de l'événement (date, lieu, prix) puis son contenu. */
function ApplicationCard({ event, children }: { event: Schemas["SteamyEventDetail"]; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-(--event) text-[28px]"
          style={{ "--event": event.color } as CSSProperties}
        >
          {event.emoji || "🎟️"}
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-xl font-black text-ink-900">{event.title}</h2>
          <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-[13px] font-bold text-ink-600">
            📅 {formatFullDate(event.startsAt)} · 📍 {eventPlace(event)} · <PriceBadge price={event.price} />
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * WD11 · Candidature à un événement (S8, C12) : rappel, formulaire, encart de l'accord du parent (et du paiement si
 * l'événement est payant), ticket Steamy Events s'il rend la candidature gratuite. Déjà candidat, complet ou clos :
 * le motif remplace le formulaire.
 */
export async function EventApplication({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, applications, tickets] = await Promise.all([getEvent(slug), getMyApplications(), getMyTickets()]);
  if (!event) notFound();
  const application = activeApplication(applications, event.slug);
  const reason = closedReason(eventState(event));
  // Le serveur n'emploie le ticket que pour un événement payant (D33, C12).
  const ticket = event.isFree ? undefined : freeTicket(tickets);

  let content: ReactNode;
  if (application) {
    content = (
      <>
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-bold text-ink-800">
          Tu as déjà candidaté à cet événement : <ApplicationStatusBadge status={application.status} />
        </p>
        <Button block variant="outline" href={routes.learner.events}>
          Voir mes candidatures
        </Button>
      </>
    );
  } else if (reason) {
    content = (
      <>
        <p className="m-0 text-sm font-bold text-ink-800">{CLOSED_REASONS[reason].reason}</p>
        <Button block variant="outline" href={routes.learner.events}>
          Voir les autres événements
        </Button>
      </>
    );
  } else {
    content = (
      <>
        <ApplicationForm
          slug={event.slug}
          notice={
            <>
              {ticket && (
                <TicketNotice ticket={ticket}>
                  Ton ticket Steamy Events rend cette candidature gratuite : ton parent donne seulement son accord.
                </TicketNotice>
              )}
              <ParentNotice paid={!event.isFree && !ticket} />
            </>
          }
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <Breadcrumb items={eventBreadcrumb(event, "Candidature")} />
      <ApplicationCard event={event}>{content}</ApplicationCard>
    </div>
  );
}

/** Squelette fidèle à WD11. */
export function EventApplicationSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la candidature…"
      className="mx-auto flex w-full max-w-140 flex-col gap-4"
    >
      <SkeletonBlock className="h-3.5 w-64" />
      <SkeletonBlock className="h-120 rounded-[22px]" />
    </div>
  );
}
