import type { Schemas } from "@steamy/api-client";

type ReviewQuery = { status?: "to_review"; type?: Schemas["QuizKindEnum"] };

/** Filtres de WT07 dans l'URL (`?filtre=`) ; « Toutes » est le filtre par défaut et n'y figure pas. */
export const REVIEW_FILTERS = ["toutes", "formatives", "sommatives", "a-revoir"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export const FILTER_LABELS: Record<ReviewFilter, string> = {
  toutes: "Toutes",
  formatives: "Formatives",
  sommatives: "Sommatives",
  "a-revoir": "À revoir",
};

/** Paramètres de l'API de chaque filtre : « À revoir » = tentatives échouées non commentées (D65). */
export const FILTER_QUERY: Record<ReviewFilter, ReviewQuery> = {
  toutes: {},
  formatives: { type: "formative" },
  sommatives: { type: "summative" },
  "a-revoir": { status: "to_review" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export type ReviewParams = { filter: ReviewFilter; classroomId?: string; page: number };

/** Filtre, classe et page lus dans l'URL ; une valeur invalide ramène à « Toutes », à toutes les classes, à la page 1. */
export function parseReviewParams(searchParams: SearchParams): ReviewParams {
  const filter = first(searchParams.filtre);
  const classroom = first(searchParams.classe);
  const page = Number(first(searchParams.page));
  return {
    filter: (REVIEW_FILTERS as readonly string[]).includes(filter ?? "") ? (filter as ReviewFilter) : "toutes",
    classroomId: classroom && /^\d+$/.test(classroom) ? classroom : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}
