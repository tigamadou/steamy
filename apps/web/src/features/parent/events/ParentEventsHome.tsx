import type { Schemas } from "@steamy/api-client";

import { Badge, Button, Mascot, SectionHeader, SkeletonBlock } from "@/components/ds";
import { eventState } from "@/components/public/events";
import { getMyApplications, getUpcomingEvents } from "@/features/events/api";
import { EventTile } from "@/features/events/EventTile";
import { CLOSED_REASONS, closedReason } from "@/features/events/status";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCountries } from "@/lib/referentials";
import { routes } from "@/lib/routes";

import { EventApplicationRow } from "./EventApplicationRow";

type SearchParams = Record<string, string | string[] | undefined>;

/** Candidature à mettre en avant (`?candidature=<id>`, lien de « À valider » et des notifications). */
export function highlightedApplication(searchParams: SearchParams): number | null {
  const value = Array.isArray(searchParams.candidature) ? searchParams.candidature[0] : searchParams.candidature;
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

/** Carte d'un événement à venir (WPD06) : fiche WL23 dans le shell, « Inscrire un enfant » → WPD12 s'il est ouvert. */
function ParentEventCard({ event }: { event: Schemas["SteamyEvent"] }) {
  const reason = closedReason(eventState(event));
  return (
    <EventTile
      event={event}
      href={routes.parent.event(event.slug)}
      action={
        reason ? (
          <Badge tone="neutral">{CLOSED_REASONS[reason].cta}</Badge>
        ) : (
          <Button size="sm" href={routes.parent.eventSignup(event.slug)}>
            Inscrire un enfant<span className="sr-only"> à {event.title}</span>
          </Button>
        )
      }
    />
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-ink-200 px-6 py-8 text-center">
      <Mascot pose="sleep" size={88} />
      <p className="m-0 text-base font-black text-ink-900">{title}</p>
      <p className="m-0 max-w-105 text-sm font-semibold text-ink-600">{body}</p>
    </div>
  );
}

/**
 * WPD06 · Steamy Events du parent : « Événements à venir » (prix et places du serveur) et « Demandes de mes enfants »
 * avec « Accepter » / « Refuser » sur les candidatures en attente (D53) et le paiement d'un événement payant accepté.
 */
export async function ParentEventsHome({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const highlighted = highlightedApplication(await searchParams);
  const api = await getServerApi();
  const [events, applications, countries, profile] = await Promise.all([
    getUpcomingEvents(),
    getMyApplications(),
    getCountries(),
    api.GET("/api/accounts/me/parent-profile/"),
  ]);
  const parent = readOrNull(profile);
  if (!parent) return null;
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="demandes-enfants">
        <SectionHeader id="demandes-enfants" title="Demandes de mes enfants" />
        {applications.length === 0 ? (
          <Empty
            title="Aucune candidature"
            body="Quand votre enfant demande à participer à un événement, sa candidature attend ici votre accord."
          />
        ) : (
          <ul aria-label="Candidatures de mes enfants" className="m-0 flex list-none flex-col gap-3 p-0">
            {applications.map((application) => (
              // La ligne garde sa copie de la candidature : un nouveau statut lu par `router.refresh()` la remonte
              <li key={`${application.id}-${application.status}`}>
                <EventApplicationRow
                  application={application}
                  countries={countries}
                  preferred={parent.mobileMoney}
                  highlighted={application.id === highlighted}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="evenements-a-venir">
        <SectionHeader id="evenements-a-venir" title="Événements à venir" />
        {events.length === 0 ? (
          <Empty title="Aucun événement à venir" body="Les prochains Steamy Events seront annoncés ici." />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <li key={event.slug}>
                <ParentEventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Squelette de WPD06. */
export function ParentEventsHomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des événements…" className="flex flex-col gap-6">
      <SkeletonBlock className="h-5 w-56" />
      <SkeletonBlock className="h-24 rounded-[18px]" />
      <SkeletonBlock className="h-5 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <SkeletonBlock key={key} className="h-56 rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
