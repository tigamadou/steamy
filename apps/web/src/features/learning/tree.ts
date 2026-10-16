import type { Schemas } from "@steamy/api-client";

import type { MissionState } from "@/components/ds/MissionItem";

export type Tree = Schemas["Tree"];
export type ApiState = Schemas["StateEnum"];

/**
 * État affiché d'une étape : celui de l'API, `available` devenant `current` quand l'étape est la prochaine à faire
 * (`next` de l'API). Le front ne déverrouille ni ne verrouille rien.
 */
export function displayState(state: ApiState, isNext: boolean): MissionState {
  return state === "available" && isNext ? "current" : state;
}

/** Une étape est-elle la prochaine renvoyée par l'API ? */
export function isNextStep(next: Schemas["NextStep"], type: "mission" | "quiz", id: number): boolean {
  return next.type === type && next.id === id;
}

/** Comptes affichés sous « Ton parcours » : projets terminés, ouverts et verrouillés. */
export function projectCounts(projects: Array<{ state: ApiState }>): Record<ApiState, number> {
  const counts: Record<ApiState, number> = { done: 0, available: 0, locked: 0 };
  for (const project of projects) counts[project.state] += 1;
  return counts;
}

/** Minutes des missions pas encore faites (durées saisies par le contenu), pour « n restant ». */
export function remainingMinutes(projects: Tree["projects"]): number {
  return projects
    .flatMap((project) => project.levels)
    .flatMap((level) => level.missions)
    .filter((mission) => mission.state !== "done")
    .reduce((total, mission) => total + mission.durationMin, 0);
}

/** Libellé d'un quiz dans la liste des étapes. */
export function quizStep(kind: Schemas["QuizKindEnum"]): string {
  return kind === "summative" ? "Évaluation du projet" : "Quiz du niveau";
}
