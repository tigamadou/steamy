import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { RetryCountdown } from "@/components/ds/RetryCountdown";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { readContent } from "../content";
import { position } from "../format";
import { LockedContentState } from "../LockedContentState";
import { QuizRunner } from "./QuizRunner";

// WJ04 (formative) / WJ10 (sommative) · Seuil, type et délai lus dans l'API ; aucune bonne réponse servie avant l'envoi.
export async function QuizView({ slug, quizId }: { slug: string; quizId: number }) {
  const api = await getServerApi();
  const content = readContent(await api.GET("/api/learning/quizzes/{id}/", { params: { path: { id: quizId } } }));
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const quiz = content.data;
  const summative = quiz.kind === "summative";
  const { course, project, level } = quiz;
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-4.5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.learner.courses },
          { label: course.title, href: routes.learner.course(course.slug) },
          { label: `Projet ${position(project)}`, href: routes.learner.project(course.slug, project.id) },
          ...(level ? [{ label: `Niveau ${position(level)}`, href: routes.learner.level(course.slug, level.id) }] : []),
          { label: summative ? "Évaluation du projet" : "Quiz du niveau" },
        ]}
      />
      <section
        aria-labelledby="quiz-titre"
        className="flex items-center gap-3 rounded-2xl border-2 border-primary-100 bg-primary-50 px-4.5 py-3.5"
      >
        <span aria-hidden className="text-2xl">
          {summative ? "🏁" : "📝"}
        </span>
        <div className="flex-1">
          <h2 id="quiz-titre" className="m-0 text-[15px] font-black text-ink-900">
            {quiz.title}
          </h2>
          <p className="m-0 text-[13px] font-bold text-ink-600">
            Obtiens au moins {quiz.threshold} % pour valider {summative ? "le projet" : "le niveau"} et gagner ton badge.
            {quiz.timeLimitSec ? ` Durée conseillée : ${Math.ceil(quiz.timeLimitSec / 60)} min.` : ""}
          </p>
        </div>
      </section>
      {quiz.state === "done" && (
        <p className="m-0 text-sm font-bold text-success-700">Tu as déjà réussi ce quiz : tu peux le refaire pour t&apos;entraîner.</p>
      )}
      {quiz.retryInSec > 0 ? (
        <section aria-labelledby="quiz-delai" className="flex flex-col gap-3 rounded-[22px] border-2 border-amber-300 bg-amber-50 p-5">
          <h3 id="quiz-delai" className="m-0 text-lg font-black text-ink-900">
            Encore un peu de patience
          </h3>
          <p className="m-0 text-sm font-semibold text-ink-700">
            Tu pourras repasser cette évaluation à la fin du délai. Profite-en pour revoir les missions du projet.
          </p>
          <RetryCountdown seconds={quiz.retryInSec} href={routes.learner.quiz(course.slug, quiz.id)} />
        </section>
      ) : (
        <QuizRunner quizId={quiz.id} courseSlug={course.slug} questions={quiz.questions} />
      )}
    </div>
  );
}
