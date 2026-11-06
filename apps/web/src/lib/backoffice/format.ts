import type { Schemas } from "@steamy/api-client";

/** Valeur d'un KPI telle que l'API la renvoie : nombre, booléen (`yes_no`) ou texte ; `null` si absente. */
export type KpiValue = number | boolean | string | null;
export type KpiUnit = Schemas["KpiUnitEnum"];

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Porto-Novo",
});

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Porto-Novo",
});

/** Valeur affichée d'un KPI selon son unité : « 44 000 FCFA », « 8 / 10 », « Oui » ; absente → « — ». */
export function formatKpiValue(value: KpiValue, unit?: KpiUnit): string {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string") return value;
  const number = NUMBER.format(value);
  if (unit === "fcfa") return `${number} FCFA`;
  if (unit === "score") return `${number} / 10`;
  return number;
}

/**
 * Points chiffrés d'une série (courbes, histogrammes), avec le libellé de leur période. Les périodes sans valeur
 * (pas encore calculées, non saisies) et les KPI non numériques sont omis plutôt que dessinés à zéro.
 */
export function numericSeries(points: Array<{ label: string; value: KpiValue }>): { values: number[]; labels: string[] } {
  const numeric = points.filter((point): point is { label: string; value: number } => typeof point.value === "number");
  return { values: numeric.map((point) => point.value), labels: numeric.map((point) => point.label) };
}

/** `2026-11-05T13:32:00Z` → « 5 nov. 2026, 14:32 » (heure du Bénin). */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** `2027-01-15` → « 15 janv. 2027 ». */
export function formatShortDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(`${isoDate}T12:00:00Z`));
}
