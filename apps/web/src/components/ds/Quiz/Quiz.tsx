"use client";

import { useId } from "react";

import { cx } from "@/lib/cx";

import { Button } from "../Button";
import { ProgressBar } from "../ProgressBar";

export type QuizQuestion = { id: number; text: string; choices: Array<{ id: number; text: string }> };

/** Réponses en cours : identifiant de question → identifiant du choix. */
export type QuizAnswers = Record<number, number>;

export type QuizProps = {
  questions: QuizQuestion[];
  answers: QuizAnswers;
  /** Question affichée (0 à n - 1). */
  index: number;
  onAnswer: (questionId: number, choiceId: number) => void;
  onIndexChange: (index: number) => void;
  /** Envoi groupé de toutes les réponses, à la fin seulement (aucun corrigé avant). */
  onSubmit: () => void;
  submitting?: boolean;
  className?: string;
};

// Quiz question par question (design/ds-complex.jsx, `Quiz`) : choix en boutons radio focusables, aucune bonne
// réponse dans la page avant l'envoi, ni minuteur de mise en scène (§5.10).
export function Quiz({
  questions,
  answers,
  index,
  onAnswer,
  onIndexChange,
  onSubmit,
  submitting,
  className,
}: QuizProps) {
  const baseId = useId();
  const question = questions[index];
  const last = index === questions.length - 1;
  const answered = answers[question.id] !== undefined;
  const complete = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className={cx("flex flex-col gap-5 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="m-0 text-sm font-extrabold text-ink-600">
          Question {index + 1} sur {questions.length}
        </p>
        <ProgressBar value={((index + 1) / questions.length) * 100} label="Avancement du quiz" tone="amber" />
      </div>
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-xl leading-snug font-black text-ink-900">{question.text}</legend>
        {question.choices.map((choice, position) => {
          const id = `${baseId}-${question.id}-${choice.id}`;
          const checked = answers[question.id] === choice.id;
          return (
            <label
              key={choice.id}
              htmlFor={id}
              className={cx(
                "flex cursor-pointer items-center gap-3.5 rounded-lg border-2 p-3.5 text-[15px] font-bold transition-colors",
                "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-500",
                checked ? "border-primary-500 bg-primary-50 text-primary-700" : "border-ink-100 text-ink-800 hover:border-primary-200",
              )}
            >
              <input
                id={id}
                type="radio"
                name={`${baseId}-${question.id}`}
                value={choice.id}
                checked={checked}
                onChange={() => onAnswer(question.id, choice.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-black",
                  checked ? "bg-primary-500 text-white" : "bg-ink-100 text-ink-700",
                )}
              >
                {String.fromCharCode(65 + position)}
              </span>
              {choice.text}
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {index > 0 ? (
          <Button variant="outline" icon="arrow-left" onClick={() => onIndexChange(index - 1)} disabled={submitting}>
            Question précédente
          </Button>
        ) : (
          <span />
        )}
        {last ? (
          <Button variant="secondary" iconRight="check" onClick={onSubmit} disabled={!complete} loading={submitting}>
            Envoyer mes réponses
          </Button>
        ) : (
          <Button iconRight="arrow-right" onClick={() => onIndexChange(index + 1)} disabled={!answered}>
            Question suivante
          </Button>
        )}
      </div>
    </div>
  );
}
