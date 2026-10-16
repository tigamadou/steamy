// Formats propres à la pédagogie : durées et dates relatives, lues dans l'API et jamais calculées en règle.

const DAY_MS = 86_400_000;
const DAY_KEY = new Intl.DateTimeFormat("fr-CA", { timeZone: "Africa/Porto-Novo" });
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Porto-Novo" });

/**
 * Numéro affiché d'un élément ordonné (« Projet 1 ») : l'API renvoie `order` à partir de 0, dans l'ordre du contenu.
 */
export function position(item: { order: number }): number {
  return item.order + 1;
}

/** Durée en minutes → « 45 min », « 1 h », « 1 h 30 ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

/** Durée en heures (projets) → « 3 h ». */
export function formatHours(hours: number): string {
  return `${hours} h`;
}

/** Jour calendaire au fuseau de la plateforme (C16), en millisecondes à minuit UTC. */
function dayOf(date: Date): number {
  return Date.parse(`${DAY_KEY.format(date)}T00:00:00Z`);
}

/** Dernière activité : « Aujourd'hui », « Hier », « Il y a 4 jours », puis « 3 oct. ». */
export function formatLastActivity(isoInstant: string, now: Date = new Date()): string {
  const days = Math.round((dayOf(now) - dayOf(new Date(isoInstant))) / DAY_MS);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return SHORT_DATE.format(new Date(isoInstant));
}
