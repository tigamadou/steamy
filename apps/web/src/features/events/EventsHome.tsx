import { Mascot } from "@/components/ds/Mascot";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";

import { getMyApplications, getMyTickets, getUpcomingEvents } from "./api";
import { ApplicationRow, EventCard, TicketNotice } from "./parts";
import { activeApplication, freeTicket } from "./status";

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
 * WD10 · Steamy Events de l'apprenant (S8, D41) : « Événements à venir » (prix et places du serveur, « Participer »
 * absent si une candidature est en cours) et « Mes candidatures » avec leur statut (C3). Un ticket non utilisé est
 * signalé (C12).
 */
export async function EventsHome() {
  const [events, applications, tickets] = await Promise.all([getUpcomingEvents(), getMyApplications(), getMyTickets()]);
  const ticket = freeTicket(tickets);
  return (
    <div className="flex flex-col gap-6">
      {ticket && (
        <TicketNotice ticket={ticket}>
          Tu as un ticket Steamy Events : ta prochaine candidature à un événement payant est gratuite, avec l&apos;accord
          de ton parent.
        </TicketNotice>
      )}
      <section aria-labelledby="evenements-a-venir">
        <SectionHeader id="evenements-a-venir" title="Événements à venir" />
        {events.length === 0 ? (
          <Empty title="Aucun événement à venir" body="Les prochains Steamy Events seront annoncés ici. Reviens bientôt !" />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <li key={event.slug}>
                <EventCard event={event} application={activeApplication(applications, event.slug)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="mes-candidatures">
        <SectionHeader id="mes-candidatures" title="Mes candidatures" />
        {applications.length === 0 ? (
          <Empty
            title="Pas encore de candidature"
            body="Choisis un événement et envoie ta candidature : ton parent recevra ta demande pour donner son accord."
          />
        ) : (
          <ul aria-label="Tes candidatures" className="m-0 flex list-none flex-col gap-2 p-0">
            {applications.map((application) => (
              <li key={application.id}>
                <ApplicationRow application={application} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Squelette fidèle à WD10 pendant la lecture des événements et des candidatures. */
export function EventsHomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des événements…" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-5 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <SkeletonBlock key={key} className="h-56 rounded-[18px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-16 rounded-[14px]" />
        <SkeletonBlock className="h-16 rounded-[14px]" />
      </div>
    </div>
  );
}
