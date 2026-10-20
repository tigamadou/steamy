import { notFound } from "next/navigation";

import { Breadcrumb, Button, SkeletonBlock } from "@/components/ds";
import { eventPlace, eventState, PriceBadge } from "@/components/public/events";
import { getEvent } from "@/features/events/api";
import { CLOSED_REASONS, closedReason } from "@/features/events/status";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { formatFullDate, formatTimeRange } from "@/lib/dates";
import { getCountries } from "@/lib/referentials";
import { routes } from "@/lib/routes";

import { EventSignupForm } from "./EventSignupForm";
import { parentEventBreadcrumb } from "./ParentEventView";

/** Enfants lus pour l'inscription : une famille en compte rarement plus. */
const KIDS_PAGE_SIZE = 50;

/**
 * WPD12 · Inscrire un enfant à un événement : en-tête (date, lieu, prix du serveur), enfants actifs, motivation ;
 * événement complet, clos ou passé : le motif, sans formulaire.
 */
export async function EventSignup({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  const api = await getServerApi();
  const [children, profile, countries] = await Promise.all([
    api.GET("/api/accounts/children/", { params: { query: { pageSize: KIDS_PAGE_SIZE } } }),
    api.GET("/api/accounts/me/parent-profile/"),
    getCountries(),
  ]);
  const list = readOrNull(children);
  const parent = readOrNull(profile);
  if (!list || !parent) return null;
  const kids = (list.results ?? []).filter((child) => child.status === "active");
  const reason = closedReason(eventState(event));

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5">
      <Breadcrumb items={parentEventBreadcrumb(event, "Inscrire un enfant")} />
      <section
        aria-labelledby="evenement-inscription"
        className="flex flex-col gap-2 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5"
      >
        <h2 id="evenement-inscription" className="m-0 text-xl font-black text-ink-900">
          {event.emoji} {event.title}
        </h2>
        <p className="m-0 text-[13px] font-bold text-ink-600">
          📅 {formatFullDate(event.startsAt)} · 🕒 {formatTimeRange(event.startsAt, event.endsAt)} · 📍{" "}
          {eventPlace(event)}
        </p>
        <div>
          <PriceBadge event={event} />
        </div>
      </section>
      {reason ? (
        <p role="status" className="m-0 rounded-[18px] bg-ink-50 px-5 py-4 text-sm font-bold text-ink-700">
          {CLOSED_REASONS[reason].reason} L&apos;inscription n&apos;est plus possible.
        </p>
      ) : kids.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[18px] border-2 border-dashed border-ink-200 px-5 py-5">
          <p className="m-0 text-sm font-semibold text-ink-700">
            Aucun enfant actif à inscrire. Ajoutez d&apos;abord le compte de votre enfant.
          </p>
          <Button href={routes.parent.addChild} icon="plus">
            Ajouter un enfant
          </Button>
        </div>
      ) : (
        <EventSignupForm event={event} kids={kids} countries={countries} preferred={parent.mobileMoney} />
      )}
    </div>
  );
}

/** Squelette de WPD12. */
export function EventSignupSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de l'événement…" className="mx-auto flex w-full max-w-180 flex-col gap-5">
      <SkeletonBlock className="h-3.5 w-56" />
      <SkeletonBlock className="h-28 rounded-[22px]" />
      <SkeletonBlock className="h-80 rounded-[22px]" />
    </div>
  );
}
