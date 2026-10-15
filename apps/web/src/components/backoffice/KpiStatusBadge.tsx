import { StatusBadge, type StatusTone } from "./StatusBadge";

/** Statut d'un KPI calculé par le serveur (`kpiStatus`, D73) : affiché tel quel, jamais recalculé ici. */
export type KpiStatus = { status: string; tone: StatusTone; label: string };

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
}
