import Link from "next/link";

import { AttemptStatusBadge, Badge } from "@/components/ds";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import type { TeacherAttempt } from "./api";

/** « Niveau 2 », sinon « Robot suiveur » : niveau ou, à défaut, projet du quiz. */
export function quizContext(quiz: TeacherAttempt["quiz"]): string {
  return quiz.levelTitle ?? quiz.projectTitle;
}

/**
 * Tentative de l'élève (WT05) : statut et score calculés par le serveur (D31), date, « Commenté » quand elle l'a été.
 * « Commenter » présélectionne la tentative dans le formulaire ; aucune action de correction (D65).
 */
export function AttemptRow({
  attempt,
  learnerId,
  classroomId,
  selected,
}: {
  attempt: TeacherAttempt;
  learnerId: number;
  classroomId: number;
  selected: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border bg-surface px-4.5 py-3.5 ${
        selected ? "border-primary-300" : "border-ink-100"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-ink-900">{attempt.quiz.title}</p>
        <p className="m-0 mt-0.5 text-xs font-semibold text-ink-600">
          {quizContext(attempt.quiz)} · {formatInstant(attempt.createdAt)}
        </p>
      </div>
      <AttemptStatusBadge status={attempt.status} />
      <span className="min-w-12 text-right text-base font-black text-ink-900">{attempt.percentage} %</span>
      {attempt.commented ? (
        <Badge tone="success">Commentée</Badge>
      ) : (
        <Link
          href={routes.teacher.learner(learnerId, { classroomId, attemptId: attempt.id })}
          className="rounded-pill border-2 border-ink-200 px-3.5 py-1.5 text-[13px] font-extrabold text-ink-800 hover:border-primary-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          Commenter
          <span className="sr-only"> la tentative « {attempt.quiz.title} »</span>
        </Link>
      )}
    </div>
  );
}
