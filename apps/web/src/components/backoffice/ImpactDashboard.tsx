import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { formatKpiValue, formatShortDate, numericSeries } from "@/lib/backoffice/format";
import { withPeriod, type ImpactPeriodId } from "@/lib/backoffice/period";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { DonutChart } from "./DonutChart";
import { KpiStatusBadge } from "./KpiStatusBadge";
import { SectionHead } from "./SectionHead";
import { SourceTag, type KpiSource } from "./SourceTag";
import { Sparkline } from "./Sparkline";
import { StatCard } from "./StatCard";
import { CARD, FOCUS } from "./styles";

export type KpiDashboard = Schemas["KpiDashboard"];
export type KpiSummary = Schemas["KpiSummary"];

/** KPI principaux en tête de WAD02 (maquette) : ventes, nouveaux utilisateurs et apprenants, recommandation. */
export const MAIN_KPIS = ["ventes", "nu", "na", "nps"];

/** Légende des sources (WAD02). */
export const SOURCE_LEGEND: Array<[KpiSource, string]> = [
  ["auto", "calculé"],
  ["manual", "à saisir"],
  ["unavailable", "non collecté"],
];

/** « cible 50 000 FCFA » ; sans cible, rien. */
export function targetText(kpi: Pick<KpiSummary, "target" | "unit">): string | null {
  return kpi.target === null ? null : `cible ${formatKpiValue(kpi.target, kpi.unit)}`;
}

/** Courbe d'une `StatCard` : deux points au moins, sinon rien. */
function sparkOf(kpi: KpiSummary): number[] | undefined {
  const { values } = numericSeries(kpi.series);
  return values.length > 1 ? values : undefined;
}

export type ImpactDashboardProps = { dashboard: KpiDashboard; period: ImpactPeriodId };

/** WAD02 · Impact Tracker : valeurs, séries et statuts du serveur (`backoffice/kpis/`), jamais recalculés. */
export function ImpactDashboard({ dashboard, period }: ImpactDashboardProps) {
  const kpis = dashboard.groups.flatMap((group) => group.kpis);
  const main = MAIN_KPIS.map((code) => kpis.find((kpi) => kpi.code === code)).filter((kpi) => kpi !== undefined);
  const range = `${formatShortDate(dashboard.period.start)} → ${formatShortDate(dashboard.period.end)}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul aria-label="Sources des indicateurs" className="m-0 flex list-none flex-wrap gap-4 p-0">
          {SOURCE_LEGEND.map(([source, text]) => (
            <li key={source} className="flex items-center gap-1.5 text-xs font-bold text-ink-600">
              <SourceTag source={source} /> {text}
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs font-bold text-ink-600">
          Période : <span className="text-ink-900">{dashboard.period.label}</span> ({range})
        </p>
      </div>

      {main.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {main.map((kpi) => (
            <StatCard
              key={kpi.code}
              label={kpi.label}
              value={kpi.value === null ? undefined : formatKpiValue(kpi.value, kpi.unit)}
              sub={
                <span className="flex flex-wrap items-center gap-1.5">
                  {targetText(kpi)}
                  <KpiStatusBadge status={kpi.status} />
                </span>
              }
              spark={sparkOf(kpi)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {dashboard.groups.map((group) =>
          group.kpis.some((kpi) => kpi.baseCode) ? (
            <DemographicsCard key={group.code} group={group} periodLabel={dashboard.period.label} period={period} />
          ) : (
            <section key={group.code} aria-labelledby={`group-${group.code}`} className={CARD}>
              <SectionHead id={`group-${group.code}`} title={group.label} />
              <KpiList kpis={group.kpis} period={period} />
            </section>
          ),
        )}
      </div>
    </div>
  );
}

/** Lignes d'indicateurs : libellé (lien vers WAD03), source, tendance, valeur et statut. */
export function KpiList({ kpis, period }: { kpis: KpiSummary[]; period: ImpactPeriodId }) {
  if (kpis.length === 0) {
    return <p className="m-0 text-sm font-semibold text-ink-600">Aucun indicateur.</p>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {kpis.map((kpi) => {
        const series = numericSeries(kpi.series);
        return (
          <li
            key={kpi.code}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-ink-100 py-2.75 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={withPeriod(routes.backoffice.kpi(kpi.code), period)}
                className={cx("rounded-sm text-[13px] font-extrabold text-ink-900 hover:underline", FOCUS)}
              >
                {kpi.label}
              </Link>
              <div className="mt-1">
                <SourceTag source={kpi.source} />
              </div>
            </div>
            {series.values.length > 1 && (
              <Sparkline data={series.values} labels={series.labels} label={`Tendance · ${kpi.label}`} width={70} height={24} />
            )}
            <span
              className={cx(
                "text-right text-sm font-black tabular-nums",
                kpi.value === null ? "font-bold text-ink-600" : "text-ink-900",
              )}
            >
              {formatKpiValue(kpi.value, kpi.unit)}
            </span>
            <KpiStatusBadge status={kpi.status} />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Inclusion (D75) : part de chaque sous-indicateur dans son indicateur de base (genre, âge, handicap, zone rurale,
 * alimentés par le profil), puis les autres indicateurs du groupe.
 */
function DemographicsCard({
  group,
  periodLabel,
  period,
}: {
  group: KpiDashboard["groups"][number];
  periodLabel: string;
  period: ImpactPeriodId;
}) {
  const parts = group.kpis.filter((kpi) => kpi.baseCode);
  const others = group.kpis.filter((kpi) => !kpi.baseCode);
  const base = (part: KpiSummary) => group.kpis.find((kpi) => kpi.code === part.baseCode);
  const first = base(parts[0]);
  return (
    <section aria-labelledby={`group-${group.code}`} className={CARD}>
      <SectionHead
        id={`group-${group.code}`}
        title={`Inclusion · ${group.label}`}
        sub={first && `Base : ${first.label.toLowerCase()} (${formatKpiValue(first.value, first.unit)}) · ${periodLabel}`}
      />
      <ul className="m-0 mb-2 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {parts.map((part) => {
          const of = base(part);
          return (
            <li key={part.code} className="flex flex-col items-center gap-1.5 p-1 text-center">
              {of && typeof part.value === "number" && typeof of.value === "number" && of.value > 0 ? (
                <DonutChart
                  value={part.value}
                  total={of.value}
                  size={96}
                  thickness={10}
                  label={`${part.label} parmi ${of.label.toLowerCase()}`}
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-24 items-center justify-center rounded-full border-[13px] border-ink-100 text-sm font-black text-ink-600"
                >
                  —
                </span>
              )}
              <Link
                href={withPeriod(routes.backoffice.kpi(part.code), period)}
                className={cx("rounded-sm text-xs font-extrabold text-ink-800 hover:underline", FOCUS)}
              >
                {part.label}
              </Link>
              <span className="text-[11px] font-bold text-ink-600">{formatKpiValue(part.value, part.unit)}</span>
            </li>
          );
        })}
      </ul>
      <KpiList kpis={others} period={period} />
    </section>
  );
}
