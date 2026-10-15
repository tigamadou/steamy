import type { Schemas } from "@steamy/api-client";

/** Valeur d'un KPI telle que l'API la renvoie : nombre, booléen (`yes_no`) ou texte ; `null` si absente. */
export type KpiValue = number | boolean | string | null;
export type KpiUnit = Schemas["KpiUnitEnum"];

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

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

/** `2027-01-15` → « 15 janv. 2027 ». */
export function formatShortDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(`${isoDate}T12:00:00Z`));
}
