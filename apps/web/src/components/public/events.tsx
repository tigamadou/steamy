import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { Badge, Breadcrumb, Button, SkeletonBlock } from "@/components/ds";
import { datePill, formatFullDate, formatTimeRange } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

// Steamy Events (S8) : ligne de calendrier (WL21) et fiche réutilisable (WL23, puis WD10 et WPD06).

type SteamyEvent = Schemas["SteamyEvent"];

/** Lieu affiché : « En ligne » ou « Ville · lieu ». */
export function eventPlace(event: SteamyEvent): string {
  if (event.online) {
    return "En ligne";
  }
  return [event.city, event.place].filter(Boolean).join(" · ");
}

/** État de l'événement pour le visiteur : ouvert, complet, candidatures closes ou passé. */
export type EventState = "open" | "full" | "closed" | "past";

export function eventState(event: SteamyEvent): EventState {
  if (event.isPast) {
    return "past";
  }
  if (event.seatsLeft <= 0) {
    return "full";
  }
  return event.applicationsOpen ? "open" : "closed";
}

function PriceBadge({ event }: { event: SteamyEvent }) {
  return event.isFree ? (
    <Badge tone="success">Gratuit</Badge>
  ) : (
    <Badge tone="primary">{formatPrice(event.price ?? 0)}</Badge>
  );
}

/** Pastille 64 × 64 à la couleur de l'événement : jour et mois. */
function DatePill({ iso, color, large }: { iso: string; color?: string; large?: boolean }) {
  const { day, month } = datePill(iso);
  return (
    <span
      className={
        large
          ? "flex size-24 shrink-0 flex-col items-center justify-center rounded-[20px] bg-surface text-ink-900 shadow-pop-md"
          : "relative flex size-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-[14px] bg-(--event) text-white"
      }
      style={color ? ({ "--event": color } as CSSProperties) : undefined}
    >
      {!large && <span aria-hidden className="absolute inset-0 bg-ink-900/40" />}
      <span className={large ? "text-[38px] leading-none font-black" : "relative text-2xl leading-none font-black"}>
        {day}
      </span>
      <span className={large ? "text-[13px] font-black text-ink-600" : "relative text-[11px] font-extrabold"}>
        {month}
      </span>
    </span>
  );
}

/** Ligne de WL21 : date, titre, lieu et créneau, prix, « Voir l'événement » (jamais d'inscription directe). */
export function EventRow({ event }: { event: SteamyEvent }) {
  const state = eventState(event);
  return (
    <article className="relative flex flex-wrap items-center gap-4.5 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4 hover:shadow-card-hover sm:flex-nowrap">
      <DatePill iso={event.startsAt} color={event.color} />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-black text-ink-900">
          <Link
            href={routes.event(event.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-[18px] after:focus-visible:outline-3 after:focus-visible:outline-primary-500"
          >
            {event.title}
          </Link>
        </h2>
        <p className="mt-0.5 text-[13px] font-bold text-ink-600">
          📍 {eventPlace(event)} · 🕒 {formatTimeRange(event.startsAt, event.endsAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {state === "full" && <Badge tone="error">Complet</Badge>}
        <PriceBadge event={event} />
      </div>
      <span aria-hidden className="hidden text-sm font-extrabold text-primary-600 sm:inline">
        Voir l&apos;événement →
      </span>
    </article>
  );
}

/** Skeleton de la liste de WL21. */
export function EventListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des événements…" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonBlock key={i} className="h-24 rounded-[18px]" />
      ))}
    </div>
  );
}

/** Encart d'action du visiteur : places, prix, « Participer » ou motif quand l'événement n'est plus ouvert. */
export function EventVisitorAction({ event }: { event: SteamyEvent }) {
  const state = eventState(event);
  const back = routes.event(event.slug);
  const taken = event.capacity - event.seatsLeft;
  const percent = event.capacity > 0 ? Math.round((taken / event.capacity) * 100) : 100;
  return (
    <>
      <div className="flex items-baseline justify-between">
        <p className="text-[26px] font-black text-ink-900">
          {event.isFree ? "Gratuit" : formatPrice(event.price ?? 0)}
        </p>
        {!event.isFree && <Badge tone="primary">Payant</Badge>}
      </div>
      {state === "past" ? (
        <p className="text-[13px] font-extrabold text-ink-600">
          Cet événement a eu lieu le {formatFullDate(event.startsAt)}.
        </p>
      ) : (
        <div>
          <p className="mb-1.5 flex justify-between text-[13px] font-extrabold text-ink-700">
            <span>{state === "full" ? "Complet" : `${event.seatsLeft} places restantes`}</span>
            <span className="text-ink-600">sur {event.capacity}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Places attribuées"
            aria-valuemin={0}
            aria-valuemax={event.capacity}
            aria-valuenow={taken}
            className="h-2.5 overflow-hidden rounded-pill bg-ink-100"
          >
            <div
              className={state === "full" ? "h-full bg-ink-600" : "h-full bg-amber-500"}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
      {state === "open" && (
        <>
          <Button block size="lg" href={routes.login(back)}>
            Participer
          </Button>
          <p className="text-center text-[13px] font-bold text-ink-600">
            Pas encore de compte ?{" "}
            <Link
              href={routes.signup(back)}
              className="font-black text-primary-600 underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
            >
              Créer un compte
            </Link>
          </p>
        </>
      )}
      {state !== "open" && (
        <>
          <Button block size="lg" disabled>
            {{ full: "Complet", closed: "Candidatures closes", past: "Événement terminé" }[state]}
          </Button>
          <p className="text-center text-[13px] font-bold text-ink-600">
            {state === "full" && `Les ${event.capacity} places sont prises. `}
            {state === "closed" && "La date limite de candidature est passée. "}
            <Link
              href={routes.events}
              className="font-black text-primary-600 underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
            >
              Voir les prochains événements
            </Link>
          </p>
        </>
      )}
      {state === "open" && (
        <p className="flex gap-2.5 rounded-[14px] border-2 border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-normal font-bold text-ink-700">
          <span aria-hidden>👨‍👩‍👧</span>
          {event.isFree
            ? "Participation soumise à l'accord du parent."
            : "Participation soumise à l'accord du parent, qui règle aussi l'inscription en Mobile Money."}
        </p>
      )}
    </>
  );
}

/**
 * Fiche d'un événement (WL23), réutilisable dans les espaces connectés : l'encart d'action est fourni par l'appelant
 * (visiteur ici, apprenant au lot 3, parent au lot 4).
 */
export function EventDetail({ event, action }: { event: Schemas["SteamyEventDetail"]; action: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-14 sm:px-8">
      <Breadcrumb className="mb-4" items={[{ label: "Événements", href: routes.events }, { label: event.title }]} />
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div
            className="relative flex flex-col gap-5.5 overflow-hidden rounded-[24px] bg-(--event) p-6.5 text-white sm:flex-row sm:items-center"
            style={{ "--event": event.color } as CSSProperties}
          >
            <span aria-hidden className="absolute inset-0 bg-ink-900/45" />
            <div className="relative">
              <DatePill iso={event.startsAt} large />
            </div>
            <div className="relative flex flex-1 flex-col gap-2">
              <p className="self-start rounded-pill bg-ink-900/30 px-3 py-1 text-xs font-black tracking-[0.04em] uppercase">
                {event.emoji} Steamy Event
              </p>
              <h1 className="text-[26px] leading-tight font-black sm:text-[30px]">{event.title}</h1>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-extrabold">
                <li>📅 {formatFullDate(event.startsAt)}</li>
                <li>🕒 {formatTimeRange(event.startsAt, event.endsAt)}</li>
                <li>📍 {eventPlace(event)}</li>
                {event.audience && <li>👥 {event.audience}</li>}
              </ul>
            </div>
          </div>
          <section className="mt-7">
            <h2 className="mb-3 text-xl font-black text-ink-900">L&apos;événement</h2>
            <p className="text-[15px] leading-relaxed font-semibold whitespace-pre-line text-ink-700">
              {event.description}
            </p>
          </section>
          <section className="mt-7">
            <h2 className="mb-3 text-xl font-black text-ink-900">Infos pratiques</h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              <li className="flex gap-2.5 rounded-[14px] border-2 border-ink-100 bg-ink-50 px-3.5 py-3 text-[13px] font-bold text-ink-700">
                <span aria-hidden>🗺️</span>
                {event.online ? "En ligne : le lien est envoyé après l'accord du parent." : eventPlace(event)}
              </li>
              <li className="flex gap-2.5 rounded-[14px] border-2 border-ink-100 bg-ink-50 px-3.5 py-3 text-[13px] font-bold text-ink-700">
                <span aria-hidden>⏳</span>
                Candidatures jusqu&apos;au {formatFullDate(event.applicationDeadline)}
              </li>
            </ul>
          </section>
        </div>
        <aside
          aria-label="Participer à l'événement"
          className="flex flex-col gap-3.5 rounded-[22px] border-2 border-ink-100 bg-surface p-5.5 shadow-pop-md lg:sticky lg:top-24"
        >
          {action}
        </aside>
      </div>
    </div>
  );
}

/** Skeleton de la fiche WL23. */
export function EventDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de l'événement…"
      className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-14 sm:px-8"
    >
      <SkeletonBlock className="mb-4 h-3.5 w-56" />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-40 rounded-[24px]" />
          <SkeletonBlock className="h-5.5 w-48" />
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-3.5 w-3/4" />
        </div>
        <SkeletonBlock className="h-80 rounded-[22px]" />
      </div>
    </div>
  );
}
