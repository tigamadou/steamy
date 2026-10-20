import type { Schemas } from "@steamy/api-client";

import type { CourseCardData } from "@/components/ds";

import { routes } from "./routes";

const FCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Prix serveur en francs CFA : `25000` → « 25 000 F CFA » (espace insécable fine du français). */
export function formatPrice(amount: number): string {
  return `${FCFA.format(amount)} F CFA`;
}

/** Ligne de commande ou de panier : « Steamy Bot v1 × 2 », le titre seul pour une unité. */
export function quantityLabel(title: string, quantity: number): string {
  return quantity > 1 ? `${title} × ${quantity}` : title;
}

/** Libellés de difficulté (S2 : « difficulté », jamais « niveau »). */
export const DIFFICULTY_LABELS: Record<Schemas["DifficultyEnum"], string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

/** Pastille d'un parcours qui s'obtient avec le Kit Code de son kit : jamais de prix de parcours (D36). */
export const KIT_CODE_LABEL = "Avec le Kit Code";

/** Durée en minutes saisie par l'équipe Contenu : `8` → « 8 min », `75` → « 1 h 15 ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}` : `${minutes / 60} h`;
}

/**
 * Carte d'un parcours : lien vers sa fiche (WL22 par défaut, WC04 dans l'espace apprenant), couleur et emoji de sa
 * catégorie. Un parcours à kit n'affiche pas de prix de parcours : il s'obtient avec le Kit Code (D36).
 */
export function toCourseCard(course: Schemas["CourseList"], href = routes.course(course.slug)): CourseCardData {
  return {
    href,
    title: course.title,
    difficulty: DIFFICULTY_LABELS[course.difficulty],
    isFree: !course.requiredKit && (course.isFree ?? false),
    priceLabel: course.requiredKit ? KIT_CODE_LABEL : formatPrice(course.price ?? 0),
    color: course.category.color,
    emoji: course.emoji || course.category.icon,
  };
}
