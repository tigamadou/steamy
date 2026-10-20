import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Breadcrumb, Icon, SkeletonBlock, StatPill, WeeklyActivityBars } from "@/components/ds";
import { formatSeconds, toActivityDays } from "@/features/learning/progress/ProgressView";
import { getChild } from "@/features/parent/children/api";
import { CourseProgressList } from "@/features/parent/children/ChildDetail";
import { fullName } from "@/features/parent/children/ChildRow";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { formatDate } from "@/lib/dates";
import { routes } from "@/lib/routes";

type Report = Schemas["WeeklyReport"];
type Query = Record<string, string | string[] | undefined>;

/** Semaine ISO lue dans l'URL (`?semaine=AAAA-Www`), ignorée si illisible : la semaine en cours. */
export function parseWeek(value: string | string[] | undefined): string | undefined {
  const week = Array.isArray(value) ? value[0] : value;
  return week && /^\d{4}-W\d{2}$/.test(week) ? week : undefined;
}

/**
 * « Semaine précédente » / « Semaine suivante » (`?semaine=`), bornées par l'API (`previousWeek`, `nextWeek` ; nul
 * pour la semaine en cours comme pour une semaine à venir), et « Cette semaine » quand l'URL en demande une précise.
 */
export function WeekNavigator({ childId, report, chosen }: { childId: number; report: Report; chosen: boolean }) {
  const link = (week: string | null, label: string, icon: "arrow-left" | "arrow-right") =>
    week ? (
      <Link
        href={routes.parent.weeklyReport(childId, week)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-extrabold text-primary-700 hover:bg-primary-50 focus-visible:outline-3 focus-visible:outline-primary-500"
      >
        {icon === "arrow-left" && <Icon name={icon} size={16} />}
        {label}
        {icon === "arrow-right" && <Icon name={icon} size={16} />}
      </Link>
    ) : (
      <span aria-disabled="true" className="inline-flex min-h-11 items-center px-3 text-sm font-extrabold text-ink-400">
        {label}
      </span>
    );
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-center text-lg font-black text-ink-900">
        Semaine du {formatDate(report.startDate)} au {formatDate(report.endDate)}
      </h2>
      <nav aria-label="Semaines" className="flex flex-wrap items-center justify-between gap-2">
        {link(report.previousWeek, "Semaine précédente", "arrow-left")}
        {chosen && (
          <Link
            href={routes.parent.weeklyReport(childId)}
            className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-extrabold text-primary-700 underline hover:bg-primary-50 focus-visible:outline-3 focus-visible:outline-primary-500"
          >
            Cette semaine
          </Link>
        )}
        {link(report.nextWeek, "Semaine suivante", "arrow-right")}
      </nav>
    </div>
  );
}

/** Temps d'apprentissage, missions terminées et quiz réussis de la semaine, tels que servis par l'API (D55). */
export function WeeklyStats({ report }: { report: Report }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatPill icon="book" label="Temps d'apprentissage" value={formatSeconds(report.seconds)} tone="primary" />
      <StatPill icon="check" label="Missions terminées" value={report.missionsCompleted} tone="success" />
      <StatPill icon="star" label="Quiz réussis" value={report.quizzesPassed} tone="amber" />
    </div>
  );
}

/** Envoi du rapport par email (D55) : l'adresse du parent, ou « Ajouter un email » vers WPD08. Pas d'envoi ponctuel. */
export function WeeklyEmailNotice({ email }: { email: string | null }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-2 rounded-[14px] bg-info-50 p-3.5 text-sm font-bold text-info-700">
      <Icon name="mail" size={18} />
      {email ? (
        <span>
          Ce rapport vous est envoyé chaque semaine à <strong className="break-all">{email}</strong>.
        </span>
      ) : (
        <>
          Recevez ce rapport chaque semaine par email :
          <Link href={routes.parent.settings} className="font-black text-primary-700 underline">
            Ajouter un email
          </Link>
        </>
      )}
    </p>
  );
}

/** WPD11 · contenu, une fois l'enfant et la semaine lus. */
export function WeeklyReportView({
  child,
  report,
  chosen = false,
}: {
  child: { id: number; firstName: string; lastName: string };
  report: Report;
  /** Semaine demandée dans l'URL (`?semaine=`) plutôt que la semaine en cours. */
  chosen?: boolean;
}) {
  const empty = report.seconds === 0 && report.missionsCompleted === 0 && report.quizzesPassed === 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          items={[
            { label: "Mes enfants", href: routes.parent.children },
            { label: fullName(child), href: routes.parent.child(child.id) },
            { label: "Rapport hebdomadaire" },
          ]}
        />
        <Link
          href={routes.parent.child(child.id)}
          className="inline-flex min-h-11 items-center text-sm font-extrabold text-primary-700 underline focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          Voir le profil<span className="sr-only"> de {fullName(child)}</span>
        </Link>
      </div>
      <WeekNavigator childId={child.id} report={report} chosen={chosen} />
      <WeeklyStats report={report} />
      <section aria-labelledby="activite-semaine" className="rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5">
        <h2 id="activite-semaine" className="m-0 mb-3 text-lg font-black text-ink-900">
          Activité de la semaine
        </h2>
        {empty ? (
          <p className="m-0 text-sm font-semibold text-ink-600">
            Aucune activité cette semaine : {child.firstName} n&apos;a pas encore travaillé sur Steamy.
          </p>
        ) : (
          <WeeklyActivityBars
            days={toActivityDays(report.days)}
            caption={`Temps d'apprentissage de ${child.firstName}, jour par jour`}
          />
        )}
      </section>
      <CourseProgressList courses={report.courses} />
      <WeeklyEmailNotice email={report.email} />
    </div>
  );
}

/**
 * WPD11 · Rapport hebdomadaire d'un enfant (`GET accounts/children/{id}/weekly-report/?week=`, D55) : semaine ISO
 * dans l'URL (`?semaine=`, une semaine à venir comprise ; illisible : la semaine en cours ; refusée par l'API : retour à
 * l'URL sans semaine), chiffres du serveur. L'enfant d'un autre parent → « introuvable ».
 */
export async function WeeklyReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const week = parseWeek(query.semaine);
  const api = await getServerApi();
  const [child, result] = await Promise.all([
    getChild(id),
    api.GET("/api/accounts/children/{id}/weekly-report/", { params: { path: { id }, query: week ? { week } : {} } }),
  ]);
  if (!child) return null;
  // Semaine refusée par l'API (avant 2000-W01, par exemple) : l'URL de la semaine en cours, sans `?semaine=`
  if (week && result.response.status === 400) redirect(routes.parent.weeklyReport(child.id));
  const report = readOrNull(result);
  if (!report) return null;
  return <WeeklyReportView child={child} report={report} chosen={week !== undefined} />;
}

/** Squelette de WPD11. */
export function WeeklyReportSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du rapport hebdomadaire…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-4 w-56 rounded-sm" />
      <SkeletonBlock className="h-11 rounded-pill" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <SkeletonBlock key={key} className="h-20 rounded-[18px]" />
        ))}
      </div>
      <SkeletonBlock className="h-52 rounded-[22px]" />
    </div>
  );
}
