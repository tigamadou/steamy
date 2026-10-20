import type { Schemas } from "@steamy/api-client";

import type { BadgeTone } from "@/components/ds/Badge";
import type { EventState } from "@/components/public/events";

type Application = Schemas["Application"];
export type ApplicationStatus = Schemas["ApplicationStatusEnum"];

/** Libellé (au tutoiement) et ton du statut d'une candidature, tel que servi par l'API (C3). */
export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; tone: BadgeTone }> = {
  pending_parent: { label: "En attente de ton parent", tone: "amber" },
  pending_payment: { label: "En attente du paiement", tone: "info" },
  accepted: { label: "Acceptée", tone: "success" },
  refused: { label: "Refusée", tone: "error" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

/** Statuts d'une candidature en cours : l'API refuse une nouvelle candidature au même événement (`ALREADY_APPLIED`). */
const ACTIVE: ReadonlySet<ApplicationStatus> = new Set(["pending_parent", "pending_payment", "accepted"]);

/** Candidature en cours de l'apprenant pour cet événement, s'il en a une (pas de « Participer » dans ce cas). */
export function activeApplication(applications: readonly Application[], slug: string): Application | undefined {
  return applications.find((application) => application.event.slug === slug && ACTIVE.has(application.status));
}

/** Ticket Steamy Events pas encore utilisé (D33) : il rend gratuite la candidature à un événement payant (C12). */
export function freeTicket(tickets: readonly Schemas["Ticket"][]): Schemas["Ticket"] | undefined {
  return tickets.find((ticket) => !ticket.used);
}

/** Motifs d'une candidature impossible : état de l'événement lu dans l'API, ou code d'erreur à l'envoi. */
export const CLOSED_REASONS = {
  EVENT_FULL: { cta: "Complet", reason: "Toutes les places sont prises." },
  EVENT_CLOSED: { cta: "Candidatures closes", reason: "La date limite de candidature est passée." },
  EVENT_PAST: { cta: "Événement terminé", reason: "Cet événement a déjà eu lieu." },
} as const;

export type ClosedReason = keyof typeof CLOSED_REASONS;

const REASON_OF_STATE: Record<EventState, ClosedReason | null> = {
  open: null,
  full: "EVENT_FULL",
  closed: "EVENT_CLOSED",
  past: "EVENT_PAST",
};

/** Motif d'un événement qui n'accepte plus de candidature, ou `null` s'il est ouvert. */
export function closedReason(state: EventState): ClosedReason | null {
  return REASON_OF_STATE[state];
}
