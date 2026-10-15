// Dates affichées en français, au fuseau de référence de la plateforme (C16).
const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Porto-Novo",
});

/** `2026-05-28` → « 28 mai 2026 ». */
export function formatDate(isoDate: string): string {
  return LONG_DATE.format(new Date(`${isoDate}T12:00:00Z`));
}

const TIME_ZONE = "Africa/Porto-Novo";
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TIME_ZONE });
const SHORT_MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TIME_ZONE });
const FULL_DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** Pastille de date d'un événement : `{ day: "28", month: "JUIN" }`. */
export function datePill(isoDateTime: string): { day: string; month: string } {
  const date = new Date(isoDateTime);
  return { day: DAY.format(date), month: SHORT_MONTH.format(date).replace(".", "").toUpperCase() };
}

/** « samedi 28 juin 2026 ». */
export function formatFullDate(isoDateTime: string): string {
  return FULL_DATE.format(new Date(isoDateTime));
}

/** Créneau « 14:00 – 16:30 ». */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${TIME.format(new Date(startIso))} – ${TIME.format(new Date(endIso))}`;
}
