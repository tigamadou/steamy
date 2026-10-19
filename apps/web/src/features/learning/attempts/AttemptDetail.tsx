import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { readContent } from "../content";
import { AttemptSummary } from "../quiz/QuizResult";

// WD08 · Détail d'une tentative de l'historique : même résumé que WJ05/WJ08, avec « Voir le parcours ».
export async function AttemptDetail({ attemptId }: { attemptId: number }) {
  const api = await getServerApi();
  const content = readContent(await api.GET("/api/learning/attempts/{id}/", { params: { path: { id: attemptId } } }));
  // Une tentative appartient toujours à l'apprenant : un refus vaut une tentative inconnue
  if (!content.ok) notFound();
  const attempt = content.data;
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Mes quiz", href: routes.learner.attempts }, { label: attempt.quiz.title }]} />
      <AttemptSummary attempt={attempt} history />
    </div>
  );
}
