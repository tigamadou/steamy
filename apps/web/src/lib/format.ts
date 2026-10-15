import type { Schemas } from "@steamy/api-client";

import type { CourseCardData } from "@/components/ds";

import { routes } from "./routes";

const FCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Prix serveur en francs CFA : `25000` → « 25 000 F CFA » (espace insécable fine du français). */
export function formatPrice(amount: number): string {
  return `${FCFA.format(amount)} F CFA`;
}

/** Libellés de difficulté (S2 : « difficulté », jamais « niveau »). */
export const DIFFICULTY_LABELS: Record<Schemas["DifficultyEnum"], string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

/**
 * Carte d'un parcours : lien vers sa fiche (WL22 par défaut, WC04 dans l'espace apprenant), couleur et emoji de sa
 * catégorie.
 */
export function toCourseCard(
  course: Schemas["CourseList"],
  hrefOf: (slug: string) => string = routes.course,
): CourseCardData {
  return {
    href: hrefOf(course.slug),
    title: course.title,
    difficulty: DIFFICULTY_LABELS[course.difficulty],
    isFree: course.isFree ?? false,
    priceLabel: formatPrice(course.price ?? 0),
    color: course.category.color,
    emoji: course.emoji || course.category.icon,
  };
}
