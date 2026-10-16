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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY_MS = 24 * HOUR;
const DAY_KEY = new Intl.DateTimeFormat("fr-CA", { timeZone: TIME_ZONE });

/** Nombre de jours calendaires (fuseau de la plateforme) entre deux instants. */
function calendarDaysBetween(from: Date, to: Date): number {
  const day = (date: Date) => Date.parse(`${DAY_KEY.format(date)}T00:00:00Z`);
  return Math.round((day(to) - day(from)) / DAY_MS);
}

/**
 * Ancienneté d'une notification (WD04) : « à l'instant », « il y a 5 min », « il y a 3 h », « hier »,
 * « il y a 4 j », puis la date (« 2 octobre 2026 ») au-delà d'une semaine.
 */
export function formatRelative(isoInstant: string, now: Date = new Date()): string {
  const date = new Date(isoInstant);
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return "à l'instant";
  if (elapsed < HOUR) return `il y a ${Math.floor(elapsed / MINUTE)} min`;
  const days = calendarDaysBetween(date, now);
  if (days === 0) return `il y a ${Math.floor(elapsed / HOUR)} h`;
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return LONG_DATE.format(date);
}
