import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { formatKpiValue, formatShortDate, numericSeries } from "@/lib/backoffice/format";
import { withPeriod, type ImpactPeriodId } from "@/lib/backoffice/period";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { BarChart } from "./BarChart";
import { DataTable } from "./DataTable";
import { DonutChart } from "./DonutChart";
import { KpiStatusBadge } from "./KpiStatusBadge";
import { SectionHead } from "./SectionHead";
import { SourceTag } from "./SourceTag";
import { CARD, FOCUS } from "./styles";

export type KpiDetailData = Schemas["KpiDetail"];
type HistoryRow = KpiDetailData["history"][number];

/** Fréquence de collecte (définition serveur). */
export const PERIODICITY: Record<KpiDetailData["periodicity"], string> = {
  month: "Mensuelle",
  quarter: "Trimestrielle",
};

/** Mode d'alimentation, selon la source. */
export const SOURCE_TEXT: Record<KpiDetailData["source"], string> = {
  auto: "recalculé chaque nuit depuis la plateforme",
  manual: "saisi par le personnel avant la soumission du rapport",
  unavailable: "donnée non collectée",
};

export type KpiDetailProps = { kpi: KpiDetailData; period: ImpactPeriodId };

/** WAD03 · Détail d'un indicateur : statut, valeur, cible, historique, composition et définition du serveur. */
export function KpiDetail({ kpi, period }: KpiDetailProps) {
  const series = numericSeries(kpi.series);
  const range = `${formatShortDate(kpi.period.start)} → ${formatShortDate(kpi.period.end)}`;
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Fil d'Ariane" className="text-[13px] font-bold text-ink-600">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
          <li>
            <Link
              href={withPeriod(routes.backoffice.impact, period)}
              className={cx("rounded-sm hover:text-ink-900 hover:underline", FOCUS)}
            >
              Impact Tracker
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="font-black text-ink-900">
            {kpi.label}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="kpi-title" className={CARD}>
            <SectionHead
              id="kpi-title"
              title={kpi.label}
              sub={`${kpi.period.label} · ${range}`}
              right={<KpiStatusBadge status={kpi.status} />}
            />
            <div className="mb-2 flex flex-wrap items-end gap-6">
              <div>
                <p className="m-0 text-5xl leading-none font-black tracking-[-.02em] text-ink-900">
                  {formatKpiValue(kpi.value, kpi.unit)}
                </p>
                <p className="m-0 mt-1.5 text-[13px] font-bold text-ink-600">
                  {kpi.target === null ? "Sans cible" : `Cible ${formatKpiValue(kpi.target, kpi.unit)}`}
                  {kpi.attainment !== null && ` · atteinte à ${kpi.attainment} %`}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <BarChart
                  data={series.values}
                  labels={series.labels}
                  label={`${kpi.label} par période`}
                  width={360}
                  height={130}
                  format={(value) => formatKpiValue(value, kpi.unit)}
                />
              </div>
            </div>
            <p className="m-0 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-600">
              <SourceTag source={kpi.source} /> {SOURCE_TEXT[kpi.source]}
            </p>
          </section>

          <section aria-labelledby="kpi-history" className={CARD}>
            <SectionHead id="kpi-history" title="Historique par période" />
            <DataTable<HistoryRow>
              dense
              caption={`Historique de l'indicateur ${kpi.label}`}
              rowKey={(row) => row.period}
              empty="Aucune période."
              rows={kpi.history}
              columns={[
                { key: "label", label: "Période" },
                { key: "start", label: "Du", render: (row) => formatShortDate(row.start) },
                { key: "end", label: "Au", render: (row) => formatShortDate(row.end) },
                {
                  key: "value",
                  label: "Réponse",
                  align: "right",
                  render: (row) => <b>{formatKpiValue(row.value, kpi.unit)}</b>,
                },
                { key: "status", label: "Statut", align: "right", render: (row) => <KpiStatusBadge status={row.status} /> },
              ]}
            />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {kpi.composition.length > 0 && (
            <section aria-labelledby="kpi-composition" className={CARD}>
              <SectionHead id="kpi-composition" title={`Composition (${kpi.period.label})`} />
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
                {kpi.composition.map((part) => (
                  <li key={part.code} className="flex flex-col items-center gap-1.5 text-center">
                    {typeof part.value === "number" && typeof kpi.value === "number" && kpi.value > 0 ? (
                      <DonutChart
                        value={part.value}
                        total={kpi.value}
                        size={96}
                        label={`${part.label} parmi ${kpi.label.toLowerCase()}`}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-24 items-center justify-center rounded-full border-[13px] border-ink-100 text-sm font-black text-ink-600"
                      >
                        —
                      </span>
                    )}
                    <span className="text-xs font-extrabold text-ink-800">{part.label}</span>
                    <span className="text-[11px] font-bold text-ink-600">{formatKpiValue(part.value, kpi.unit)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="kpi-definition" className={CARD}>
            <SectionHead id="kpi-definition" title="Définition" />
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="font-extrabold text-ink-600">Source</dt>
              <dd className="m-0 font-semibold text-ink-800">
                <SourceTag source={kpi.source} />
              </dd>
              <dt className="font-extrabold text-ink-600">Calcul</dt>
              <dd className="m-0 leading-relaxed font-semibold text-ink-800">{kpi.calculation}</dd>
              <dt className="font-extrabold text-ink-600">Fréquence</dt>
              <dd className="m-0 font-semibold text-ink-800">{PERIODICITY[kpi.periodicity]}</dd>
              {kpi.baseline !== null && (
                <>
                  <dt className="font-extrabold text-ink-600">Référence</dt>
                  <dd className="m-0 font-semibold text-ink-800">{formatKpiValue(kpi.baseline, kpi.unit)}</dd>
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
