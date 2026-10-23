import type { Schemas } from "@steamy/api-client";

import { AttemptStatusBadge, Avatar, Badge, Button } from "@/components/ds";
import { routes } from "@/lib/routes";

type Review = Schemas["Review"];

/** « Niveau 2 · 4ᵉ B » : niveau ou, à défaut, projet du quiz, puis classe. */
export function reviewContext(review: Pick<Review, "quiz" | "classroom">): string {
  return [review.quiz.levelTitle ?? review.quiz.projectTitle, review.classroom.name].join(" · ");
}

const KIND_LABELS: Record<Review["quiz"]["kind"], string> = {
  formative: "Formative",
  summative: "Sommative",
};

/**
 * Ligne « À revoir » (WT01) ou évaluation (WT07) : élève, quiz, statut et score du serveur, « Commenter » → WT05 sur la
 * tentative, ou « Commentée » quand elle l'a été. `showKind` ajoute le type (formative, sommative) du quiz. Aucune
 * action de correction ni de modification de note (D65).
 */
export function ReviewRow({ review, showKind = false }: { review: Review; showKind?: boolean }) {
  const name = `${review.learner.firstName} ${review.learner.lastName}`.trim();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5">
      <Avatar name={name} emoji={review.learner.avatar?.emoji} size={44} decorative />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-ink-900">
          {name} · {review.quiz.title}
        </p>
        <p className="m-0 mt-0.5 text-xs font-semibold text-ink-600">
          {showKind && `${KIND_LABELS[review.quiz.kind]} · `}
          {reviewContext(review)}
        </p>
      </div>
      <AttemptStatusBadge status={review.status} />
      <span className="min-w-12 text-right text-base font-black text-ink-900">{review.percentage} %</span>
      {review.commented ? (
        <Badge tone="success">Commentée</Badge>
      ) : (
        <Button
          href={routes.teacher.learner(review.learner.id, {
            classroomId: review.classroom.id,
            attemptId: review.id,
          })}
          variant="outline"
          size="sm"
          aria-label={`Commenter la tentative de ${name}`}
        >
          Commenter
        </Button>
      )}
    </div>
  );
}
