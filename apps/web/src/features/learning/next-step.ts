import type { Schemas } from "@steamy/api-client";

import { routes } from "@/lib/routes";

export type NextStep = Schemas["NextStep"];

/** Page de l'étape suivante renvoyée par l'API (mission, quiz ou certification) : rien n'est déduit de l'ordre. */
export function nextStepHref(next: NextStep): string {
  const { courseSlug, id } = next;
  if (next.type === "certification" || id === null) return routes.learner.certification(courseSlug);
  return next.type === "quiz" ? routes.learner.quiz(courseSlug, id) : routes.learner.mission(courseSlug, id);
}

/** Libellé du bouton qui mène à l'étape suivante. */
export function nextStepLabel(next: NextStep): string {
  if (next.type === "certification") return "Voir ma certification";
  if (next.type === "quiz") return next.quizKind === "summative" ? "Passer l'évaluation du projet" : "Passer le quiz du niveau";
  return "Continuer la mission";
}
