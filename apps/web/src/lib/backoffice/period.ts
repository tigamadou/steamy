/** Période de l'Impact Tracker dans l'URL (`?periode=`, en français) et dans l'API (`?period=`). */
export const IMPACT_PERIODS = [
  { id: "mois", label: "Mois", api: "month" },
  { id: "trimestre", label: "Trimestre", api: "quarter" },
  { id: "annee", label: "Année", api: "year" },
] as const satisfies ReadonlyArray<{ id: string; label: string; api: "month" | "quarter" | "year" }>;

export type ImpactPeriod = (typeof IMPACT_PERIODS)[number];
export type ImpactPeriodId = ImpactPeriod["id"];

/** Période demandée par l'URL ; absente ou inconnue → le mois en cours (défaut de l'API). */
export function impactPeriod(value: string | string[] | undefined): ImpactPeriod {
  const id = Array.isArray(value) ? value[0] : value;
  return IMPACT_PERIODS.find((period) => period.id === id) ?? IMPACT_PERIODS[0];
}

/** Ajoute `?periode=` à un chemin de l'Impact Tracker, sauf pour le mois (valeur par défaut). */
export function withPeriod(path: string, period: ImpactPeriodId): string {
  return period === IMPACT_PERIODS[0].id ? path : `${path}?periode=${period}`;
}

const YEAR_MONTH = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "numeric", timeZone: "Africa/Porto-Novo" });

/** Trimestre en cours au fuseau de la plateforme (C16), au format des URL de WAD04 : `2026-t4`. */
export function currentQuarterKey(now: Date = new Date()): string {
  const parts = Object.fromEntries(YEAR_MONTH.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-t${Math.ceil(Number(parts.month) / 3)}`;
}
