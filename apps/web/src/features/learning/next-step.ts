import type { Schemas } from "@steamy/api-client";

import { routes } from "@/lib/routes";

export type NextStep = Schemas["NextStep"];

/**
 * Page de l'étape suivante renvoyée par l'API (mission, quiz ou certification) : rien n'est déduit de l'ordre.
 * Sans identifiant d'étape, l'arbre du parcours. Source unique pour WD01, WD23, WC06 et WJ03.
 */
export function nextStepHref(next: NextStep): string {
  const { courseSlug, id } = next;
  if (next.type === "certification") return routes.learner.certification(courseSlug);
  if (id === null) return routes.learner.course(courseSlug);
  return next.type === "quiz" ? routes.learner.quiz(courseSlug, id) : routes.learner.mission(courseSlug, id);
}

/** Libellé du bouton qui mène à l'étape suivante. */
export function nextStepLabel(next: NextStep): string {
  if (next.type === "certification") return "Voir ma certification";
  if (next.id === null) return "Voir mon parcours";
  if (next.type === "quiz") return next.quizKind === "summative" ? "Passer l'évaluation du projet" : "Passer le quiz du niveau";
  return "Continuer la mission";
}
