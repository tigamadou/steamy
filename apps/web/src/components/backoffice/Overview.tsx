import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Icon, type IconName } from "@/components/ds/Icon";
import { adminPathUrl } from "@/lib/backoffice/access";
import { formatKpiValue, formatShortDate } from "@/lib/backoffice/format";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { CompletenessBar } from "./CompletenessBar";
import { DeadlineTracker, type DeadlineStep } from "./DeadlineTracker";
import { KpiStatusBadge } from "./KpiStatusBadge";
import { SectionHead } from "./SectionHead";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";
import { BUTTON_DARK, CARD, FOCUS, formatNumber } from "./styles";

export type OverviewData = Schemas["Overview"];
type Report = Schemas["ReportDeadline"];

/** Statut du rapport trimestriel (D74). */
export const REPORT_STATUS = {
  draft: { label: "Brouillon", tone: "amber" },
  submitted: { label: "Soumis", tone: "success" },
} as const;

/** Entrées connues de « À traiter » ; un type ajouté côté API s'affiche avec son seul libellé. */
const TODO_KINDS: Record<string, { icon: IconName; text: string }> = {
  consents_pending: { icon: "lock", text: "Suivi des demandes adressées aux parents" },
};

export type OverviewProps = {
  overview: OverviewData;
  /** URL publique de l'API : « À traiter » ouvre les listes de l'admin Django. */
  apiUrl: string;
  /** L'utilisateur peut ouvrir l'Impact Tracker (Finance, Super-admin). */
  canOpenImpact: boolean;
};

/** WAD01 · Vue d'ensemble : chiffres du serveur, affichés tels quels (aucune donnée de la maquette). */
export function Overview({ overview, apiUrl, canOpenImpact }: OverviewProps) {
  const { period, highlight, stats, report, todo } = overview;
  return (
    <div className="flex flex-col gap-4.5">
      <section
        aria-labelledby="overview-hero"
        className="flex flex-col gap-4 rounded-[18px] bg-ink-900 px-6.5 py-5.5 text-surface sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-extrabold tracking-[.08em] text-surface/70 uppercase">
            Administration · {period.label}
          </p>
          <h2 id="overview-hero" className="m-0 mt-1.5 text-2xl font-black tracking-[-.01em]">
            {highlight.label} ce mois : {highlight.value === null ? "calcul en attente" : formatKpiValue(highlight.value)}
          </h2>
          <p className="m-0 mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-surface/80">
            <KpiStatusBadge status={highlight.status} />
            {highlight.target !== null && <span>Cible {formatNumber(highlight.target)}.</span>}
            <span>{nextDeadline(report)}</span>
          </p>
        </div>
        {canOpenImpact && (
          <Link
            href={routes.backoffice.impact}
            className={`inline-flex shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-surface px-3.5 py-2 text-[13px] font-extrabold text-surface hover:bg-surface/10 ${FOCUS} focus-visible:outline-surface`}
          >
            Voir l&apos;Impact Tracker
          </Link>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={formatNumber(stats.users)} sub="comptes actifs" />
        <StatCard
          label="Apprenants actifs"
          value={formatNumber(stats.activeLearners)}
          sub="connectés dans les 30 jours"
        />
        <StatCard
          label="Ventes du mois"
          value={stats.salesMonth === null ? undefined : formatKpiValue(stats.salesMonth)}
          sub={stats.salesMonth === null ? "calcul en attente" : "FCFA"}
        />
        <StatCard
          label="Taux de complétion"
          value={stats.completionRate === null ? undefined : `${formatNumber(stats.completionRate)} %`}
          sub={stats.completionRate === null ? "pas encore mesuré" : "des parcours suivis"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ReportCard report={report} canOpen={canOpenImpact} />
        <TodoCard todo={todo} apiUrl={apiUrl} />
      </div>
    </div>
  );
}

function nextDeadline(report: Report): string {
  if (report.status === "submitted") return `Rapport ${report.label} soumis.`;
  return `Prochaine échéance : rapport ${report.label} à soumettre le ${formatShortDate(report.dueDate)}.`;
}

/** Étapes du rapport : saisie des indicateurs manuels, puis soumission avant l'échéance (D74). */
export function reportSteps(report: Pick<Report, "status" | "entered" | "total" | "dueDate">): DeadlineStep[] {
  const submitted = report.status === "submitted";
  const complete = report.entered >= report.total;
  return [
    {
      label: "Saisie manuelle",
      date: `${report.entered}/${report.total} renseignés`,
      state: submitted || complete ? "done" : "current",
    },
    {
      label: "Soumission",
      date: formatShortDate(report.dueDate),
      state: submitted ? "done" : complete ? "current" : "todo",
    },
  ];
}

function ReportCard({ report, canOpen }: { report: Report; canOpen: boolean }) {
  const status = REPORT_STATUS[report.status];
  return (
    <section aria-labelledby="overview-report" className={CARD}>
      <SectionHead
        id="overview-report"
        title="Rapport d'impact · prochaine échéance"
        sub={`Trimestre ${report.label} · ${report.entered}/${report.total} indicateurs manuels renseignés`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {canOpen && (
              <Link href={routes.backoffice.report(report.period)} className={BUTTON_DARK}>
                Ouvrir le rapport
              </Link>
            )}
          </div>
        }
      />
      <div className="px-1.5 pt-2.5 pb-4">
        <DeadlineTracker label={`Échéances du rapport ${report.label}`} steps={reportSteps(report)} />
      </div>
      <CompletenessBar entered={report.entered} total={report.total} />
    </section>
  );
}

function TodoCard({ todo, apiUrl }: { todo: OverviewData["todo"]; apiUrl: string }) {
  return (
    <section aria-labelledby="overview-todo" className={CARD}>
      <SectionHead id="overview-todo" title="À traiter" sub="Files d'attente de vos groupes, dans l'admin Django" />
      {todo.length === 0 ? (
        <p className="m-0 text-sm font-semibold text-ink-600">Rien à traiter pour vos groupes.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {todo.map((item) => {
            const kind = TODO_KINDS[item.kind];
            return (
              <li key={item.kind}>
                <a
                  href={adminPathUrl(apiUrl, item.adminPath)}
                  className={cx(
                    "flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-ink-900 no-underline hover:border-ink-300",
                    FOCUS,
                  )}
                >
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-700">
                    <Icon name={kind?.icon ?? "eye"} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold">{item.label}</span>
                    {kind && <span className="block text-xs font-semibold text-ink-600">{kind.text}</span>}
                  </span>
                  <span className="text-xl font-black tabular-nums">
                    <span className="sr-only"> : </span>
                    {formatNumber(item.count)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
