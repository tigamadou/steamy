import type { Schemas } from "@steamy/api-client";

import { Avatar, Badge, Mascot, SectionHeader, SkeletonBlock } from "@/components/ds";
import type { BadgeTone } from "@/components/ds/Badge";
import { getClassrooms } from "@/features/teacher/classes/api";
import { eventState } from "@/components/public/events";
import { getUpcomingEvents } from "@/features/events/api";
import { CLOSED_REASONS, closedReason } from "@/features/events/status";
import { EventTile } from "@/features/events/EventTile";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { getEventApplications, type ClassroomEventApplication } from "./api";
import { ProposeButton } from "./ProposeButton";

type Classroom = Pick<Schemas["Classroom"], "id" | "name">;

/** Libellé (au vouvoiement) et ton du statut d'une candidature, tel que servi par l'API (C3). */
export const TEACHER_APPLICATION_STATUS: Record<
  ClassroomEventApplication["status"],
  { label: string; tone: BadgeTone }
> = {
  pending_parent: { label: "En attente du parent", tone: "amber" },
  pending_payment: { label: "En attente du paiement", tone: "info" },
  accepted: { label: "Acceptée", tone: "success" },
  refused: { label: "Refusée", tone: "error" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-ink-200 px-6 py-8 text-center">
      <Mascot pose="sleep" size={88} />
      <p className="m-0 text-base font-black text-ink-900">{title}</p>
      <p className="m-0 max-w-105 text-sm font-semibold text-ink-600">{body}</p>
    </div>
  );
}

/** Ligne de « Candidatures de mes élèves » (WT09) : élève · classe, événement, statut du serveur ; lecture seule. */
export function ApplicationLine({ application }: { application: ClassroomEventApplication }) {
  const name = `${application.learner.firstName} ${application.learner.lastName}`.trim();
  const status = TEACHER_APPLICATION_STATUS[application.status];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5">
      <Avatar name={name} emoji={application.learner.avatar?.emoji} size={44} decorative />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-ink-900">
          {name} · {application.classroom.name}
        </p>
        <p className="m-0 mt-0.5 text-xs font-semibold text-ink-600">
          {application.event.title} · candidature du {formatInstant(application.createdAt)}
        </p>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </div>
  );
}

/** WT09 · contenu : événements à venir avec « Proposer à une classe », puis candidatures de mes élèves. */
export function TeacherEventsView({
  events,
  classrooms,
  applications,
}: {
  events: Schemas["SteamyEvent"][];
  classrooms: Classroom[];
  applications: ClassroomEventApplication[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="evenements-a-venir">
        <SectionHeader id="evenements-a-venir" title="Événements à venir" />
        {events.length === 0 ? (
          <Empty title="Aucun événement à venir" body="Les prochains Steamy Events seront annoncés ici." />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const reason = closedReason(eventState(event));
              return (
                <li key={event.slug}>
                  <EventTile
                    event={event}
                    href={routes.teacher.event(event.slug)}
                    action={
                      <ProposeButton
                        eventSlug={event.slug}
                        eventTitle={event.title}
                        classrooms={classrooms}
                        closedReason={reason ? CLOSED_REASONS[reason].cta : undefined}
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="candidatures-eleves">
        <SectionHeader id="candidatures-eleves" title="Candidatures de mes élèves" />
        {applications.length === 0 ? (
          <Empty
            title="Aucune candidature"
            body="Chaque élève candidate seul, avec l'accord de son parent : ses candidatures apparaîtront ici."
          />
        ) : (
          <ul aria-label="Candidatures de mes élèves" className="m-0 flex list-none flex-col gap-2 p-0">
            {applications.map((application) => (
              <li key={application.id}>
                <ApplicationLine application={application} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** WT09 · Steamy Events de l'enseignant, lus côté serveur : événements, classes et candidatures. */
export async function TeacherEventsHome() {
  const [events, classrooms, applications] = await Promise.all([
    getUpcomingEvents(),
    getClassrooms(),
    getEventApplications(),
  ]);
  return (
    classrooms &&
    applications && <TeacherEventsView events={events} classrooms={classrooms} applications={applications} />
  );
}

/** Squelette de WT09 : cartes d'événements et lignes de candidatures. */
export function TeacherEventsHomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des événements…" className="flex flex-col gap-6">
      <SkeletonBlock className="h-5 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <SkeletonBlock key={key} className="h-48 rounded-[18px]" />
        ))}
      </div>
      <SkeletonBlock className="h-5 w-56" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
    </div>
  );
}
