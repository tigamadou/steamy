// Formats propres à la pédagogie : durées et dates relatives, lues dans l'API et jamais calculées en règle.

import { calendarDaysBetween } from "@/lib/dates";

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Porto-Novo" });

/**
 * Numéro affiché d'un élément ordonné (« Projet 1 ») : l'API renvoie `order` à partir de 0, dans l'ordre du contenu.
 */
export function position(item: { order: number }): number {
  return item.order + 1;
}

/** Durée en heures (projets) → « 3 h ». */
export function formatHours(hours: number): string {
  return `${hours} h`;
}

/** Dernière activité : « Aujourd'hui », « Hier », « Il y a 4 jours », puis « 3 oct. ». */
export function formatLastActivity(isoInstant: string, now: Date = new Date()): string {
  const days = calendarDaysBetween(new Date(isoInstant), now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return SHORT_DATE.format(new Date(isoInstant));
}
