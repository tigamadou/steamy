"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Icon } from "@/components/ds";
import { ReviewRow } from "@/features/teacher/home/ReviewRow";
import { routes } from "@/lib/routes";
import { useFocusOnChange } from "@/lib/use-focus-on-change";

import { FILTER_LABELS, type ReviewParams } from "./params";

const PAGE_LINK =
  "flex items-center gap-1.5 rounded-pill border-2 border-ink-200 px-4 py-2 text-sm font-extrabold text-ink-800 hover:border-primary-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500";

/** Texte de l'état vide de chaque filtre (WT07). */
export const EMPTY_TEXTS: Record<ReviewParams["filter"], string> = {
  toutes: "Aucune évaluation pour l'instant : les tentatives de quiz de vos élèves apparaîtront ici.",
  formatives: "Aucune évaluation formative pour l'instant.",
  sommatives: "Aucune évaluation sommative pour l'instant.",
  "a-revoir": "Rien à revoir : toutes les tentatives échouées ont été commentées.",
};

/**
 * Évaluations de WT07 : lignes élève, type · niveau ou projet, statut et score du serveur, « Commenter » vers WT05.
 * Pas de correction ni de modification de note (D65). Nouvelle page ou nouveau filtre : le focus passe à la liste.
 */
export function ReviewList({
  reviews,
  params,
  hasNext,
}: {
  reviews: Schemas["Review"][];
  params: ReviewParams;
  hasNext: boolean;
}) {
  const { filter, classroomId, page } = params;
  const list = useFocusOnChange<HTMLUListElement>("evaluations", `${filter}-${classroomId ?? ""}-${page}`);
  const href = (target: number) => routes.teacher.reviews({ filter, classroomId, page: target });
  return (
    <div className="flex flex-col gap-4">
      {reviews.length === 0 ? (
        <p className="m-0 rounded-[14px] border border-dashed border-ink-200 bg-surface px-4.5 py-5 text-sm font-semibold text-ink-600">
          {EMPTY_TEXTS[filter]}
        </p>
      ) : (
        <ul
          ref={list}
          tabIndex={-1}
          aria-label={`Évaluations : ${FILTER_LABELS[filter]}`}
          className="m-0 flex list-none flex-col gap-2 p-0 outline-none"
        >
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewRow review={review} showKind />
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || hasNext) && (
        <nav aria-label="Pagination des évaluations" className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={href(page - 1)} className={PAGE_LINK} rel="prev">
              <Icon name="arrow-left" size={16} strokeWidth={2.5} />
              Précédent
            </Link>
          )}
          <p className="m-0 text-sm font-bold text-ink-600" aria-current="page">
            Page {page}
          </p>
          {hasNext && (
            <Link href={href(page + 1)} className={PAGE_LINK} rel="next">
              Suivant
              <Icon name="arrow-right" size={16} strokeWidth={2.5} />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
