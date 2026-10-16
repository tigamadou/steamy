import type { Schemas } from "@steamy/api-client";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { formatInstant } from "@/lib/dates";
import { formatKpiValue, formatShortDate } from "@/lib/backoffice/format";
import { routes } from "@/lib/routes";

import { CompletenessBar } from "./CompletenessBar";
import { DataTable } from "./DataTable";
import { DeadlineTracker } from "./DeadlineTracker";
import { KpiStatusBadge } from "./KpiStatusBadge";
import { REPORT_STATUS, reportSteps } from "./Overview";
import { SourceTag } from "./SourceTag";
import { StatusBadge } from "./StatusBadge";
import { CARD } from "./styles";

export type ImpactReportData = Schemas["ImpactReport"];
type Row = ImpactReportData["rows"][number];

/**
 * WAD04 · Rapport trimestriel : lignes, plages, statuts et complétude calculés par le serveur ; figées une fois le
 * rapport soumis (D74). Les exports CSV / PDF attendent leurs endpoints (`POST …/exports/`, API-L6.4).
 */
export function ImpactReport({ report }: { report: ImpactReportData }) {
  const status = REPORT_STATUS[report.status];
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        tone="ink"
        items={[{ label: "Impact Tracker", href: routes.backoffice.impact }, { label: `Rapport ${report.label}` }]}
      />

      <section aria-labelledby="report-title" className={CARD}>
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="m-0 text-xs font-semibold text-ink-600">Trimestre</p>
            <div className="mt-0.5 mb-2.5 flex flex-wrap items-center gap-2.5">
              <h2 id="report-title" className="m-0 text-[22px] font-black text-ink-900">
                {report.label}
              </h2>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <p className="m-0 mb-3 text-xs font-semibold text-ink-600">
              Du {formatShortDate(report.start)} au {formatShortDate(report.end)}
              {report.submittedAt &&
                ` · soumis le ${formatInstant(report.submittedAt)}${report.submittedBy ? ` par ${report.submittedBy}` : ""}`}
            </p>
            <div className="max-w-75">
              <CompletenessBar
                entered={report.entered}
                total={report.total}
                label={`${report.entered} / ${report.total} indicateurs manuels renseignés`}
              />
            </div>
          </div>
          <DeadlineTracker label={`Échéances du rapport ${report.label}`} steps={reportSteps(report)} />
        </div>
      </section>

      <p className="m-0 text-[13px] font-bold text-ink-600">
        {report.rows.length} indicateurs · format Impact Tracker (Du · Au · Réponse · Statut)
      </p>

      <DataTable<Row>
        dense
        caption={`Indicateurs du rapport ${report.label}`}
        rowKey={(row) => row.code}
        empty="Aucun indicateur."
        rows={report.rows}
        columns={[
          { key: "label", label: "Indicateur clé de performance", render: (row) => <b>{row.label}</b> },
          { key: "start", label: "Du", render: (row) => formatShortDate(row.start) },
          { key: "end", label: "Au", render: (row) => formatShortDate(row.end) },
          {
            key: "value",
            label: "Réponse",
            align: "right",
            render: (row) =>
              row.value === null ? (
                <span className="italic text-ink-600">Non renseignée</span>
              ) : (
                <b>{formatKpiValue(row.value, row.unit)}</b>
              ),
          },
          { key: "status", label: "Statut", align: "right", render: (row) => <KpiStatusBadge status={row.status} /> },
          { key: "source", label: "Source", align: "right", render: (row) => <SourceTag source={row.source} /> },
        ]}
      />
    </div>
  );
}
