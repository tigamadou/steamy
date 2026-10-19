import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { QuizResult } from "@/features/learning/quiz/QuizResult";

export const metadata: Metadata = { title: "Résultats du quiz" };

// WJ05 / WJ08 · Résultat d'une tentative.
export default async function QuizResultPage({
  params,
}: PageProps<"/apprenant/parcours/[slug]/quiz/[quizId]/resultats/[attemptId]">) {
  const { slug, attemptId } = await params;
  const id = Number(attemptId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <QuizResult slug={slug} attemptId={id} />
    </Suspense>
  );
}
