import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Badge } from "@/components/ds/Badge";
import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { ProgressBar } from "@/components/ds/ProgressBar";
import { RetryCountdown } from "@/components/ds/RetryCountdown";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { readContent } from "../content";
import { LockedContentState } from "../LockedContentState";
import { AttemptStatusBadge } from "@/components/ds/AttemptStatusBadge";
import { QuestionReview } from "./QuestionReview";

export type Attempt = Schemas["AttemptDetail"];

/** Page du badge obtenu (WJ06 niveau, WJ11 projet), avec la tentative pour l'étape suivante et les points. */
export function badgeHref(attempt: Attempt): string {
  const { quiz } = attempt;
  const base =
    quiz.levelId === null
      ? routes.learner.projectBadge(quiz.courseSlug, quiz.projectId)
      : routes.learner.levelBadge(quiz.courseSlug, quiz.levelId);
  return `${base}?tentative=${attempt.id}`;
}

/**
 * WJ05 (réussite) / WJ08 (échec), et détail d'une tentative de l'historique (WD08) · Un seul écran paramétré par `kind`, `threshold`, `passed` et `status` de l'API,
 * affichés tels quels (D31). Réessai d'une sommative : compte à rebours sur `retryInSec` (D32).
 */
export function AttemptSummary({ attempt, history = false }: { attempt: Attempt; history?: boolean }) {
  const { quiz } = attempt;
  const summative = quiz.kind === "summative";
  const retryHref = routes.learner.quiz(quiz.courseSlug, quiz.id);
  // Résultat juste après l'envoi : revoir le niveau ou le projet ; historique (WD08) : voir le parcours
  const review = history
    ? { label: "Voir le parcours", href: routes.learner.course(quiz.courseSlug) }
    : {
        label: summative ? "Revoir le projet" : "Revoir le niveau",
        href:
          quiz.levelId === null
            ? routes.learner.project(quiz.courseSlug, quiz.projectId)
            : routes.learner.level(quiz.courseSlug, quiz.levelId),
      };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section
          aria-labelledby="score"
          className="flex flex-col gap-4 rounded-[22px] bg-linear-135 from-primary-500 to-primary-700 px-6 py-5 text-white sm:flex-row sm:items-center sm:gap-7"
        >
          <p id="score" className="m-0 text-6xl leading-none font-black tracking-[-0.03em]">
            {attempt.percentage}
            <small className="text-2xl font-extrabold opacity-80"> %</small>
          </p>
          <div className="flex flex-1 flex-col gap-2.5">
            <p className="m-0 text-[11px] font-extrabold tracking-[.08em] uppercase opacity-90">
              {summative ? "Score de l'évaluation du projet" : "Score du quiz du niveau"}
            </p>
            <p className="m-0 text-base font-extrabold">
              {attempt.score} bonne{attempt.score > 1 ? "s" : ""} réponse{attempt.score > 1 ? "s" : ""} sur {attempt.total} ·
              seuil {attempt.threshold} %
            </p>
            <ProgressBar value={attempt.percentage} label="Score" tone="amber" inverse className="max-w-80" />
          </div>
        </section>
        <section aria-labelledby="recap">
          <SectionHeader id="recap" title="Récapitulatif des questions" />
          <QuestionReview questions={attempt.questions} />
        </section>
        {!attempt.passed && attempt.remediation.length > 0 && (
          <section aria-labelledby="a-revoir">
            <SectionHeader id="a-revoir" title="Concepts à revoir" />
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {attempt.remediation.map((item) => (
                <li key={`${item.missionId}-${item.concept}`}>
                  <Link
                    href={routes.learner.mission(quiz.courseSlug, item.missionId)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-surface px-4 py-3 text-sm font-bold text-ink-800 hover:border-primary-200 focus-visible:outline-3 focus-visible:outline-primary-500"
                  >
                    <span>
                      <span className="block text-xs font-extrabold text-ink-600 uppercase">{item.concept}</span>
                      Revoir « {item.title} »
                    </span>
                    <span aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <aside className="flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-ink-100 bg-surface p-5 text-center lg:sticky lg:top-20">
        <AttemptStatusBadge status={attempt.status} />
        {attempt.passed ? (
          <>
            <h3 className="m-0 text-lg font-black text-ink-900">Bien joué !</h3>
            <p className="m-0 text-sm font-semibold text-ink-600">
              {summative ? "Tu as validé le projet." : "Tu as validé le niveau."}
              {attempt.badge && !history && " Un nouveau badge t'attend."}
            </p>
            {attempt.pointsEarned > 0 && <Badge tone="amber">+{attempt.pointsEarned} points</Badge>}
            <div className="flex w-full flex-col gap-2">
              {attempt.badge && !history && (
                <Button href={badgeHref(attempt)} variant="secondary" block>
                  Voir mon badge
                </Button>
              )}
              <Button href={review.href} variant="outline" block>
                {review.label}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="m-0 text-lg font-black text-ink-900">Pas encore validé</h3>
            <p className="m-0 text-sm font-semibold text-ink-600">
              Il faut au moins {attempt.threshold} %. Revois les concepts ci-contre, puis réessaie.
            </p>
            <div className="flex w-full flex-col gap-2">
              {attempt.retryInSec > 0 ? (
                <RetryCountdown seconds={attempt.retryInSec} href={retryHref} />
              ) : (
                <Button href={retryHref} block icon="arrow-right">
                  Réessayer le quiz
                </Button>
              )}
              <Button href={review.href} variant="outline" block>
                {review.label}
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** WJ05 / WJ08 · Tentative relue par son identifiant (`learning/attempts/{id}/`). */
export async function QuizResult({ slug, attemptId }: { slug: string; attemptId: number }) {
  const api = await getServerApi();
  const content = readContent(await api.GET("/api/learning/attempts/{id}/", { params: { path: { id: attemptId } } }));
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const attempt = content.data;
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.learner.courses },
          { label: "Mon parcours", href: routes.learner.course(attempt.quiz.courseSlug) },
          { label: `Résultats · ${attempt.quiz.title}` },
        ]}
      />
      <AttemptSummary attempt={attempt} />
    </div>
  );
}
