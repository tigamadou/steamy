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
