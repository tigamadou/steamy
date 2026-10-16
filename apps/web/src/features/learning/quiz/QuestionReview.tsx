import type { Schemas } from "@steamy/api-client";

import { Icon } from "@/components/ds/Icon";
import { cx } from "@/lib/cx";

/** Récapitulatif des questions après l'envoi (WJ05, WJ08, WD08) : juste ou faux, et le concept travaillé. */
export function QuestionReview({ questions }: { questions: Schemas["QuestionReview"][] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {questions.map((question, index) => (
        <li key={question.questionId} className="flex items-start gap-3 rounded-md border border-ink-100 bg-surface px-3.5 py-3">
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink-100 text-[13px] font-extrabold text-ink-700">
            {index + 1}
          </span>
          <span
            className={cx(
              "flex size-6 shrink-0 items-center justify-center rounded-pill text-white",
              question.correct ? "bg-success-600" : "bg-error-600",
            )}
          >
            <Icon name={question.correct ? "check" : "x"} size={14} strokeWidth={3} title={question.correct ? "Juste" : "Faux"} />
          </span>
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="block font-extrabold text-ink-900">{question.text}</span>
            <span className="mt-0.5 block font-semibold text-ink-600">Concept : {question.concept}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
