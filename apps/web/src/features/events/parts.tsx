import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Badge } from "@/components/ds/Badge";
import { Button } from "@/components/ds/Button";
import { eventPlace, eventState, EventThumb, PriceBadge } from "@/components/public/events";
import { formatFullDate } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { APPLICATION_STATUS, CLOSED_REASONS, closedReason } from "./status";

// Morceaux de Steamy Events côté apprenant (WD10, WL23, WD11), sans état : rendus côté serveur.

const l = routes.learner;
const LINK =
  "rounded-sm text-ink-900 hover:text-primary-700 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500";

/** Statut d'une candidature, tel que servi par l'API (C3). */
export function ApplicationStatusBadge({ status }: { status: Schemas["ApplicationStatusEnum"] }) {
  const { label, tone } = APPLICATION_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * Carte d'un événement à venir (WD10) : titre → fiche WL23 dans le shell ; « Participer » → WD11, remplacé par le
 * statut de la candidature en cours ou par le motif d'un événement complet ou clos.
 */
export function EventCard({ event, application }: { event: Schemas["SteamyEvent"]; application?: Schemas["Application"] }) {
  const reason = closedReason(eventState(event));
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border-[1.5px] border-ink-100 bg-surface">
      <EventThumb event={event} className="h-24 text-[44px]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="m-0 text-[15px] font-black">
          <Link href={l.event(event.slug)} className={LINK}>
            {event.title}
          </Link>
        </h3>
        <p className="m-0 text-[13px] font-bold text-ink-600">
          📅 {formatFullDate(event.startsAt)} · 📍 {eventPlace(event)}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5">
          <PriceBadge event={event} />
          {application ? (
            <ApplicationStatusBadge status={application.status} />
          ) : reason ? (
            <Badge tone="neutral">{CLOSED_REASONS[reason].cta}</Badge>
          ) : (
            <Button size="sm" href={l.eventApplication(event.slug)}>
              Participer <span className="sr-only">à {event.title}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Ligne de « Mes candidatures » (WD10) : événement, date, statut ; motif du parent s'il a refusé. */
export function ApplicationRow({ application }: { application: Schemas["Application"] }) {
  const { event } = application;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5">
      <EventThumb event={event} className="size-10 rounded-[12px] text-lg" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold">
          <Link href={l.event(event.slug)} className={LINK}>
            {event.title}
          </Link>
        </p>
        <p className="m-0 text-[13px] font-bold text-ink-600">
          📅 {formatFullDate(event.startsAt)}
          {application.ticketUsed && " · 🎟️ Ticket Steamy Events utilisé"}
        </p>
        {application.status === "refused" && application.refusalReason && (
          <p className="m-0 mt-1 text-[13px] font-semibold text-ink-700">Motif : {application.refusalReason}</p>
        )}
      </div>
      <ApplicationStatusBadge status={application.status} />
    </div>
  );
}

/** Encart de l'accord du parent (S8) ; pour un événement payant sans ticket, le parent règle aussi l'inscription. */
export function ParentNotice({ paid }: { paid: boolean }) {
  return (
    <p className="m-0 flex gap-3 rounded-[14px] border-2 border-amber-300 bg-amber-100 p-3.5 text-[13px] leading-normal font-bold text-ink-800">
      <span aria-hidden className="text-xl">
        👨‍👩‍👧
      </span>
      {paid
        ? "Ta candidature sera envoyée à ton parent pour accord, qui réglera aussi l'inscription."
        : "Ta candidature sera envoyée à ton parent pour accord."}
    </p>
  );
}

/** Ticket Steamy Events offert à la certification (D33) : la candidature à un événement payant devient gratuite (C12). */
export function TicketNotice({ ticket, children }: { ticket: Schemas["Ticket"]; children: string }) {
  return (
    <p className="m-0 flex gap-3 rounded-[14px] border-2 border-primary-100 bg-primary-50 p-3.5 text-[13px] leading-normal font-bold text-ink-800">
      <span aria-hidden className="text-xl">
        🎟️
      </span>
      <span>
        {children} <span className="font-semibold">Offert pour ta certification « {ticket.courseTitle} ».</span>
      </span>
    </p>
  );
}
