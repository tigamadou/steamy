"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";

import { Loader } from "@/components/ds/Loader";
import { Quiz, type QuizQuestion } from "@/components/ds/Quiz";
import { RetryCountdown } from "@/components/ds/RetryCountdown";
import { apiCall, errorMessage } from "@/lib/api-call";
import { routes } from "@/lib/routes";

import { clearDraft, parseDraft, readRawDraft, writeDraft, type QuizDraft } from "./draft";

const noSubscription = () => () => {};

export type QuizRunnerProps = {
  quizId: number;
  courseSlug: string;
  questions: QuizQuestion[];
};

/**
 * WJ04 / WJ10 · Déroulé du quiz : brouillon en `sessionStorage` (rechargement), envoi groupé et unique des réponses
 * (`POST learning/quizzes/{id}/attempts/`), puis résultat. `QUIZ_COOLDOWN` → compte à rebours du délai renvoyé.
 */
export function QuizRunner({ quizId, courseSlug, questions }: QuizRunnerProps) {
  const router = useRouter();
  // Brouillon de l'onglet (rechargement), lu après l'hydratation : le serveur n'a pas accès au stockage.
  const saved = useSyncExternalStore(noSubscription, () => readRawDraft(quizId), () => null);
  const [startedAt] = useState(() => Date.now());
  const [local, setLocal] = useState<QuizDraft | null>(null);
  const draft = local ?? parseDraft(saved, questions.length) ?? { answers: {}, index: 0, startedAt };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const sent = useRef(false);

  const update = (next: QuizDraft) => {
    setLocal(next);
    writeDraft(quizId, next);
  };

  const submit = async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    setError(null);
    const answers = questions.map((q) => ({ questionId: q.id, choiceId: draft.answers[q.id] }));
    const result = await apiCall((api) =>
      api.POST("/api/learning/quizzes/{id}/attempts/", {
        params: { path: { id: quizId } },
        body: { answers, durationSec: Math.round((Date.now() - draft.startedAt) / 1000) },
      }),
    );
    if (result.ok) {
      clearDraft(quizId);
      router.replace(routes.learner.quizResult(courseSlug, quizId, result.data.id));
      return;
    }
    sent.current = false;
    setSubmitting(false);
    if (result.code === "QUIZ_COOLDOWN") {
      setCooldown(result.retryAfter ?? 0);
      return;
    }
    setError(
      result.code === "CONTENT_LOCKED"
        ? "Ce quiz n'est pas encore ouvert : termine d'abord les missions qui le précèdent."
        : errorMessage(result, "tu"),
    );
  };

  if (cooldown !== null) {
    return (
      <section aria-labelledby="quiz-delai" className="flex flex-col gap-3 rounded-[22px] border-2 border-amber-300 bg-amber-50 p-5">
        <h3 id="quiz-delai" className="m-0 text-lg font-black text-ink-900">
          Encore un peu de patience
        </h3>
        <p className="m-0 text-sm font-semibold text-ink-700">
          Tu pourras repasser cette évaluation à la fin du délai. Profite-en pour revoir les missions du projet.
        </p>
        <RetryCountdown seconds={cooldown} href={routes.learner.quiz(courseSlug, quizId)} />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Quiz
        questions={questions}
        answers={draft.answers}
        index={draft.index}
        onAnswer={(questionId, choiceId) => update({ ...draft, answers: { ...draft.answers, [questionId]: choiceId } })}
        onIndexChange={(index) => update({ ...draft, index })}
        onSubmit={submit}
        submitting={submitting}
      />
      {submitting && <Loader label="On corrige tes réponses…" />}
      <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
        {error}
      </p>
    </div>
  );
}
