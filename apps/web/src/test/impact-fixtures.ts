import type { Schemas } from "@steamy/api-client";

// Réponses types de `backoffice/kpis/` et `backoffice/kpis/{code}/` (API-L6.4) pour les tests de WAD02 et WAD03.

type Status = Schemas["KpiStatus"];

export const STATUS = {
  unavailable: { status: "unavailable", tone: "neutral", label: "Indisponible" },
  pending: { status: "pending", tone: "amber", label: "En attente" },
  filled: { status: "filled", tone: "info", label: "Renseignée" },
  off_target: { status: "off_target", tone: "error", label: "Hors-cible" },
  below: { status: "below", tone: "amber", label: "En dessous" },
  achieved: { status: "achieved", tone: "success", label: "Atteinte" },
} as const satisfies Record<string, Status>;

export const PERIOD = { key: "2026-10", label: "Octobre 2026", start: "2026-10-01", end: "2026-10-31" };

const series = (...values: Array<number | null>) =>
  values.map((value, i) => ({ period: `2026-${String(6 + i).padStart(2, "0")}`, label: `M${i + 1}`, value }));

export function kpi(over: Partial<Schemas["KpiSummary"]> & Pick<Schemas["KpiSummary"], "code">): Schemas["KpiSummary"] {
  return {
    label: over.code,
    group: "sales",
    unit: "count",
    source: "auto",
    target: null,
    baseCode: null,
    value: null,
    status: STATUS.pending,
    series: [],
    ...over,
  };
}

export const DASHBOARD: Schemas["KpiDashboard"] = {
  period: PERIOD,
  groups: [
    {
      code: "sales",
      label: "Ventes & finance",
      kpis: [
        kpi({
          code: "ventes",
          label: "Ventes réalisées",
          unit: "fcfa",
          target: 50000,
          value: 44000,
          status: STATUS.below,
          series: series(12000, 31000, 44000),
        }),
        kpi({ code: "fin_hors", label: "Financement hors programme ?", unit: "yes_no", source: "manual", value: true, status: STATUS.filled }),
      ],
    },
    {
      code: "learners",
      label: "Apprenants (NA)",
      kpis: [
        kpi({ code: "na", label: "Nouveaux apprenants", group: "learners", target: 200, value: 220, status: STATUS.achieved, series: series(null, 195, 220) }),
        kpi({ code: "na_f", label: "Femmes", group: "learners", baseCode: "na", value: 65, status: STATUS.filled }),
        kpi({ code: "na_hand", label: "Situation de handicap", group: "learners", baseCode: "na" }),
        kpi({ code: "na_active", label: "Connectés ≥ 1 fois", group: "learners", value: 460, status: STATUS.filled }),
      ],
    },
    {
      code: "satisfaction",
      label: "Satisfaction",
      kpis: [
        kpi({ code: "nps", label: "Recommandation (NPS)", group: "satisfaction", unit: "score", source: "manual", target: 8 }),
      ],
    },
    { code: "employment", label: "Emploi", kpis: [] },
  ],
};

export const DETAIL: Schemas["KpiDetail"] = {
  ...kpi({ code: "na", label: "Nouveaux apprenants", group: "learners", target: 200, value: 220, status: STATUS.achieved }),
  series: series(150, null, 220),
  period: PERIOD,
  calculation: "Nombre d'apprenants inscrits dans la période",
  periodicity: "month",
  baseline: 120,
  attainment: 110,
  history: [
    { period: "2026-10", label: "Octobre 2026", start: "2026-10-01", end: "2026-10-31", value: 220, status: STATUS.achieved },
    { period: "2026-09", label: "Septembre 2026", start: "2026-09-01", end: "2026-09-30", value: null, status: STATUS.pending },
  ],
  composition: [
    { code: "na_f", label: "Femmes", value: 65 },
    { code: "na_hand", label: "Situation de handicap", value: null },
  ],
};
