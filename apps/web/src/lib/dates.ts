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

/** Instant ISO (`2026-10-22T08:00:00Z`) → date du jour au fuseau de la plateforme, « 22 octobre 2026 ». */
export function formatInstant(isoInstant: string): string {
  return LONG_DATE.format(new Date(isoInstant));
}
